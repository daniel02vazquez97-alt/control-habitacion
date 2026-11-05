import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ example: 'e4a29c31-7b3f-4882-9f12-087c53d10212', description: 'UUID único de idempotencia' })
  @IsUUID('4', { message: 'El idMensaje debe ser un UUID v4 válido.' })
  @IsNotEmpty()
  idMensaje: string;

  @ApiProperty({ example: '101', description: 'Número de habitación' })
  @IsString()
  @IsNotEmpty()
  noHabitacion: string;

  @ApiProperty({ example: 'Carlos Méndez', description: 'Nombre completo del huésped' })
  @IsString()
  @IsNotEmpty()
  huesped: string;

  @ApiProperty({ example: '2026-11-05', description: 'Fecha de llegada YYYY-MM-DD' })
  @IsDateString()
  @IsNotEmpty()
  fechaEntrada: string;

  @ApiProperty({ example: '2026-11-08', description: 'Fecha de salida programada YYYY-MM-DD' })
  @IsDateString()
  @IsNotEmpty()
  fechaSalida: string;
}
