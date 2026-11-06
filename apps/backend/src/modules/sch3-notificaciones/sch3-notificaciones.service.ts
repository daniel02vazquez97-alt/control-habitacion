import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import {
  DireccionMensaje,
  EstadoMensajeIntegracion,
  InterfaceIntegracion,
  OrigenBitacora,
  EstadoHabitacion,
  MensajeIntegracion,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Sch2InventarioService, EventoEstadoCambiado } from '../sch2-inventario/sch2-inventario.service';
import { CheckOutDto } from './dto/check-out.dto';
import { CheckInDto } from './dto/check-in.dto';
import {
  EstadoHabitacionExterno,
  HospRes1ReporteInicialDto,
  HospRes2CambioEstadoDto,
} from '@control-habitacion/shared';

@Injectable()
export class Sch3NotificacionesService {
  private readonly logger = new Logger(Sch3NotificacionesService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private inventarioService: Sch2InventarioService,
  ) {}

  // ----------------------------------------------------
  // ENTRANTES: Recepción -> Control de Habitación
  // ----------------------------------------------------

  async procesarCheckOut(dto: CheckOutDto) {
    // Regla 10: Idempotencia por idMensaje
    const existente = await this.prisma.mensajeIntegracion.findUnique({
      where: { idMensaje: dto.idMensaje },
    });

    if (existente) {
      this.logger.warn(`Mensaje check-out duplicado detectado (idempotencia aplicada): ${dto.idMensaje}`);
      return {
        acuse: {
          idMensaje: dto.idMensaje,
          recibido: existente.fechaHora.toISOString(),
        },
      };
    }

    const habitacion = await this.inventarioService.consultarPorNumero(dto.noHabitacion);

    // Registrar mensaje entrante en auditoría
    await this.prisma.mensajeIntegracion.create({
      data: {
        idMensaje: dto.idMensaje,
        direccion: DireccionMensaje.ENTRANTE,
        interface: InterfaceIntegracion.REC_HOSP_1,
        payload: dto as any,
        estado: EstadoMensajeIntegracion.PROCESADO,
        intentos: 1,
      },
    });

    // Disparar cambio de estado automático: OCUPADA -> VACANTE_SUCIA
    await this.inventarioService.cambiarEstado(
      habitacion.id,
      EstadoHabitacion.VACANTE_SUCIA,
      OrigenBitacora.RECEPCION,
      null,
      `Aviso de check-out recibido de Recepción. Salida: ${dto.fechaHoraSalida}. ${dto.observaciones || ''}`.trim(),
    );

    return {
      acuse: {
        idMensaje: dto.idMensaje,
        recibido: new Date().toISOString(),
      },
    };
  }

  async procesarCheckIn(dto: CheckInDto) {
    // Regla 10: Idempotencia por idMensaje
    const existente = await this.prisma.mensajeIntegracion.findUnique({
      where: { idMensaje: dto.idMensaje },
    });

    if (existente) {
      this.logger.warn(`Mensaje check-in duplicado detectado (idempotencia aplicada): ${dto.idMensaje}`);
      return {
        acuse: {
          idMensaje: dto.idMensaje,
          recibido: existente.fechaHora.toISOString(),
        },
      };
    }

    const habitacion = await this.inventarioService.consultarPorNumero(dto.noHabitacion);

    await this.prisma.mensajeIntegracion.create({
      data: {
        idMensaje: dto.idMensaje,
        direccion: DireccionMensaje.ENTRANTE,
        interface: InterfaceIntegracion.REC_HOSP_2,
        payload: dto as any,
        estado: EstadoMensajeIntegracion.PROCESADO,
        intentos: 1,
      },
    });

    // Disparar cambio de estado automático: VACANTE_INSPECCIONADA -> OCUPADA
    await this.inventarioService.cambiarEstado(
      habitacion.id,
      EstadoHabitacion.OCUPADA,
      OrigenBitacora.RECEPCION,
      null,
      `Aviso de check-in recibido de Recepción. Huésped: ${dto.huesped} (${dto.fechaEntrada} a ${dto.fechaSalida})`,
    );

    return {
      acuse: {
        idMensaje: dto.idMensaje,
        recibido: new Date().toISOString(),
      },
    };
  }

