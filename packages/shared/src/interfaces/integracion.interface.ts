import {
  DireccionMensaje,
  EstadoMensajeIntegracion,
  InterfaceIntegracion,
} from '../enums/integracion.enum';
import { EstadoHabitacionExterno } from '../enums/estados.enum';

/**
 * Payload entrante para REC-HOSP-1 (Aviso de Check-Out desde Recepción).
 */
export interface RecHosp1CheckOutDto {
  idMensaje: string;
  noHabitacion: string;
  fechaHoraSalida: string;
  observaciones?: string | null;
}

/**
 * Payload entrante para REC-HOSP-2 (Aviso de Check-In desde Recepción).
 */
export interface RecHosp2CheckInDto {
  idMensaje: string;
  noHabitacion: string;
  huesped: string;
  fechaEntrada: string;
  fechaSalida: string;
}

/**
 * Acuse de recibo devuelto a Recepción (HTTP 202 Accepted).
 */
export interface AcuseRecepcionDto {
  acuse: {
    idMensaje: string;
    recibido: string;
  };
}

/**
 * Ítem de habitación en el reporte inicial para Reservaciones.
 */
export interface HospRes1HabitacionItem {
  noHabitacion: string;
  tipo: string;
  estado: EstadoHabitacionExterno;
}

/**
 * Payload saliente HOSP-RES-1 (Reporte inicial de estados al inicio de turno).
 */
export interface HospRes1ReporteInicialDto {
  tipo: 'REPORTE_INICIAL';
  noReporte: string;
  fecha: string;
  turno: string;
  habitaciones: HospRes1HabitacionItem[];
}

/**
 * Payload saliente HOSP-RES-2 (Notificación de cambio de estado a Reservaciones).
 */
export interface HospRes2CambioEstadoDto {
  tipo: 'CAMBIO_ESTADO';
  noReporte: string;
  noHabitacion: string;
  tipoHabitacion: string;
  estado: EstadoHabitacionExterno;
  fechaHora: string;
  observaciones: string | null;
}

/**
 * Modelo de datos para MensajeIntegracion (Bandeja de entrada / salida y auditoría).
 */
export interface MensajeIntegracionDto {
  id: string;
  idMensaje: string;
  direccion: DireccionMensaje;
  interface: InterfaceIntegracion;
  payload: Record<string, unknown>;
  estado: EstadoMensajeIntegracion;
  intentos: number;
  ultimoError?: string | null;
  fechaHora: string;
}
