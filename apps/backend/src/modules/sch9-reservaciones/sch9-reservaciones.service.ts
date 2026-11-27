import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DireccionMensaje,
  EstadoMensajeIntegracion,
  EstadoReservacion,
  InterfaceIntegracion,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Sch2InventarioService } from '../sch2-inventario/sch2-inventario.service';
import { CrearReservacionDto } from './dto/crear-reservacion.dto';

/** Reservaciones que ocupan la habitación (las canceladas y finalizadas ya no cuentan). */
export const ESTADOS_RESERVACION_VIGENTE: EstadoReservacion[] = [
  EstadoReservacion.CONFIRMADA,
  EstadoReservacion.EN_CURSO,
];

/** Convierte 'AAAA-MM-DD' (o ISO) a la fecha a medianoche UTC, como la guarda la columna DATE. */
export function aFecha(valor: string): Date {
  const d = new Date(valor);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const formato = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class Sch9ReservacionesService {
  constructor(
    private prisma: PrismaService,
    private inventarioService: Sch2InventarioService,
  ) {}

  private vista(r: any) {
    return {
      folioReserva: r.folioReserva,
      noHabitacion: r.habitacion?.noHabitacion,
      fechaEntrada: formato(r.fechaEntrada),
      fechaSalida: formato(r.fechaSalida),
      huesped: r.huesped,
      numeroPersonas: r.numeroPersonas,
      estado: r.estado,
      creadaEn: r.creadaEn,
    };
  }

  async crear(dto: CrearReservacionDto) {
    const entrada = aFecha(dto.fechaEntrada);
    const salida = aFecha(dto.fechaSalida);
    if (salida <= entrada) {
      throw new BadRequestException({
        codigo: 'FECHAS_INVALIDAS',
        mensaje: 'La fecha de salida debe ser posterior a la fecha de entrada.',
      });
    }

    // Idempotencia: el mismo folio con los mismos datos devuelve la reservación existente.
    const previa = await this.prisma.reservacion.findUnique({
      where: { folioReserva: dto.folioReserva },
      include: { habitacion: true },
    });
    if (previa) {
      const igual =
        previa.habitacion.noHabitacion === dto.noHabitacion &&
        +previa.fechaEntrada === +entrada &&
        +previa.fechaSalida === +salida;
      if (igual) return { ...this.vista(previa), duplicada: true };
      throw new ConflictException({
        codigo: 'FOLIO_DUPLICADO',
        mensaje: `El folio ${dto.folioReserva} ya existe con otra habitación o fechas.`,
      });
    }

    const habitacion = await this.inventarioService.consultarPorNumero(dto.noHabitacion);

    // Una habitación no puede tener dos reservaciones vigentes que se traslapen.
    // El día de salida de una puede ser el día de entrada de la siguiente.
    const choque = await this.prisma.reservacion.findFirst({
      where: {
        habitacionId: habitacion.id,
        estado: { in: ESTADOS_RESERVACION_VIGENTE },
        fechaEntrada: { lt: salida },
        fechaSalida: { gt: entrada },
      },
    });
    if (choque) {
      throw new ConflictException({
        codigo: 'HABITACION_YA_RESERVADA',
        mensaje: `La habitación ${dto.noHabitacion} ya está reservada del ${formato(choque.fechaEntrada)} al ${formato(choque.fechaSalida)} (folio ${choque.folioReserva}).`,
      });
    }

    try {
      const creada = await this.prisma.reservacion.create({
        data: {
          folioReserva: dto.folioReserva,
          habitacionId: habitacion.id,
          fechaEntrada: entrada,
          fechaSalida: salida,
          huesped: dto.huesped,
          numeroPersonas: dto.numeroPersonas,
        },
        include: { habitacion: true },
      });
      await this.prisma.mensajeIntegracion.create({
        data: {
          idMensaje: randomUUID(),
          direccion: DireccionMensaje.ENTRANTE,
          interface: InterfaceIntegracion.RES_HOSP_1,
          payload: dto as any,
          estado: EstadoMensajeIntegracion.PROCESADO,
          intentos: 1,
        },
      });
      return this.vista(creada);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ codigo: 'FOLIO_DUPLICADO', mensaje: `El folio ${dto.folioReserva} ya existe.` });
      }
      throw e;
    }
  }

  async cancelar(folioReserva: string) {
    const r = await this.prisma.reservacion.findUnique({ where: { folioReserva } });
    if (!r) {
      throw new NotFoundException({ codigo: 'RESERVACION_NO_ENCONTRADA', mensaje: `No existe la reservación ${folioReserva}.` });
    }
    if (r.estado !== EstadoReservacion.CONFIRMADA) {
      throw new ConflictException({
        codigo: 'RESERVACION_NO_CANCELABLE',
        mensaje: `Solo se puede cancelar una reservación CONFIRMADA. Estado actual: ${r.estado}.`,
      });
    }
    const actualizada = await this.prisma.reservacion.update({
      where: { folioReserva },
      data: { estado: EstadoReservacion.CANCELADA },
      include: { habitacion: true },
    });
    return this.vista(actualizada);
  }

  async consultar(folioReserva: string) {
    const r = await this.prisma.reservacion.findUnique({ where: { folioReserva }, include: { habitacion: true } });
    if (!r) {
      throw new NotFoundException({ codigo: 'RESERVACION_NO_ENCONTRADA', mensaje: `No existe la reservación ${folioReserva}.` });
    }
    return this.vista(r);
  }

  /** Lista reservaciones; con desde/hasta devuelve las que se traslapan con ese rango. */
  async listar(filtros: { noHabitacion?: string; desde?: string; hasta?: string; estado?: EstadoReservacion }) {
    const where: Prisma.ReservacionWhereInput = {};
    if (filtros.noHabitacion) where.habitacion = { noHabitacion: filtros.noHabitacion };
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.desde) where.fechaSalida = { gt: aFecha(filtros.desde) };
    if (filtros.hasta) where.fechaEntrada = { lt: aFecha(filtros.hasta) };
    const lista = await this.prisma.reservacion.findMany({
      where,
      include: { habitacion: true },
      orderBy: [{ fechaEntrada: 'asc' }],
    });
    return lista.map((r) => this.vista(r));
  }
}
