import { apiRequest } from './client';
import {
  EstadoHabitacionInterno,
  TipoLimpieza,
  RolEmpleado,
  RecHosp1CheckOutDto,
  RecHosp2CheckInDto,
} from '@control-habitacion/shared';

// ---------------------------------------------
// Autenticación
// ---------------------------------------------
export async function apiLogin(email: string, password: string) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ---------------------------------------------
// SCH-2: Inventario de Habitaciones
// ---------------------------------------------
export async function apiObtenerHabitaciones(piso?: number, estado?: string) {
  const params = new URLSearchParams();
  if (piso !== undefined) params.append('piso', String(piso));
  if (estado) params.append('estado', estado);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/habitaciones${query}`);
}

export async function apiObtenerDetalleHabitacion(id: string) {
  return apiRequest(`/habitaciones/${id}`);
}

export async function apiObtenerContadores() {
  return apiRequest('/habitaciones/contadores');
}

export async function apiCambiarEstado(
  id: string,
  nuevoEstado: EstadoHabitacionInterno,
  nota?: string,
) {
  return apiRequest(`/habitaciones/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ nuevoEstado, nota }),
  });
}

// ---------------------------------------------
// SCH-4: Gestión de Limpieza
// ---------------------------------------------
export async function apiCrearAsignacionLimpieza(dto: {
  habitacionId: string;
  camaristaId: string;
  auxiliarId: string;
  tipo?: TipoLimpieza;
  detallesCorreccion?: string;
}) {
  return apiRequest('/limpieza/asignaciones', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function apiObtenerMisTareas() {
  return apiRequest('/limpieza/mis-tareas');
}

export async function apiObtenerAsignacionesPendientes() {
  return apiRequest('/limpieza/pendientes');
}

export async function apiActualizarLimpiezaFisica(asignacionId: string, completada: boolean) {
  return apiRequest(`/limpieza/asignaciones/${asignacionId}/limpieza`, {
    method: 'PATCH',
    body: JSON.stringify({ completada }),
  });
}

export async function apiActualizarReposicionBlancos(asignacionId: string, completada: boolean) {
  return apiRequest(`/limpieza/asignaciones/${asignacionId}/reposicion`, {
    method: 'PATCH',
    body: JSON.stringify({ completada }),
  });
}

export async function apiReportarHabitacionLimpia(asignacionId: string) {
  return apiRequest(`/limpieza/asignaciones/${asignacionId}/reportar-limpia`, {
    method: 'POST',
  });
}

// ---------------------------------------------
// SCH-5: Personal de Housekeeping
// ---------------------------------------------
export async function apiObtenerPersonalActivoEnTurno() {
  return apiRequest('/personal/turno-activo');
}

export async function apiObtenerEmpleados(rol?: RolEmpleado) {
  const query = rol ? `?rol=${rol}` : '';
  return apiRequest(`/personal/empleados${query}`);
}

export async function apiCrearEmpleado(dto: any) {
  return apiRequest('/personal/empleados', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function apiObtenerTurnos() {
  return apiRequest('/personal/turnos');
}

export async function apiCrearTurno(dto: any) {
  return apiRequest('/personal/turnos', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

// ---------------------------------------------
// SCH-6: Inspección de Habitación
// ---------------------------------------------
export async function apiObtenerHabitacionesPorInspeccionar() {
  return apiRequest('/inspecciones/pendientes');
}

export async function apiObtenerHabitacionesBloqueadas() {
  return apiRequest('/inspecciones/bloqueadas');
}

export async function apiRegistrarInspeccion(dto: {
  habitacionId: string;
  puntos: Array<{ numero: number; descripcion: string; cumple: boolean; observacion?: string }>;
  hayDanio: boolean;
  descripcionDanio?: string;
}) {
  return apiRequest('/inspecciones', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function apiConfirmarReparacion(reparacionId: string, observaciones?: string) {
  return apiRequest(`/inspecciones/reparaciones/${reparacionId}/confirmar`, {
    method: 'POST',
    body: JSON.stringify({ observaciones }),
  });
}

// ---------------------------------------------
// SCH-7 & SCH-8: Reportes y Documentos
// ---------------------------------------------
export async function apiObtenerOcupacion() {
  return apiRequest('/reportes/ocupacion');
}

export async function apiObtenerHistorialReportes(filtros?: any) {
  const params = new URLSearchParams(filtros || {});
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/reportes/historial${query}`);
}

export function obtenerUrlDescargaPdf(noReporte: string) {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  return `${baseUrl}/documentos/pdf/${noReporte}.pdf`;
}

// ---------------------------------------------
// SCH-1: Programación de Turno
// ---------------------------------------------
export async function apiDispararReporteInicialManual() {
  return apiRequest('/turno/disparar-reporte-inicial', {
    method: 'POST',
  });
}

// ---------------------------------------------
// SCH-3: Integraciones y Simulador Recepción
// ---------------------------------------------
export async function apiSimularCheckOutRecepcion(
  dto: RecHosp1CheckOutDto,
  apiKey: string = 'demo-recepcion-key',
) {
  return apiRequest('/integraciones/recepcion/check-out', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: JSON.stringify(dto),
  });
}

export async function apiSimularCheckInRecepcion(
  dto: RecHosp2CheckInDto,
  apiKey: string = 'demo-recepcion-key',
) {
  return apiRequest('/integraciones/recepcion/check-in', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: JSON.stringify(dto),
  });
}

export async function apiObtenerMensajesIntegracion(direccion?: string, estado?: string) {
  const params = new URLSearchParams();
  if (direccion) params.append('direccion', direccion);
  if (estado) params.append('estado', estado);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/integraciones/mensajes${query}`);
}

export async function apiReintentarMensajeIntegracion(id: string) {
  return apiRequest(`/integraciones/mensajes/${id}/reintentar`, {
    method: 'POST',
  });
}
