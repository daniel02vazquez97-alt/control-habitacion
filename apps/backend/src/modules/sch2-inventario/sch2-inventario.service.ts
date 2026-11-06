import {
  Injectable,
  NotFoundException,
  ConflictException,
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
    if (piso !== undefined) where.piso = Number(piso);
    if (estado !== undefined) where.estado = estado;

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
