import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Token de refresco JWT' })
  @IsString()
  @IsNotEmpty({ message: 'El token de refresco es requerido.' })
  refreshToken: string;
}
