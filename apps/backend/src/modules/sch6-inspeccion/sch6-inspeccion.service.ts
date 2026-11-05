import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EstadoHabitacion,
  ResultadoInspeccion,
  OrigenBitacora,
  TipoLimpieza,
  Inspeccion,
  Reparacion,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Sch2InventarioService } from '../sch2-inventario/sch2-inventario.service';
import { RegistrarInspeccionDto } from './dto/registrar-inspeccion.dto';
import { ConfirmarReparacionDto } from './dto/confirmar-reparacion.dto';

@Injectable()
export class Sch6InspeccionService {
  private readonly logger = new Logger(Sch6InspeccionService.name);

  constructor(
    private prisma: PrismaService,
    private inventarioService: Sch2InventarioService,
    private eventEmitter: EventEmitter2,
  ) {}

  async registrarInspeccion(dto: RegistrarInspeccionDto, supervisorId: string): Promise<Inspeccion> {
    const habitacion = await this.prisma.habitacion.findUnique({
      where: { id: dto.habitacionId },
    });

    if (!habitacion) {
      throw new NotFoundException({
        codigo: 'HABITACION_NO_ENCONTRADA',
        mensaje: 'La habitación especificada no existe.',
      });
    }

    // Regla 5: Toda habitación VACANTE_LIMPIA se inspecciona antes de liberarse
    if (habitacion.estado !== EstadoHabitacion.VACANTE_LIMPIA) {
      throw new BadRequestException({
        codigo: 'ESTADO_INVALIDO_PARA_INSPECCION',
        mensaje: `Solo se pueden inspeccionar habitaciones en estado 'VACANTE_LIMPIA'. El estado actual es '${habitacion.estado}'.`,
      });
    }

    if (!dto.puntos || dto.puntos.length !== 8) {
      throw new BadRequestException({
        codigo: 'LISTA_CHEQUEO_INCOMPLETA',
        mensaje: 'La lista de chequeo FR08-02 debe contener exactamente los 8 puntos reglamentarios.',
      });
    }

    const todosPuntosCumplen = dto.puntos.every((p) => p.cumple === true);
    let resultado: ResultadoInspeccion;
    let nuevoEstado: EstadoHabitacion;

    if (dto.hayDanio) {
      resultado = ResultadoInspeccion.DANIO;
      nuevoEstado = EstadoHabitacion.BLOQUEADA;
    } else if (!todosPuntosCumplen) {
      resultado = ResultadoInspeccion.NO_CUMPLE;
      nuevoEstado = EstadoHabitacion.VACANTE_LIMPIA;
    } else {
      resultado = ResultadoInspeccion.APROBADA;
      nuevoEstado = EstadoHabitacion.VACANTE_INSPECCIONADA;
    }

    // Guardar la inspección
    const inspeccion = await this.prisma.inspeccion.create({
      data: {
        habitacionId: dto.habitacionId,
        supervisorId,
        puntos: dto.puntos as any,
        hayDanio: dto.hayDanio,
        descripcionDanio: dto.descripcionDanio || null,
        cumpleEstandar: todosPuntosCumplen && !dto.hayDanio,
        resultado,
      },
      include: {
        habitacion: true,
        supervisor: { select: { id: true, nombre: true } },
      },
    });

    // Bifurcación 1: Daño detectado -> Bloquear habitación y generar Reparación
    if (dto.hayDanio) {
      await this.prisma.reparacion.create({
        data: {
          habitacionId: dto.habitacionId,
          inspeccionId: inspeccion.id,
          descripcion: dto.descripcionDanio || 'Daños registrados durante inspección de salida.',
        },
      });

      await this.inventarioService.cambiarEstado(
        dto.habitacionId,
        EstadoHabitacion.BLOQUEADA,
        OrigenBitacora.USUARIO,
        supervisorId,
        `Habitación bloqueada por daños: ${dto.descripcionDanio || 'Sin descripción'}`,
      );
    }
    // Bifurcación 2: No cumple estándar -> Crear tarea de corrección para camarista
    else if (!todosPuntosCumplen) {
      const puntosFallidos = dto.puntos
        .filter((p) => !p.cumple)
        .map((p) => `${p.numero}. ${p.descripcion}: ${p.observacion || 'No conforme'}`)
        .join('; ');

      // Buscar la última asignación de esta habitación para reutilizar el personal
      const ultimaAsignacion = await this.prisma.asignacionLimpieza.findFirst({
        where: { habitacionId: dto.habitacionId },
        orderBy: { creadaEn: 'desc' },
      });

      if (ultimaAsignacion) {
        await this.prisma.asignacionLimpieza.create({
          data: {
            habitacionId: dto.habitacionId,
            camaristaId: ultimaAsignacion.camaristaId,
            auxiliarId: ultimaAsignacion.auxiliarId,
            tipo: TipoLimpieza.CORRECCION,
            detallesCorreccion: `Detalles a corregir: ${puntosFallidos}`,
            limpiezaTerminada: false,
            reposicionTerminada: true,
          },
        });
      }

      await this.inventarioService.cambiarEstado(
        dto.habitacionId,
        EstadoHabitacion.VACANTE_LIMPIA,
        OrigenBitacora.USUARIO,
        supervisorId,
        `Inspección no aprobada. Tarea de corrección asignada: ${puntosFallidos}`,
      );
    }
    // Bifurcación 3: Aprobada -> Liberar a VACANTE_INSPECCIONADA
    else {
      await this.inventarioService.cambiarEstado(
        dto.habitacionId,
        EstadoHabitacion.VACANTE_INSPECCIONADA,
        OrigenBitacora.USUARIO,
        supervisorId,
        'Inspección FR08-02 aprobada satisfactoriamente (8/8 puntos conformes).',
      );
    }

    this.eventEmitter.emit('inspeccion.resultado', {
      inspeccionId: inspeccion.id,
      habitacionId: dto.habitacionId,
      noHabitacion: habitacion.noHabitacion,
      tipoHabitacion: habitacion.tipo,
      resultado,
      supervisorId,
      hayDanio: dto.hayDanio,
      descripcionDanio: dto.descripcionDanio,
    });

    return inspeccion;
  }

