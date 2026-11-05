import { RolEmpleado } from '../enums/roles.enum';

export interface EmpleadoDto {
  id: string;
  nombre: string;
  email: string;
  rol: RolEmpleado;
  activo: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  access_token: string;
  refresh_token: string;
  empleado: EmpleadoDto;
}

export interface EmpleadoTurnoDto {
  id: string;
  empleadoId: string;
  turnoId: string;
  empleado: EmpleadoDto;
}

export interface TurnoDto {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  empleados?: EmpleadoTurnoDto[];
}
