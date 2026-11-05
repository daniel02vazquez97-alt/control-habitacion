import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CrearTurnoDto {
  @ApiProperty({ example: '2026-11-05' })
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({ example: '07:00' })
  @IsString()
  @IsNotEmpty()
  horaInicio: string;

  @ApiProperty({ example: '15:00' })
  @IsString()
  @IsNotEmpty()
  horaFin: string;

  @ApiProperty({
    type: [String],
    description: 'Array de IDs de empleados asignados al turno',
    example: ['uuid-empleado-1', 'uuid-empleado-2'],
  })
  @IsArray()
  empleadosIds: string[];
}
