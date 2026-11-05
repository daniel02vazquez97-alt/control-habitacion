import { EstadoHabitacionInterno } from '../enums/estados.enum';
import { TipoHabitacion } from '../enums/habitacion-tipo.enum';
import { OrigenBitacora } from '../enums/integracion.enum';

export interface HabitacionDto {
  id: string;
  noHabitacion: string;
  tipo: TipoHabitacion;
  piso: number;
  estado: EstadoHabitacionInterno;
  actualizadoEn: string;
}

export interface BitacoraEstadoDto {
  id: string;
  habitacionId: string;
  estadoAnterior: EstadoHabitacionInterno;
  estadoNuevo: EstadoHabitacionInterno;
  origen: OrigenBitacora;
  usuarioId?: string | null;
  nombreUsuario?: string | null;
  fechaHora: string;
  nota?: string | null;
}

export interface CambiarEstadoDto {
  nuevoEstado: EstadoHabitacionInterno;
  nota?: string;
}

export interface HabitacionDetalleDto extends HabitacionDto {
  bitacora: BitacoraEstadoDto[];
  asignacionActual?: unknown;
  inspeccionActual?: unknown;
}
