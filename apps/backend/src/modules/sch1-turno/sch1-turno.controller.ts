import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolEmpleado } from '@prisma/client';
import { Sch1TurnoService } from './sch1-turno.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SCH-1 Programación de Turno')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('turno')
export class Sch1TurnoController {
  constructor(private readonly turnoService: Sch1TurnoService) {}

  @Post('disparar-reporte-inicial')
  @HttpCode(HttpStatus.OK)
  @Roles(RolEmpleado.SUPERVISOR, RolEmpleado.GERENTE)
  @ApiOperation({ summary: 'Disparar manualmente el reporte inicial de turno hacia Reservaciones' })
  @ApiResponse({ status: 200, description: 'Reporte inicial generado y enviado a Reservaciones' })
  async dispararManualmente(@CurrentUser() user: any) {
    return this.turnoService.ejecutarReporteInicialTurno(user?.id);
  }
}
