/**
 * Dirección del mensaje de integración.
 */
export enum DireccionMensaje {
  ENTRANTE = 'ENTRANTE',
  SALIENTE = 'SALIENTE',
}

/**
 * Interfaces oficiales de integración con sistemas externos (Recepción y Reservaciones).
 */
export enum InterfaceIntegracion {
  REC_HOSP_1 = 'REC-HOSP-1', // Check-out desde Recepción
  REC_HOSP_2 = 'REC-HOSP-2', // Check-in desde Recepción
  HOSP_RES_1 = 'HOSP-RES-1', // Reporte inicial hacia Reservaciones
  HOSP_RES_2 = 'HOSP-RES-2', // Cambio de estado hacia Reservaciones
}

/**
 * Estado del mensaje en la cola o historial de integración.
 */
export enum EstadoMensajeIntegracion {
  PENDIENTE = 'PENDIENTE',
  ENTREGADO = 'ENTREGADO',
  FALLIDO = 'FALLIDO',
  PROCESADO = 'PROCESADO',
}

/**
 * Origen del cambio de estado en la bitácora inmutable.
 */
export enum OrigenBitacora {
  USUARIO = 'USUARIO',
  RECEPCION = 'RECEPCION',
  SISTEMA = 'SISTEMA',
}

/**
 * Tipo de reporte de estado FR08-03.
 */
export enum TipoReporteEstado {
  INICIAL = 'INICIAL',
  CAMBIO = 'CAMBIO',
}
