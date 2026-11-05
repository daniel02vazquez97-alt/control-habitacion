import { EstadoHabitacionInterno, EstadoHabitacionExterno } from '../enums/estados.enum';

/**
 * Mapeo centralizado único de estados internos de Hospedaje hacia estados externos de Reservaciones.
 *
 * Reglas de negocio:
 * - DISPONIBLE: únicamente VACANTE_INSPECCIONADA (lista para vender y ocupar).
 * - BLOQUEADA: BLOQUEADA (daños o mantenimiento en curso).
 * - OCUPADA: OCUPADA, VACANTE_SUCIA y VACANTE_LIMPIA (no vendibles para Reservaciones).
 */
export const MAPEO_ESTADOS_INTERNOS_A_EXTERNOS: Record<
  EstadoHabitacionInterno,
  EstadoHabitacionExterno
> = {
  [EstadoHabitacionInterno.VACANTE_INSPECCIONADA]: EstadoHabitacionExterno.DISPONIBLE,
  [EstadoHabitacionInterno.BLOQUEADA]: EstadoHabitacionExterno.BLOQUEADA,
  [EstadoHabitacionInterno.OCUPADA]: EstadoHabitacionExterno.OCUPADA,
  [EstadoHabitacionInterno.VACANTE_SUCIA]: EstadoHabitacionExterno.OCUPADA,
  [EstadoHabitacionInterno.VACANTE_LIMPIA]: EstadoHabitacionExterno.OCUPADA,
};

/**
 * Obtiene el estado externo para Reservaciones a partir del estado interno de Hospedaje.
 */
export function obtenerEstadoExterno(
  estadoInterno: EstadoHabitacionInterno,
): EstadoHabitacionExterno {
  return MAPEO_ESTADOS_INTERNOS_A_EXTERNOS[estadoInterno];
}

/**
 * Definición formal de las transiciones válidas según la máquina de estados FR08.
 */
export interface TransicionRegla {
  desde: EstadoHabitacionInterno;
  hacia: EstadoHabitacionInterno;
  disparador: string;
  actor: string;
  requiereNotificacionReservaciones: boolean;
}

export const TRANSICIONES_PERMITIDAS: TransicionRegla[] = [
  {
    desde: EstadoHabitacionInterno.OCUPADA,
    hacia: EstadoHabitacionInterno.VACANTE_SUCIA,
    disparador: 'Aviso de check-out',
    actor: 'Sistema (Recepción)',
    requiereNotificacionReservaciones: false, // Sigue mapeando a OCUPADA (no vendible)
  },
  {
    desde: EstadoHabitacionInterno.VACANTE_SUCIA,
    hacia: EstadoHabitacionInterno.VACANTE_LIMPIA,
    disparador: 'Reportar limpia (limpieza y reposición terminadas)',
    actor: 'Camarista',
    requiereNotificacionReservaciones: false, // Sigue mapeando a OCUPADA (no vendible)
  },
  {
    desde: EstadoHabitacionInterno.VACANTE_LIMPIA,
    hacia: EstadoHabitacionInterno.VACANTE_INSPECCIONADA,
    disparador: 'Inspección aprobada (8 puntos Sí, sin daños)',
    actor: 'Supervisor',
    requiereNotificacionReservaciones: true, // Cambia a DISPONIBLE en Reservaciones
  },
  {
    desde: EstadoHabitacionInterno.VACANTE_LIMPIA,
    hacia: EstadoHabitacionInterno.BLOQUEADA,
    disparador: 'Inspección con daño',
    actor: 'Supervisor',
    requiereNotificacionReservaciones: true, // Cambia a BLOQUEADA en Reservaciones
  },
  {
    desde: EstadoHabitacionInterno.VACANTE_LIMPIA,
    hacia: EstadoHabitacionInterno.VACANTE_LIMPIA,
    disparador: 'No cumple estándar -> corrección de detalles -> reinspección',
    actor: 'Supervisor / Camarista',
    requiereNotificacionReservaciones: false,
  },
  {
    desde: EstadoHabitacionInterno.BLOQUEADA,
    hacia: EstadoHabitacionInterno.VACANTE_SUCIA,
    disparador: 'Reparación confirmada',
    actor: 'Supervisor',
    requiereNotificacionReservaciones: false, // Pasa a sucia para reiniciar ciclo de limpieza
  },
  {
    desde: EstadoHabitacionInterno.VACANTE_INSPECCIONADA,
    hacia: EstadoHabitacionInterno.OCUPADA,
    disparador: 'Aviso de check-in',
    actor: 'Sistema (Recepción)',
    requiereNotificacionReservaciones: true, // Cambia a OCUPADA en Reservaciones
  },
];

/**
 * Valida si una transición entre estados internos es permitida por la máquina de estados.
 */
export function esTransicionValida(
  desde: EstadoHabitacionInterno,
  hacia: EstadoHabitacionInterno,
): boolean {
  return TRANSICIONES_PERMITIDAS.some((t) => t.desde === desde && t.hacia === hacia);
}

/**
 * Obtiene la regla de transición permitida o null si no es válida.
 */
export function obtenerReglaTransicion(
  desde: EstadoHabitacionInterno,
  hacia: EstadoHabitacionInterno,
): TransicionRegla | null {
  return TRANSICIONES_PERMITIDAS.find((t) => t.desde === desde && t.hacia === hacia) || null;
}
