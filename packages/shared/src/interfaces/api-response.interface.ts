/**
 * Estructura uniforme de respuesta exitosa de la API.
 */
export interface ApiResponse<T = unknown> {
  exito: boolean;
  codigo: string;
  mensaje: string;
  datos?: T;
  timestamp: string;
}

/**
 * Estructura uniforme de respuesta de error de la API.
 */
export interface ApiErrorResponse {
  codigo: string;
  mensaje: string;
  detalles?: unknown;
  timestamp: string;
}
