import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TipoReporte, EstadoExterno } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Sch2InventarioService } from '../sch2-inventario/sch2-inventario.service';
import { Sch7ReportesService } from '../sch7-reportes/sch7-reportes.service';
import { Sch3NotificacionesService } from '../sch3-notificaciones/sch3-notificaciones.service';
import {
  EstadoHabitacionInterno,
  obtenerEstadoExterno,
} from '@control-habitacion/shared';

@Injectable()
export class Sch1TurnoService {
  private readonly logger = new Logger(Sch1TurnoService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private inventarioService: Sch2InventarioService,
    private reportesService: Sch7ReportesService,
    private notificacionesService: Sch3NotificacionesService,
  ) {}

  /**
   * Cron diario a las 07:00 AM (hora de America/Hermosillo).
   * La expresión puede sobreescribirse con la variable TURNO_CRON.
   */
  @Cron(process.env.TURNO_CRON || '0 7 * * *', {
    timeZone: process.env.TZ || 'America/Hermosillo',
  })
  async ejecutarInicioTurnoAutomatico() {
    this.logger.log('--- Disparando inicio de turno automático (SCH-1) ---');
    return this.ejecutarReporteInicialTurno();
  }

  async ejecutarReporteInicialTurno(supervisorIdOpcional?: string) {
    const ahora = new Date();
    this.logger.log('Iniciando proceso de reporte inicial de turno hacia Reservaciones...');

    // 1. SCH-1 -> SCH-2: Consultar estado de todas las habitaciones
    const habitaciones = await this.inventarioService.consultarTodas();

    // Determinar supervisor responsable
    let supervisorId = supervisorIdOpcional;
    if (!supervisorId) {
      const sup = await this.prisma.empleado.findFirst({
        where: { rol: 'SUPERVISOR', activo: true },
      });
      supervisorId = sup?.id || (await this.prisma.empleado.findFirst())?.id || '';
    }

    // 2. SCH-1 -> SCH-7: Registrar reporte FR08-03 inicial de turno
    const reporte = await this.reportesService.registrarReporte({
      tipo: TipoReporte.INICIAL,
      estadoExterno: EstadoExterno.DISPONIBLE,
      observaciones: `Reporte inicial de apertura de turno operativo emitido a las 07:00 AM. Total habitaciones: ${habitaciones.length}.`,
      supervisorId,
    });

    // 3. Mapear habitaciones para Reservaciones
    const itemsHabitaciones = habitaciones.map((h) => ({
      noHabitacion: h.noHabitacion,
      tipo: h.tipo,
      estado: obtenerEstadoExterno(h.estado as unknown as EstadoHabitacionInterno),
    }));

    // 4. SCH-1 -> SCH-3: Enviar mensaje HOSP-RES-1 a Reservaciones
    const fechaStr = ahora.toISOString().split('T')[0];
    const payload = {
      tipo: 'REPORTE_INICIAL' as const,
      noReporte: reporte.noReporte,
      fecha: fechaStr,
      turno: 'Matutino 07:00 - 15:00',
      habitaciones: itemsHabitaciones,
    };

    const mensajeSaliente = await this.notificacionesService.enviarReporteInicialReservaciones(payload);

    this.logger.log(
      `Reporte inicial ${reporte.noReporte} completado y despachado a Reservaciones. Mensaje: ${mensajeSaliente.idMensaje}`,
    );

    return {
      reporte,
      mensajeSaliente,
      habitaciones: itemsHabitaciones,
    };
  }
}