  // ----------------------------------------------------
  // SALIENTES: Control de Habitación -> Reservaciones (Webhooks)
  // ----------------------------------------------------

  async enviarReporteInicialReservaciones(payload: HospRes1ReporteInicialDto) {
    const idMensaje = crypto.randomUUID();
    return this.despacharWebhookSaliente(
      idMensaje,
      InterfaceIntegracion.HOSP_RES_1,
      payload as any,
    );
  }

  async enviarCambioEstadoReservaciones(payload: HospRes2CambioEstadoDto) {
    const idMensaje = crypto.randomUUID();
    return this.despacharWebhookSaliente(
      idMensaje,
      InterfaceIntegracion.HOSP_RES_2,
      payload as any,
    );
  }

  private async despacharWebhookSaliente(
    idMensaje: string,
    interfaz: InterfaceIntegracion,
    payload: Record<string, unknown>,
  ): Promise<MensajeIntegracion> {
    const webhookUrl = this.configService.get<string>('RESERVACIONES_WEBHOOK_URL');
    const secret = this.configService.get<string>('RESERVACIONES_WEBHOOK_SECRET') || 'demo-webhook-secret';

    const payloadJson = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(payloadJson).digest('hex');

    // Crear registro inicial en bandeja saliente
    const mensaje = await this.prisma.mensajeIntegracion.create({
      data: {
        idMensaje,
        direccion: DireccionMensaje.SALIENTE,
        interface: interfaz,
        payload: payload as any,
        estado: EstadoMensajeIntegracion.PENDIENTE,
        intentos: 0,
      },
    });

    // Si la URL está vacía, dejar en bandeja como ENTREGADO (Modo Demo sin sistema externo)
    if (!webhookUrl || webhookUrl.trim() === '') {
      this.logger.log(
        `[DEMO MODE] RESERVACIONES_WEBHOOK_URL no configurada. Mensaje ${idMensaje} (${interfaz}) guardado en bandeja de salida exitosamente.`,
      );
      return this.prisma.mensajeIntegracion.update({
        where: { id: mensaje.id },
        data: {
          estado: EstadoMensajeIntegracion.ENTREGADO,
          intentos: 1,
          ultimoError: 'Almacenado localmente en bandeja de salida para demostración sin sistema externo.',
        },
      });
    }

    // Si hay URL, ejecutar con reintentos exponenciales (máximo 5 intentos)
    this.ejecutarEnvioConReintentos(mensaje.id, webhookUrl, payloadJson, signature).catch((e) =>
      this.logger.error(`Error no controlado en despacho de webhook: ${e.message}`),
    );

    return mensaje;
  }

  async ejecutarEnvioConReintentos(
    mensajeId: string,
    url: string,
    body: string,
    signature: string,
  ) {
    const maxIntentos = 5;
    let intentos = 0;
    let entregado = false;
    let ultimoError = '';

    while (intentos < maxIntentos && !entregado) {
      intentos++;
      try {
        const respuesta = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
          },
          body,
        });

