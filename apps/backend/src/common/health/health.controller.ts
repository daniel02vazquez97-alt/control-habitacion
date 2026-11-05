import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Verificación del estado del sistema y la base de datos' })
  @ApiResponse({ status: 200, description: 'Servicio y base de datos saludables' })
  @ApiResponse({ status: 503, description: 'Fallo de conexión a la base de datos' })
  async checkHealth(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        estado: 'OK',
        servicio: 'Hospedaje FR08 Backend',
        baseDeDatos: 'CONECTADA',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        estado: 'DEGRADED',
        servicio: 'Hospedaje FR08 Backend',
        baseDeDatos: 'DESCONECTADA',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
