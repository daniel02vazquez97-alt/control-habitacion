import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolEmpleado } from '@prisma/client';
import { Sch4LimpiezaService } from './sch4-limpieza.service';
import { CrearAsignacionDto } from './dto/crear-asignacion.dto';
import { ActualizarTareaLimpiezaDto } from './dto/actualizar-tarea.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SCH-4 Gestión de Limpieza')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('limpieza')
export class Sch4LimpiezaController {
  constructor(private readonly limpiezaService: Sch4LimpiezaService) {}

  @Post('asignaciones')
  @Roles(RolEmpleado.SUPERVISOR, RolEmpleado.GERENTE)
  @ApiOperation({ summary: 'Asignar limpieza a una camarista y auxiliar activos en el turno' })
  @ApiResponse({ status: 201, description: 'Asignación creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Habitación no en estado VACANTE_SUCIA o personal no activo' })
  async crearAsignacion(@Body() dto: CrearAsignacionDto, @CurrentUser() user: any) {
    return this.limpiezaService.crearAsignacion(dto, user?.id);
  }

  @Get('mis-tareas')
  @ApiOperation({ summary: 'Consultar tareas del día asignadas al usuario actual' })
  async obtenerMisTareas(@CurrentUser() user: any) {
    return this.limpiezaService.obtenerMisTareas(user.id, user.rol);
  }

  @Get('pendientes')
  @Roles(RolEmpleado.SUPERVISOR, RolEmpleado.GERENTE)
  @ApiOperation({ summary: 'Listar todas las asignaciones de limpieza activas y pendientes' })
  async listarPendientes() {
    return this.limpiezaService.listarAsignacionesPendientes();
  }

  @Patch('asignaciones/:id/limpieza')
  @Roles(RolEmpleado.CAMARISTA)
  @ApiOperation({ summary: 'Marcar la tarea de limpieza física como terminada (Camarista)' })
  async actualizarLimpieza(
    @Param('id') id: string,
    @Body() dto: ActualizarTareaLimpiezaDto,
    @CurrentUser() user: any,
  ) {
    return this.limpiezaService.marcarLimpiezaTerminada(id, user.id, dto.completada);
  }

  @Patch('asignaciones/:id/reposicion')
  @Roles(RolEmpleado.AUXILIAR)
  @ApiOperation({ summary: 'Marcar la tarea de reposición de blancos como terminada (Auxiliar)' })
  async actualizarReposicion(
    @Param('id') id: string,
    @Body() dto: ActualizarTareaLimpiezaDto,
    @CurrentUser() user: any,
  ) {
    return this.limpiezaService.marcarReposicionTerminada(id, user.id, dto.completada);
  }

  @Post('asignaciones/:id/reportar-limpia')
  @HttpCode(HttpStatus.OK)
  @Roles(RolEmpleado.CAMARISTA)
  @ApiOperation({ summary: 'Reportar habitación limpia tras terminar limpieza y reposición' })
  @ApiResponse({ status: 200, description: 'Habitación transicionada a VACANTE_LIMPIA' })
  @ApiResponse({ status: 400, description: 'Faltan tareas por concluir' })
  async reportarLimpia(@Param('id') id: string, @CurrentUser() user: any) {
    return this.limpiezaService.reportarHabitacionLimpia(id, user.id);
  }
}
