import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmarReparacionDto {
  @ApiPropertyOptional({
    description: 'Observaciones de la confirmación de reparación por el supervisor',
    example: 'Reparación verificada por mantenimiento; equipo operativo.',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
