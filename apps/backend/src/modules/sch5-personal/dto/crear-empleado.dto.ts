import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { RolEmpleado } from '@prisma/client';

export class CrearEmpleadoDto {
  @ApiProperty({ example: 'Laura Gómez' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'laura@resort.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: RolEmpleado, example: RolEmpleado.CAMARISTA })
  @IsEnum(RolEmpleado)
  rol: RolEmpleado;
}
