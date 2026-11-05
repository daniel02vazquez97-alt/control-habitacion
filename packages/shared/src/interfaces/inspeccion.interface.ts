import { ResultadoInspeccion } from '../enums/inspeccion.enum';

export interface PuntoInspeccionRespuesta {
  numero: number;
  descripcion: string;
  cumple: boolean;
  observacion?: string;
}

export interface InspeccionDto {
  id: string;
  habitacionId: string;
  noHabitacion?: string;
  supervisorId: string;
  supervisorNombre?: string;
  puntos: PuntoInspeccionRespuesta[];
  hayDanio: boolean;
  descripcionDanio?: string | null;
  cumpleEstandar: boolean;
  resultado: ResultadoInspeccion;
  fechaHora: string;
}

export interface RegistrarInspeccionDto {
  habitacionId: string;
  puntos: PuntoInspeccionRespuesta[];
  hayDanio: boolean;
  descripcionDanio?: string;
}

export interface ReparacionDto {
  id: string;
  habitacionId: string;
  noHabitacion?: string;
  inspeccionId: string;
  descripcion: string;
  confirmadaPor?: string | null;
  confirmadaEn?: string | null;
}

export interface ConfirmarReparacionDto {
  observaciones?: string;
}
