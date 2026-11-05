import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { RolEmpleado } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';
import { CrearTurnoDto } from './dto/crear-turno.dto';

@Injectable()
export class Sch5PersonalService {
  constructor(private prisma: PrismaService) {}

  async listarEmpleados(rol?: RolEmpleado, activo?: boolean) {
    const where: any = {};
    if (rol !== undefined) where.rol = rol;
    if (activo !== undefined) where.activo = activo;

    return this.prisma.empleado.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async consultarPersonalActivoEnTurno(fecha?: Date) {
    const fechaConsulta = fecha ? new Date(fecha) : new Date();
    fechaConsulta.setHours(0, 0, 0, 0);

    const turno = await this.prisma.turno.findFirst({
      where: { fecha: fechaConsulta },
      include: {
        empleados: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
                activo: true,
              },
            },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    if (!turno) {
      // Si no hay turno hoy, devolver los empleados activos del sistema
      return this.prisma.empleado.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
        },
      });
    }

    return turno.empleados.map((et) => et.empleado).filter((e) => e.activo);
  }

  async crearEmpleado(dto: CrearEmpleadoDto) {
    const existente = await this.prisma.empleado.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existente) {
      throw new ConflictException({
        codigo: 'EMAIL_DUPLICADO',
        mensaje: 'Ya existe un empleado registrado con ese correo electrónico.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.empleado.create({
      data: {
        nombre: dto.nombre.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        rol: dto.rol,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    });
  }

  async crearTurno(dto: CrearTurnoDto) {
    const fecha = new Date(dto.fecha);
    fecha.setHours(0, 0, 0, 0);

    return this.prisma.turno.create({
      data: {
        fecha,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        empleados: {
          create: dto.empleadosIds.map((id) => ({
            empleadoId: id,
          })),
        },
      },
      include: {
        empleados: {
          include: {
            empleado: {
              select: { id: true, nombre: true, rol: true },
            },
          },
        },
      },
    });
  }

  async listarTurnos() {
    return this.prisma.turno.findMany({
      orderBy: { fecha: 'desc' },
      take: 30,
      include: {
        empleados: {
          include: {
            empleado: {
              select: { id: true, nombre: true, rol: true },
            },
          },
        },
      },
    });
  }
}
