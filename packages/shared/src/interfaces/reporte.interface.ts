import { EstadoHabitacionExterno } from '../enums/estados.enum';
import { TipoReporteEstado } from '../enums/integracion.enum';

export interface ReporteEstadoDto {
  id: string;
  noReporte: string;
  anio: number;
  consecutivo: number;
  habitacionId?: string | null;
  noHabitacion?: string | null;
  tipo: TipoReporteEstado;
  estadoExterno: EstadoHabitacionExterno;
  observaciones?: string | null;
  supervisorId: string;
  supervisorNombre?: string | null;
  fechaHora: string;
  pdfPath?: string | null;
}

export interface ResumenOcupacionDto {
  totalHabitaciones: number;
  ocupadas: number;
  disponibles: number;
  bloqueadas: number;
  porcentajeOcupacion: number;
  conteoPorEstadoInterno: Record<string, number>;
}

export interface FiltroReporteDto {
  fechaInicio?: string;
  fechaFin?: string;
  estadoExterno?: EstadoHabitacionExterno;
  tipo?: TipoReporteEstado;
}
