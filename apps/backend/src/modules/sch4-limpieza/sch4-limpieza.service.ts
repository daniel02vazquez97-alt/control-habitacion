import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  EstadoHabitacion,
  RolEmpleado,
  TipoLimpieza,
  OrigenBitacora,
  AsignacionLimpieza,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Sch2InventarioService } from '../sch2-inventario/sch2-inventario.service';
import { Sch5PersonalService } from '../sch5-personal/sch5-personal.service';
import { CrearAsignacionDto } from './dto/crear-asignacion.dto';

@Injectable()
export class Sch4LimpiezaService {
  private readonly logger = new Logger(Sch4LimpiezaService.name);

  constructor(
    private prisma: PrismaService,
    private inventarioService: Sch2InventarioService,
    private personalService: Sch5PersonalService,
  ) {}

  async crearAsignacion(dto: CrearAsignacionDto, supervisorId?: string): Promise<AsignacionLimpieza> {
    const habitacion = await this.prisma.habitacion.findUnique({
      where: { id: dto.habitacionId },
    });

    if (!habitacion) {
      throw new NotFoundException({
        codigo: 'HABITACION_NO_ENCONTRADA',
        mensaje: 'La habitación especificada no existe.',
      });
    }

    // Regla 3: Solo se asigna limpieza a habitaciones en VACANTE_SUCIA (o CORRECCION si está en VACANTE_LIMPIA)
    const esCorreccion = dto.tipo === TipoLimpieza.CORRECCION;
    if (!esCorreccion && habitacion.estado !== EstadoHabitacion.VACANTE_SUCIA) {
      throw new BadRequestException({
        codigo: 'ESTADO_INVALIDO_PARA_ASIGNACION',
        mensaje: `Solo se puede asignar limpieza a habitaciones en estado 'VACANTE_SUCIA'. El estado actual es '${habitacion.estado}'.`,
      });
    }

    // Regla 3: Validar que el personal asignado esté activo en el turno
    const personalActivo = await this.personalService.consultarPersonalActivoEnTurno();
    const camaristaActiva = personalActivo.find(
      (p) => p.id === dto.camaristaId && p.rol === RolEmpleado.CAMARISTA,
    );
    const auxiliarActivo = personalActivo.find(
      (p) => p.id === dto.auxiliarId && p.rol === RolEmpleado.AUXILIAR,
    );

    if (!camaristaActiva) {
      throw new BadRequestException({
        codigo: 'CAMARISTA_NO_DISPONIBLE',
        mensaje: 'La camarista seleccionada no se encuentra activa en el turno en curso.',
      });
    }

    if (!auxiliarActivo) {
      throw new BadRequestException({
        codigo: 'AUXILIAR_NO_DISPONIBLE',
        mensaje: 'El auxiliar seleccionado no se encuentra activo en el turno en curso.',
      });
    }

    const asignacion = await this.prisma.asignacionLimpieza.create({
      data: {
        habitacionId: dto.habitacionId,
        camaristaId: dto.camaristaId,
        auxiliarId: dto.auxiliarId,
        tipo: dto.tipo || TipoLimpieza.SALIDA,
        detallesCorreccion: dto.detallesCorreccion || null,
      },
      include: {
        habitacion: true,
        camarista: { select: { id: true, nombre: true } },
        auxiliar: { select: { id: true, nombre: true } },
      },
    });

    this.logger.log(
      `Asignación creada: Habitación ${habitacion.noHabitacion} -> Camarista: ${camaristaActiva.nombre}, Auxiliar: ${auxiliarActivo.nombre}`,
    );

    return asignacion;
  }

  async marcarLimpiezaTerminada(asignacionId: string, usuarioId: string, completada: boolean) {
    const asignacion = await this.prisma.asignacionLimpieza.findUnique({
      where: { id: asignacionId },
      include: { habitacion: true },
    });

    if (!asignacion) {
      throw new NotFoundException({
        codigo: 'ASIGNACION_NO_ENCONTRADA',
        mensaje: 'Asignación de limpieza no encontrada.',
      });
    }

    if (asignacion.camaristaId !== usuarioId) {
      throw new ForbiddenException({
        codigo: 'USUARIO_NO_AUTORIZADO',
        mensaje: 'Solo la camarista asignada puede marcar la limpieza como terminada.',
      });
    }

    return this.prisma.asignacionLimpieza.update({
      where: { id: asignacionId },
      data: { limpiezaTerminada: completada },
      include: { habitacion: true, camarista: true, auxiliar: true },
    });
  }

