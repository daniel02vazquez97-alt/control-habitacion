/**
 * Estados internos de una habitación dentro del procedimiento FR08 Hospedaje.
 */
export enum EstadoHabitacionInterno {
  VACANTE_SUCIA = 'VACANTE_SUCIA',
  VACANTE_LIMPIA = 'VACANTE_LIMPIA',
  VACANTE_INSPECCIONADA = 'VACANTE_INSPECCIONADA',
  BLOQUEADA = 'BLOQUEADA',
  OCUPADA = 'OCUPADA',
}

/**
 * Estados externos visibles para el área de Reservaciones.
 */
export enum EstadoHabitacionExterno {
  DISPONIBLE = 'DISPONIBLE',
  BLOQUEADA = 'BLOQUEADA',
  OCUPADA = 'OCUPADA',
}
