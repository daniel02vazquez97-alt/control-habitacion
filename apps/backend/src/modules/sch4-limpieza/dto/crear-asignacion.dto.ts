import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TipoLimpieza } from '@prisma/client';

export class CrearAsignacionDto {
  @ApiProperty({ description: 'ID de la habitación en estado VACANTE_SUCIA' })
  @IsString()
  @IsNotEmpty({ message: 'El ID de la habitación es requerido.' })
  habitacionId: string;

  @ApiProperty({ description: 'ID de la camarista activa' })
  @IsString()
  @IsNotEmpty({ message: 'El ID de la camarista es requerido.' })
  camaristaId: string;

  @ApiProperty({ description: 'ID del auxiliar activo' })
  @IsString()
  @IsNotEmpty({ message: 'El ID del auxiliar es requerido.' })
  auxiliarId: string;

  @ApiPropertyOptional({ enum: TipoLimpieza, default: TipoLimpieza.SALIDA })
  @IsEnum(TipoLimpieza)
  @IsOptional()
  tipo?: TipoLimpieza;

  @ApiPropertyOptional({ description: 'Detalles específicos si es corrección' })
  @IsString()
  @IsOptional()
  detallesCorreccion?: string;
}