  async marcarReposicionTerminada(asignacionId: string, usuarioId: string, completada: boolean) {
    const asignacion = await this.prisma.asignacionLimpieza.findUnique({
      where: { id: asignacionId },
      include: { habitacion: true },
    });

    if (!asignacion) {
      throw new NotFoundException({
        codigo: 'ASIGNACION_NO_ENCONTRADA',
        mensaje: 'Asignación de reposición no encontrada.',
      });
    }

    if (asignacion.auxiliarId !== usuarioId) {
      throw new ForbiddenException({
        codigo: 'USUARIO_NO_AUTORIZADO',
        mensaje: 'Solo el auxiliar asignado puede marcar la reposición como terminada.',
      });
    }

    return this.prisma.asignacionLimpieza.update({
      where: { id: asignacionId },
      data: { reposicionTerminada: completada },
      include: { habitacion: true, camarista: true, auxiliar: true },
    });
  }

  async reportarHabitacionLimpia(asignacionId: string, camaristaId: string) {
    const asignacion = await this.prisma.asignacionLimpieza.findUnique({
      where: { id: asignacionId },
      include: { habitacion: true },
    });

    if (!asignacion) {
      throw new NotFoundException({
        codigo: 'ASIGNACION_NO_ENCONTRADA',
        mensaje: 'Asignación de limpieza no encontrada.',
      });
    }

    if (asignacion.camaristaId !== camaristaId) {
      throw new ForbiddenException({
        codigo: 'USUARIO_NO_AUTORIZADO',
        mensaje: 'Solo la camarista asignada puede reportar la habitación limpia.',
      });
    }

    // Regla 4: La habitación pasa a VACANTE_LIMPIA solo cuando la limpieza Y la reposición están terminadas
    if (!asignacion.limpiezaTerminada || !asignacion.reposicionTerminada) {
      throw new BadRequestException({
        codigo: 'TAREAS_PENDIENTES',
        mensaje: 'No se puede reportar limpia: tanto la limpieza física como la reposición de suministros deben estar concluidas.',
      });
    }

    // Si la habitación estaba en VACANTE_SUCIA, actualizar a VACANTE_LIMPIA
    if (asignacion.habitacion.estado === EstadoHabitacion.VACANTE_SUCIA) {
      await this.inventarioService.cambiarEstado(
        asignacion.habitacionId,
        EstadoHabitacion.VACANTE_LIMPIA,
        OrigenBitacora.USUARIO,
        camaristaId,
        'Limpieza física y reposición de blancos terminadas por el personal operativo.',
      );
    }

    // Marcar asignación como concluida
    return this.prisma.asignacionLimpieza.update({
      where: { id: asignacionId },
      data: { terminadaEn: new Date() },
      include: { habitacion: true, camarista: true, auxiliar: true },
    });
  }

  async obtenerMisTareas(usuarioId: string, rol: RolEmpleado) {
    const where: any = { terminadaEn: null };

    if (rol === RolEmpleado.CAMARISTA) {
      where.camaristaId = usuarioId;
    } else if (rol === RolEmpleado.AUXILIAR) {
      where.auxiliarId = usuarioId;
    }

    return this.prisma.asignacionLimpieza.findMany({
      where,
      include: {
        habitacion: true,
        camarista: { select: { id: true, nombre: true } },
        auxiliar: { select: { id: true, nombre: true } },
      },
      orderBy: { creadaEn: 'asc' },
    });
  }

  async listarAsignacionesPendientes() {
    return this.prisma.asignacionLimpieza.findMany({
      where: { terminadaEn: null },
      include: {
        habitacion: true,
        camarista: { select: { id: true, nombre: true } },
        auxiliar: { select: { id: true, nombre: true } },
      },
      orderBy: { creadaEn: 'desc' },
    });
  }
}
