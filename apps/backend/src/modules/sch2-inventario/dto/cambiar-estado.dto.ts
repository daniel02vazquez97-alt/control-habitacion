import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstadoHabitacion } from '@prisma/client';

export class CambiarEstadoDto {
  @ApiProperty({
    enum: EstadoHabitacion,
    description: 'Nuevo estado interno al que transiciona la habitación',
    example: EstadoHabitacion.VACANTE_LIMPIA,
  })
  @IsEnum(EstadoHabitacion, { message: 'El estado proporcionado no es un estado válido.' })
  @IsNotEmpty({ message: 'El nuevo estado es requerido.' })
  nuevoEstado: EstadoHabitacion;

  @ApiPropertyOptional({
    description: 'Nota u observación explicativa del cambio de estado',
    example: 'Habitación aseada y sábanas cambiadas.',
  })
  @IsString()
  @IsOptional()
  nota?: string;
}
