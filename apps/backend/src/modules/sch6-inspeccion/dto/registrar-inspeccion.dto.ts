import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PuntoInspeccionInputDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  numero: number;

  @ApiProperty({ example: 'Cama tendida con ropa limpia' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  cumple: boolean;

  @ApiPropertyOptional({ example: 'Almohadas y sábanas limpias y alineadas' })
  @IsString()
  @IsOptional()
  observacion?: string;
}

export class RegistrarInspeccionDto {
  @ApiProperty({ description: 'ID de la habitación en estado VACANTE_LIMPIA' })
  @IsString()
  @IsNotEmpty({ message: 'El ID de la habitación es requerido.' })
  habitacionId: string;

  @ApiProperty({
    type: [PuntoInspeccionInputDto],
    description: 'Los 8 puntos de chequeo del formato FR08-02',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PuntoInspeccionInputDto)
  puntos: PuntoInspeccionInputDto[];

  @ApiProperty({ description: '¿Se detectaron daños o averías físicas?', example: false })
  @IsBoolean()
  @IsNotEmpty()
  hayDanio: boolean;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la avería en caso de haber daño',
    example: 'Chapa electrónica desajustada y aire acondicionado no enfría',
  })
  @IsString()
  @IsOptional()
  descripcionDanio?: string;
}
