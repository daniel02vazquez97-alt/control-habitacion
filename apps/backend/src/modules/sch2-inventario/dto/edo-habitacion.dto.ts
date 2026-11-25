import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum TipoMovimiento {
  CHECKIN = 'CHECKIN',
  CHECKOUT = 'CHECKOUT',
}

/** Interface 14 EdoHabitacion (matriz de conectividad): Recepción (CIO) -> Control de Habitaciones (HAB). */
export class EdoHabitacionDto {
  @ApiProperty({ enum: TipoMovimiento, example: TipoMovimiento.CHECKIN, description: 'Tipo de movimiento' })
  @IsEnum(TipoMovimiento, { message: 'tipoMovimiento debe ser CHECKIN o CHECKOUT.' })
  tipoMovimiento: TipoMovimiento;

  @ApiProperty({ example: 'RES-2026-000123', description: 'Folio de reserva' })
  @IsString()
  @IsNotEmpty()
  folioReserva: string;

  @ApiProperty({ example: '2026-11-23', description: 'Fecha de entrada (AAAA-MM-DD)' })
  @IsDateString()
  fechaEntrada: string;

  @ApiProperty({ example: '2026-11-26', description: 'Fecha de salida (AAAA-MM-DD)' })
  @IsDateString()
  fechaSalida: string;

  @ApiPropertyOptional({ example: 'c1f7b702-8d9e-4e44-b021-3965d1b7cf45', description: 'UUID v4 opcional para idempotencia; si se repite no se procesa otra vez' })
  @IsOptional()
  @IsUUID('4')
  idMensaje?: string;
}
