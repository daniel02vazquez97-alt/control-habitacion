import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EstadoHabitacion,
  OrigenBitacora,
  Habitacion,
  BitacoraEstado,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { DireccionMensaje, EstadoMensajeIntegracion, EstadoReservacion, InterfaceIntegracion } from '@prisma/client';
import { EdoHabitacionDto, TipoMovimiento } from './dto/edo-habitacion.dto';

/** Fecha a medianoche UTC (así se guardan las columnas DATE). */
export function aFechaUTC(valor: string): Date {
  const d = new Date(valor);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Capacidad de personas por tipo de habitación (dato de la interface 15). */
export const CAPACIDAD_POR_TIPO: Record<string, number> = { SENCILLA: 2, DOBLE: 4, SUITE: 4 };
import {
  EstadoHabitacionInterno,
  esTransicionValida,
  obtenerEstadoExterno,
} from '@control-habitacion/shared';

export interface EventoEstadoCambiado {
  habitacionId: string;
  noHabitacion: string;
  tipo: string;
  estadoAnterior: EstadoHabitacion;
  estadoNuevo: EstadoHabitacion;
  origen: OrigenBitacora;
  usuarioId?: string | null;
  nota?: string | null;
  fechaHora: Date;
}

@Injectable()
export class Sch2InventarioService {
  private readonly logger = new Logger(Sch2InventarioService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async consultarTodas(piso?: number, estado?: EstadoHabitacion): Promise<Habitacion[]> {
    const where: any = {};
    // El ValidationPipe convierte un ?piso ausente en NaN: solo se filtra si es un número válido.
    if (piso !== undefined && piso !== null && !Number.isNaN(Number(piso))) where.piso = Number(piso);
    if (estado) where.estado = estado;

    return this.prisma.habitacion.findMany({
      where,
      orderBy: [{ piso: 'asc' }, { noHabitacion: 'asc' }],
    });
  }

  async consultarPorId(id: string) {
    const habitacion = await this.prisma.habitacion.findUnique({
      where: { id },
      include: {
        bitacoras: {
          orderBy: { fechaHora: 'desc' },
          take: 20,
          include: {
            usuario: {
              select: { id: true, nombre: true, rol: true },
            },
          },
        },
        asignaciones: {
          where: { terminadaEn: null },
          orderBy: { creadaEn: 'desc' },
          take: 1,
          include: {
            camarista: { select: { id: true, nombre: true } },
            auxiliar: { select: { id: true, nombre: true } },
          },
        },
        reservaciones: {
          where: {
            estado: { in: [EstadoReservacion.CONFIRMADA, EstadoReservacion.EN_CURSO] },
            fechaSalida: { gte: aFechaUTC(new Date().toISOString()) },
          },
          orderBy: { fechaEntrada: 'asc' },
        },
        inspecciones: {
          orderBy: { fechaHora: 'desc' },
          take: 1,
          include: {
            supervisor: { select: { id: true, nombre: true } },
            reparaciones: true,
          },
        },
      },
    });

    if (!habitacion) {
      throw new NotFoundException({
        codigo: 'HABITACION_NO_ENCONTRADA',
        mensaje: `No se encontró la habitación con ID ${id}.`,
      });
    }

    return habitacion;
  }

  /**
   * Interface 15 DispHabitaciones.
   * Sin fechas: estatus en este momento. Con fechaEntrada y fechaSalida: estatus para esa estancia
   * (BLOQUEADA si está bloqueada; OCUPADA si ya tiene una reservación que se traslapa o si la estancia
   * empieza hoy y la habitación está ocupada; DISPONIBLE en otro caso).
   */
  async consultarDisponibilidad(estatus?: string, tipo?: string, fechaEntrada?: string, fechaSalida?: string) {
    const where: any = {};
    if (tipo) where.tipo = tipo.toUpperCase();
    const porFechas = !!(fechaEntrada && fechaSalida);
    let entrada: Date | undefined;
    let salida: Date | undefined;
    if (porFechas) {
      entrada = aFechaUTC(fechaEntrada!);
      salida = aFechaUTC(fechaSalida!);
      if (isNaN(+entrada) || isNaN(+salida) || salida <= entrada) {
        throw new BadRequestException({
          codigo: 'FECHAS_INVALIDAS',
          mensaje: 'Envía fechaEntrada y fechaSalida como AAAA-MM-DD, con la salida posterior a la entrada.',
        });
      }
    }
    const habitaciones = await this.prisma.habitacion.findMany({
      where,
      orderBy: { noHabitacion: 'asc' },
      include: porFechas
        ? {
            reservaciones: {
              where: {
                estado: { in: [EstadoReservacion.CONFIRMADA, EstadoReservacion.EN_CURSO] },
                fechaEntrada: { lt: salida },
                fechaSalida: { gt: entrada },
              },
              select: { id: true },
            },
          }
        : undefined,
    });
    const hoy = aFechaUTC(new Date().toISOString());
    const lista = habitaciones.map((h: any) => {
      let est = obtenerEstadoExterno(h.estado as unknown as EstadoHabitacionInterno) as string;
      if (porFechas) {
        if (h.estado === EstadoHabitacion.BLOQUEADA) est = 'BLOQUEADA';
        else if (h.reservaciones.length > 0) est = 'OCUPADA';
        else if (entrada! <= hoy && h.estado === EstadoHabitacion.OCUPADA) est = 'OCUPADA';
        else est = 'DISPONIBLE';
      }
      return {
        noHabitacion: h.noHabitacion,
        tipoHabitacion: h.tipo,
        capacidadPersonas: CAPACIDAD_POR_TIPO[h.tipo] ?? null,
        estatus: est,
      };
    });
    return {
      fechaHora: new Date().toISOString(),
      ...(porFechas ? { fechaEntrada: fechaEntrada!.slice(0, 10), fechaSalida: fechaSalida!.slice(0, 10) } : {}),
      habitaciones: estatus ? lista.filter((h) => h.estatus === estatus.toUpperCase()) : lista,
    };
  }

  /** Interface 14 EdoHabitacion: CHECKIN -> OCUPADA, CHECKOUT -> VACANTE_SUCIA. */
  async procesarEdoHabitacion(noHabitacion: string, dto: EdoHabitacionDto) {
    const idMensaje = dto.idMensaje || randomUUID();
    if (dto.idMensaje) {
      const previo = await this.prisma.mensajeIntegracion.findUnique({ where: { idMensaje } });
      if (previo) {
        const h = await this.consultarPorNumero(noHabitacion);
        return {
          noHabitacion, tipoMovimiento: dto.tipoMovimiento, estadoNuevo: h.estado,
          estatus: obtenerEstadoExterno(h.estado as unknown as EstadoHabitacionInterno),
          acuse: { idMensaje, recibido: previo.fechaHora.toISOString() },
        };
      }
    }
    const habitacion = await this.consultarPorNumero(noHabitacion);
    const checkIn = dto.tipoMovimiento === TipoMovimiento.CHECKIN;
    const nuevo = checkIn ? EstadoHabitacion.OCUPADA : EstadoHabitacion.VACANTE_SUCIA;
    const { habitacion: h } = await this.cambiarEstado(
      habitacion.id, nuevo, OrigenBitacora.RECEPCION, null,
      `EdoHabitacion ${dto.tipoMovimiento} recibido de Recepción. Folio ${dto.folioReserva} (${dto.fechaEntrada} a ${dto.fechaSalida}).`,
    );
    // Si el folio corresponde a una reservación de esta habitación, se actualiza su estado.
    await this.prisma.reservacion.updateMany({
      where: {
        folioReserva: dto.folioReserva,
        habitacionId: habitacion.id,
        estado: checkIn ? EstadoReservacion.CONFIRMADA : { in: [EstadoReservacion.CONFIRMADA, EstadoReservacion.EN_CURSO] },
      },
      data: { estado: checkIn ? EstadoReservacion.EN_CURSO : EstadoReservacion.FINALIZADA },
    });
    const msg = await this.prisma.mensajeIntegracion.create({
      data: {
        idMensaje,
        direccion: DireccionMensaje.ENTRANTE,
        interface: checkIn ? InterfaceIntegracion.REC_HOSP_2 : InterfaceIntegracion.REC_HOSP_1,
        payload: { noHabitacion, ...dto } as any,
        estado: EstadoMensajeIntegracion.PROCESADO,
        intentos: 1,
      },
    });
    return {
      noHabitacion,
      tipoMovimiento: dto.tipoMovimiento,
      estadoAnterior: habitacion.estado,
      estadoNuevo: h.estado,
      estatus: obtenerEstadoExterno(h.estado as unknown as EstadoHabitacionInterno),
      acuse: { idMensaje, recibido: msg.fechaHora.toISOString() },
    };
  }

  async consultarPorNumero(noHabitacion: string): Promise<Habitacion> {
    const habitacion = await this.prisma.habitacion.findUnique({
      where: { noHabitacion },
    });

    if (!habitacion) {
      throw new NotFoundException({
        codigo: 'HABITACION_NO_ENCONTRADA',
        mensaje: `No se encontró la habitación número ${noHabitacion}.`,
      });
    }

    return habitacion;
  }

  async cambiarEstado(
    habitacionId: string,
    nuevoEstado: EstadoHabitacion,
    origen: OrigenBitacora,
    usuarioId?: string | null,
    nota?: string | null,
  ): Promise<{ habitacion: Habitacion; bitacora: BitacoraEstado }> {
    const habitacion = await this.consultarPorId(habitacionId);
    const estadoActual = habitacion.estado;

    // Validación formal de máquina de estados
    const esValida = esTransicionValida(
      estadoActual as unknown as EstadoHabitacionInterno,
      nuevoEstado as unknown as EstadoHabitacionInterno,
    );

    if (!esValida) {
      const msg = `Transición de estado no permitida: de '${estadoActual}' hacia '${nuevoEstado}'.`;
      this.logger.warn(`Intento de transición inválida: Habitación ${habitacion.noHabitacion} ${msg}`);
      throw new ConflictException({
        codigo: 'TRANSICION_ESTADO_INVALIDA',
        mensaje: msg,
        detalles: {
          habitacion: habitacion.noHabitacion,
          estadoActual,
          estadoSolicitado: nuevoEstado,
        },
      });
    }

    // Ejecución transaccional atómica
    const resultado = await this.prisma.$transaction(async (tx) => {
      const habitacionActualizada = await tx.habitacion.update({
        where: { id: habitacionId },
        data: { estado: nuevoEstado },
      });

      const bitacora = await tx.bitacoraEstado.create({
        data: {
          habitacionId,
          estadoAnterior: estadoActual,
          estadoNuevo: nuevoEstado,
          origen,
          usuarioId: usuarioId || null,
          nota: nota || null,
        },
      });

      return { habitacion: habitacionActualizada, bitacora };
    });

    this.logger.log(
      `Estado actualizado: Habitación ${habitacion.noHabitacion} pasó de ${estadoActual} a ${nuevoEstado} [Origen: ${origen}]`,
    );

    // Emitir evento en el bus interno
    const evento: EventoEstadoCambiado = {
      habitacionId,
      noHabitacion: habitacion.noHabitacion,
      tipo: habitacion.tipo,
      estadoAnterior: estadoActual,
      estadoNuevo: nuevoEstado,
      origen,
      usuarioId,
      nota,
      fechaHora: resultado.bitacora.fechaHora,
    };

    this.eventEmitter.emit('habitacion.estadoCambiado', evento);

    return resultado;
  }

  async obtenerContadoresPorEstado() {
    const habitaciones = await this.prisma.habitacion.findMany({
      select: { estado: true },
    });

    const contadores: Record<string, number> = {
      [EstadoHabitacion.VACANTE_SUCIA]: 0,
      [EstadoHabitacion.VACANTE_LIMPIA]: 0,
      [EstadoHabitacion.VACANTE_INSPECCIONADA]: 0,
      [EstadoHabitacion.BLOQUEADA]: 0,
      [EstadoHabitacion.OCUPADA]: 0,
    };

    habitaciones.forEach((h) => {
      contadores[h.estado] = (contadores[h.estado] || 0) + 1;
    });

    return {
      total: habitaciones.length,
      porEstado: contadores,
    };
  }
}
