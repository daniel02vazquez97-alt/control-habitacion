import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ActualizarTareaLimpiezaDto {
  @ApiProperty({ description: 'Indica si la tarea fue completada', example: true })
  @IsBoolean()
  @IsNotEmpty()
  completada: boolean;
}
