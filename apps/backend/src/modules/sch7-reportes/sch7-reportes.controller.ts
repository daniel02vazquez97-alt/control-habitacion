import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EstadoExterno, RolEmpleado, TipoReporte } from '@prisma/client';
import { Sch7ReportesService } from './sch7-reportes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('SCH-7 Reporte de Estado de Habitación')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reportes')
export class Sch7ReportesController {
  constructor(private readonly reportesService: Sch7ReportesService) {}

  @Get('ocupacion')
  @Roles(RolEmpleado.GERENTE, RolEmpleado.SUPERVISOR)
  @ApiOperation({ summary: 'Consultar métricas consolidadas de ocupación e inventario' })
  async obtenerOcupacion() {
    return this.reportesService.obtenerResumenOcupacion();
  }

  @Get('historial')
  @Roles(RolEmpleado.GERENTE, RolEmpleado.SUPERVISOR)
  @ApiOperation({ summary: 'Consultar historial de reportes oficiales FR08-03 con filtros' })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String })
  @ApiQuery({ name: 'fechaFin', required: false, type: String })
  @ApiQuery({ name: 'estadoExterno', required: false, enum: EstadoExterno })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoReporte })
  async consultarHistorial(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('estadoExterno') estadoExterno?: EstadoExterno,
    @Query('tipo') tipo?: TipoReporte,
  ) {
    return this.reportesService.consultarHistorialReportes({
      fechaInicio,
      fechaFin,
      estadoExterno,
      tipo,
    });
  }
}