  async confirmarReparacion(
    reparacionId: string,
    supervisorId: string,
    dto?: ConfirmarReparacionDto,
  ): Promise<Reparacion> {
    const reparacion = await this.prisma.reparacion.findUnique({
      where: { id: reparacionId },
      include: { habitacion: true },
    });

    if (!reparacion) {
      throw new NotFoundException({
        codigo: 'REPARACION_NO_ENCONTRADA',
        mensaje: 'Registro de reparación no encontrado.',
      });
    }

    if (reparacion.habitacion.estado !== EstadoHabitacion.BLOQUEADA) {
      throw new BadRequestException({
        codigo: 'HABITACION_NO_BLOQUEADA',
        mensaje: `La habitación no está bloqueada. Estado actual: ${reparacion.habitacion.estado}.`,
      });
    }

    const reparacionActualizada = await this.prisma.reparacion.update({
      where: { id: reparacionId },
      data: {
        confirmadaPor: supervisorId,
        confirmadaEn: new Date(),
      },
    });

    // Regresa a VACANTE_SUCIA para reiniciar ciclo de limpieza
    await this.inventarioService.cambiarEstado(
      reparacion.habitacionId,
      EstadoHabitacion.VACANTE_SUCIA,
      OrigenBitacora.USUARIO,
      supervisorId,
      `Reparación confirmada por supervisor. ${dto?.observaciones || ''}`.trim(),
    );

    return reparacionActualizada;
  }

  async obtenerHabitacionesPorInspeccionar() {
    return this.prisma.habitacion.findMany({
      where: { estado: EstadoHabitacion.VACANTE_LIMPIA },
      include: {
        asignaciones: {
          orderBy: { creadaEn: 'desc' },
          take: 1,
          include: {
            camarista: { select: { id: true, nombre: true } },
            auxiliar: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { noHabitacion: 'asc' },
    });
  }

  async obtenerHabitacionesBloqueadas() {
    return this.prisma.habitacion.findMany({
      where: { estado: EstadoHabitacion.BLOQUEADA },
      include: {
        reparaciones: {
          where: { confirmadaEn: null },
          orderBy: { creadaEn: 'desc' },
          take: 1,
        },
        inspecciones: {
          orderBy: { fechaHora: 'desc' },
          take: 1,
          include: {
            supervisor: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { noHabitacion: 'asc' },
    });
  }
}
