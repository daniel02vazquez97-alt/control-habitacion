import { TipoLimpieza } from '../enums/limpieza-tipo.enum';

export interface AsignacionLimpiezaDto {
  id: string;
  habitacionId: string;
  noHabitacion?: string;
  camaristaId: string;
  camaristaNombre?: string;
  auxiliarId: string;
  auxiliarNombre?: string;
  limpiezaTerminada: boolean;
  reposicionTerminada: boolean;
  tipo: TipoLimpieza;
  creadaEn: string;
  terminadaEn?: string | null;
  detallesCorreccion?: string | null;
}

export interface CrearAsignacionLimpiezaDto {
  habitacionId: string;
  camaristaId: string;
  auxiliarId: string;
  tipo?: TipoLimpieza;
  detallesCorreccion?: string;
}

export interface ActualizarTareaLimpiezaDto {
  completada: boolean;
}
