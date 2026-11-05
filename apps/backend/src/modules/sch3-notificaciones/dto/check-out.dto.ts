import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CheckOutDto {
  @ApiProperty({ example: 'c1f7b702-8d9e-4e44-b021-3965d1b7cf45', description: 'UUID único de idempotencia' })
  @IsUUID('4', { message: 'El idMensaje debe ser un UUID v4 válido.' })
  @IsNotEmpty()
  idMensaje: string;

  @ApiProperty({ example: '101', description: 'Número de habitación' })
  @IsString()
  @IsNotEmpty()
  noHabitacion: string;

  @ApiProperty({ example: '2026-11-05T11:30:00Z', description: 'Fecha y hora de salida en formato ISO-8601' })
  @IsString()
  @IsNotEmpty()
  fechaHoraSalida: string;

  @ApiPropertyOptional({ example: 'Check-out express sin consumos extras', description: 'Observaciones del huésped' })
  @IsString()
  @IsOptional()
  observaciones?: string | null;
}
