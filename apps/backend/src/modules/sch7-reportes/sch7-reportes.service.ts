import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EstadoExterno,
  TipoReporte,
  ReporteEstado,
  EstadoHabitacion,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Sch8DocumentosService } from '../sch8-documentos/sch8-documentos.service';
import { EventoEstadoCambiado } from '../sch2-inventario/sch2-inventario.service';
import {
  EstadoHabitacionInterno,
  obtenerEstadoExterno,
} from '@hospedaje/shared';

@Injectable()
export class Sch7ReportesService {
  private readonly logger = new Logger(Sch7ReportesService.name);

  constructor(
    private prisma: PrismaService,
    private documentosService: Sch8DocumentosService,
  ) {}

  async generarConsecutivoReporte(anio: number): Promise<{ noReporte: string; consecutivo: number }> {
    const ultimoReporte = await this.prisma.reporteEstado.findFirst({
      where: { anio },
      orderBy: { consecutivo: 'desc' },
    });

    const siguiente = (ultimoReporte?.consecutivo || 0) + 1;
    const padding = String(siguiente).padStart(4, '0');
    return {
      noReporte: `FR08-03-${anio}-${padding}`,
      consecutivo: siguiente,
    };
  }

  async registrarReporte(params: {
    habitacionId?: string | null;
    noHabitacion?: string | null;
    tipoHabitacion?: string | null;
    tipo: TipoReporte;
    estadoExterno: EstadoExterno;
    observaciones?: string | null;
    supervisorId: string;
  }): Promise<ReporteEstado> {
    const ahora = new Date();
    const anio = ahora.getFullYear();

    const { noReporte, consecutivo } = await this.generarConsecutivoReporte(anio);

    const supervisor = await this.prisma.empleado.findUnique({
      where: { id: params.supervisorId },
      select: { nombre: true },
    });

    // Formatear hora local de America/Hermosillo
    const fechaStr = ahora.toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo' });
    const horaStr = ahora.toLocaleTimeString('es-MX', { timeZone: 'America/Hermosillo' });

    // Generar PDF con SCH-8
    let pdfPath: string | null = null;
    try {
      const pdf = await this.documentosService.generarPdfFR0803({
        noReporte,
        noHabitacion: params.noHabitacion,
        tipoHabitacion: params.tipoHabitacion,
        fecha: fechaStr,
        hora: horaStr,
        estadoExterno: params.estadoExterno,
        supervisorNombre: supervisor?.nombre || 'Supervisor de Guardia',
        observaciones: params.observaciones,
      });
      pdfPath = pdf.filePath;
    } catch (e) {
      this.logger.error(`Error generando PDF para reporte ${noReporte}:`, e);
    }

    const reporte = await this.prisma.reporteEstado.create({
      data: {
        noReporte,
        anio,
        consecutivo,
        habitacionId: params.habitacionId || null,
        tipo: params.tipo,
        estadoExterno: params.estadoExterno,
        observaciones: params.observaciones || null,
        supervisorId: params.supervisorId,
        fechaHora: ahora,
        pdfPath,
      },
      include: {
        habitacion: true,
        supervisor: { select: { id: true, nombre: true } },
      },
    });

    this.logger.log(`Reporte FR08-03 creado: ${noReporte} [Estado: ${params.estadoExterno}]`);
    return reporte;
  }

  @OnEvent('habitacion.estadoCambiado')
  async handleEstadoCambiado(evento: EventoEstadoCambiado) {
    const estadoExterno = obtenerEstadoExterno(
      evento.estadoNuevo as unknown as EstadoHabitacionInterno,
    ) as unknown as EstadoExterno;

    // Solo cambios que impactan a Reservaciones: DISPONIBLE, BLOQUEADA u OCUPADA
    const estadosNotificables: EstadoHabitacion[] = [
      EstadoHabitacion.VACANTE_INSPECCIONADA, // Pasa a DISPONIBLE
      EstadoHabitacion.BLOQUEADA,             // Pasa a BLOQUEADA
      EstadoHabitacion.OCUPADA,               // Pasa a OCUPADA
    ];

    if (!estadosNotificables.includes(evento.estadoNuevo)) {
      return;
    }

    let supervisorId = evento.usuarioId;
    if (!supervisorId) {
      const sup = await this.prisma.empleado.findFirst({
        where: { rol: 'SUPERVISOR', activo: true },
      });
      supervisorId = sup?.id || (await this.prisma.empleado.findFirst())?.id || '';
    }

    await this.registrarReporte({
      habitacionId: evento.habitacionId,
      noHabitacion: evento.noHabitacion,
      tipoHabitacion: evento.tipo,
      tipo: TipoReporte.CAMBIO,
      estadoExterno,
      observaciones: evento.nota || `Cambio de estado operativo a ${evento.estadoNuevo}`,
      supervisorId: supervisorId!,
    });
  }

  async consultarHistorialReportes(filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    estadoExterno?: EstadoExterno;
    tipo?: TipoReporte;
  }) {
    const where: any = {};

    if (filtros?.fechaInicio || filtros?.fechaFin) {
      where.fechaHora = {};
      if (filtros.fechaInicio) where.fechaHora.gte = new Date(filtros.fechaInicio);
      if (filtros.fechaFin) where.fechaHora.lte = new Date(filtros.fechaFin);
    }

    if (filtros?.estadoExterno) where.estadoExterno = filtros.estadoExterno;
    if (filtros?.tipo) where.tipo = filtros.tipo;

    return this.prisma.reporteEstado.findMany({
      where,
      orderBy: { fechaHora: 'desc' },
      include: {
        habitacion: true,
        supervisor: { select: { id: true, nombre: true } },
      },
    });
  }

  async obtenerResumenOcupacion() {
    const habitaciones = await this.prisma.habitacion.findMany();
    const total = habitaciones.length;

    let ocupadas = 0;
    let disponibles = 0;
    let bloqueadas = 0;
    const conteoInterno: Record<string, number> = {};

    habitaciones.forEach((h) => {
      conteoInterno[h.estado] = (conteoInterno[h.estado] || 0) + 1;
      const ext = obtenerEstadoExterno(h.estado as unknown as EstadoHabitacionInterno);
      if (ext === 'DISPONIBLE') disponibles++;
      else if (ext === 'BLOQUEADA') bloqueadas++;
      else ocupadas++;
    });

    const porcentajeOcupacion = total > 0 ? Number(((ocupadas / total) * 100).toFixed(1)) : 0;

    return {
      totalHabitaciones: total,
      ocupadas,
      disponibles,
      bloqueadas,
      porcentajeOcupacion,
      conteoPorEstadoInterno: conteoInterno,
    };
  }
}