        if (respuesta.ok) {
          entregado = true;
          this.logger.log(`Webhook entregado exitosamente a Reservaciones en intento ${intentos}.`);
        } else {
          ultimoError = `HTTP ${respuesta.status}: ${await respuesta.text().catch(() => '')}`;
        }
      } catch (err) {
        ultimoError = err instanceof Error ? err.message : 'Error desconocido de red';
      }

      if (!entregado && intentos < maxIntentos) {
        const esperaMs = Math.pow(2, intentos) * 1000;
        await new Promise((resolve) => setTimeout(resolve, esperaMs));
      }
    }

    await this.prisma.mensajeIntegracion.update({
      where: { id: mensajeId },
      data: {
        estado: entregado ? EstadoMensajeIntegracion.ENTREGADO : EstadoMensajeIntegracion.FALLIDO,
        intentos,
        ultimoError: entregado ? null : ultimoError,
      },
    });
  }

  async reintentarMensaje(id: string) {
    const mensaje = await this.prisma.mensajeIntegracion.findUnique({ where: { id } });
    if (!mensaje || mensaje.direccion !== DireccionMensaje.SALIENTE) {
      throw new ConflictException({
        codigo: 'MENSAJE_NO_REINTENTABLE',
        mensaje: 'Solo se pueden reintentar mensajes salientes existentes.',
      });
    }

    const webhookUrl = this.configService.get<string>('RESERVACIONES_WEBHOOK_URL');
    if (!webhookUrl) {
      return this.prisma.mensajeIntegracion.update({
        where: { id },
        data: {
          estado: EstadoMensajeIntegracion.ENTREGADO,
          intentos: mensaje.intentos + 1,
          ultimoError: 'Reintento exitoso simulado en bandeja de salida (Demo).',
        },
      });
    }

    const secret = this.configService.get<string>('RESERVACIONES_WEBHOOK_SECRET') || 'demo-webhook-secret';
    const payloadJson = JSON.stringify(mensaje.payload);
    const signature = crypto.createHmac('sha256', secret).update(payloadJson).digest('hex');

    await this.ejecutarEnvioConReintentos(id, webhookUrl, payloadJson, signature);
    return this.prisma.mensajeIntegracion.findUnique({ where: { id } });
  }

  async listarMensajes(direccion?: DireccionMensaje, estado?: EstadoMensajeIntegracion) {
    const where: any = {};
    if (direccion) where.direccion = direccion;
    if (estado) where.estado = estado;

    return this.prisma.mensajeIntegracion.findMany({
      where,
      orderBy: { fechaHora: 'desc' },
      take: 50,
    });
  }

  // Escuchar eventos internos para despachar notificaciones a Reservaciones
  @OnEvent('habitacion.estadoCambiado')
  async handleEstadoCambiadoNotificacion(evento: EventoEstadoCambiado) {
    // Si pasa a VACANTE_INSPECCIONADA -> Notificar DISPONIBLE
    if (evento.estadoNuevo === EstadoHabitacion.VACANTE_INSPECCIONADA) {
      await this.enviarCambioEstadoReservaciones({
        tipo: 'CAMBIO_ESTADO',
        noReporte: `HOSP-RES-CAMBIO-${Date.now()}`,
        noHabitacion: evento.noHabitacion,
        tipoHabitacion: evento.tipo,
        estado: EstadoHabitacionExterno.DISPONIBLE,
        fechaHora: evento.fechaHora.toISOString(),
        observaciones: 'Habitación aprobada e inspeccionada bajo estándar FR08-02.',
      });
    }
    // Si pasa a BLOQUEADA -> Notificar BLOQUEADA
    else if (evento.estadoNuevo === EstadoHabitacion.BLOQUEADA) {
      await this.enviarCambioEstadoReservaciones({
        tipo: 'CAMBIO_ESTADO',
        noReporte: `HOSP-RES-CAMBIO-${Date.now()}`,
        noHabitacion: evento.noHabitacion,
        tipoHabitacion: evento.tipo,
        estado: EstadoHabitacionExterno.BLOQUEADA,
        fechaHora: evento.fechaHora.toISOString(),
        observaciones: evento.nota || 'Habitación bloqueada por daño o mantenimiento.',
      });
    }
    // Si pasa a OCUPADA tras check-in -> Notificar OCUPADA
    else if (evento.estadoNuevo === EstadoHabitacion.OCUPADA && evento.origen === OrigenBitacora.RECEPCION) {
      await this.enviarCambioEstadoReservaciones({
        tipo: 'CAMBIO_ESTADO',
        noReporte: `HOSP-RES-CAMBIO-${Date.now()}`,
        noHabitacion: evento.noHabitacion,
        tipoHabitacion: evento.tipo,
        estado: EstadoHabitacionExterno.OCUPADA,
        fechaHora: evento.fechaHora.toISOString(),
        observaciones: 'Huésped registrado vía aviso de Recepción.',
      });
    }
  }
}
