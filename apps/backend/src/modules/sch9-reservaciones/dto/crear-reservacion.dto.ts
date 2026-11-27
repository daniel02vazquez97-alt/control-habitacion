import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/** Reservación que envía Gestión de Reservas (RES) a Control de Habitaciones (HAB). */
export class CrearReservacionDto {
  @ApiProperty({ example: 'RES-2026-000123', description: 'Folio único de la reservación (lo genera Reservas)' })
  @IsString()
  @IsNotEmpty()
  folioReserva: string;

  @ApiProperty({ example: '101', description: 'Número de habitación reservada' })
  @IsString()
  @IsNotEmpty()
  noHabitacion: string;

  @ApiProperty({ example: '2026-12-20', description: 'Fecha de entrada (AAAA-MM-DD)' })
  @IsDateString()
  fechaEntrada: string;

  @ApiProperty({ example: '2026-12-23', description: 'Fecha de salida (AAAA-MM-DD); debe ser posterior a la de entrada' })
  @IsDateString()
  fechaSalida: string;

  @ApiPropertyOptional({ example: 'Alejandro Valenzuela', description: 'Nombre del huésped titular' })
  @IsOptional()
  @IsString()
  huesped?: string;

  @ApiPropertyOptional({ example: 2, description: 'Número de personas' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numeroPersonas?: number;
}
