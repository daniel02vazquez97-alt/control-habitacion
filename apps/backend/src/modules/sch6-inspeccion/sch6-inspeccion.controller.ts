import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolEmpleado } from '@prisma/client';
import { Sch6InspeccionService } from './sch6-inspeccion.service';
import { RegistrarInspeccionDto } from './dto/registrar-inspeccion.dto';
import { ConfirmarReparacionDto } from './dto/confirmar-reparacion.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SCH-6 Inspección de Habitación')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inspecciones')
export class Sch6InspeccionController {
  constructor(private readonly inspeccionService: Sch6InspeccionService) {}

  @Get('pendientes')
  @Roles(RolEmpleado.SUPERVISOR, RolEmpleado.GERENTE)
  @ApiOperation({ summary: 'Consultar habitaciones en estado VACANTE_LIMPIA listas para inspección' })
  async obtenerPendientes() {
    return this.inspeccionService.obtenerHabitacionesPorInspeccionar();
  }

  @Get('bloqueadas')
  @Roles(RolEmpleado.SUPERVISOR, RolEmpleado.GERENTE)
  @ApiOperation({ summary: 'Consultar habitaciones bloqueadas con detalles de averías pendientes' })
  async obtenerBloqueadas() {
    return this.inspeccionService.obtenerHabitacionesBloqueadas();
  }

  @Post()
  @Roles(RolEmpleado.SUPERVISOR)
  @ApiOperation({ summary: 'Registrar evaluación de inspección FR08-02 (8 puntos, daño y estándar)' })
  @ApiResponse({ status: 201, description: 'Inspección procesada y estado de habitación actualizado' })
  @ApiResponse({ status: 400, description: 'Habitación no en VACANTE_LIMPIA o puntos incompletos' })
  async registrarInspeccion(
    @Body() dto: RegistrarInspeccionDto,
    @CurrentUser() user: any,
  ) {
    return this.inspeccionService.registrarInspeccion(dto, user.id);
  }

  @Post('reparaciones/:id/confirmar')
  @HttpCode(HttpStatus.OK)
  @Roles(RolEmpleado.SUPERVISOR)
  @ApiOperation({ summary: 'Confirmar reparación técnica y regresar habitación a VACANTE_SUCIA' })
  @ApiResponse({ status: 200, description: 'Reparación confirmada y habitación lista para nueva limpieza' })
  async confirmarReparacion(
    @Param('id') id: string,
    @Body() dto: ConfirmarReparacionDto,
    @CurrentUser() user: any,
  ) {
    return this.inspeccionService.confirmarReparacion(id, user.id, dto);
  }
}
