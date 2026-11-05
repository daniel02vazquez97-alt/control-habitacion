import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolEmpleado } from '@prisma/client';
import { Sch5PersonalService } from './sch5-personal.service';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('SCH-5 Personal de Housekeeping')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('personal')
export class Sch5PersonalController {
  constructor(private readonly personalService: Sch5PersonalService) {}

  @Get('empleados')
  @ApiOperation({ summary: 'Listar empleados registrados con filtro opcional por rol y estado' })
  @ApiQuery({ name: 'rol', required: false, enum: RolEmpleado })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  async listarEmpleados(
    @Query('rol') rol?: RolEmpleado,
    @Query('activo') activo?: boolean,
  ) {
    return this.personalService.listarEmpleados(rol, activo);
  }

  @Get('turno-activo')
  @ApiOperation({ summary: 'Consultar personal activo programado en el turno actual' })
  async consultarPersonalActivo() {
    return this.personalService.consultarPersonalActivoEnTurno();
  }

  @Post('empleados')
  @Roles(RolEmpleado.GERENTE)
  @ApiOperation({ summary: 'Registrar un nuevo empleado (Solo Gerente)' })
  async crearEmpleado(@Body() dto: CrearEmpleadoDto) {
    return this.personalService.crearEmpleado(dto);
  }

  @Get('turnos')
  @ApiOperation({ summary: 'Consultar catálogo e historial de turnos' })
  async listarTurnos() {
    return this.personalService.listarTurnos();
  }

  @Post('turnos')
  @Roles(RolEmpleado.GERENTE, RolEmpleado.SUPERVISOR)
  @ApiOperation({ summary: 'Programar un nuevo turno con personal asignado' })
  async crearTurno(@Body() dto: CrearTurnoDto) {
    return this.personalService.crearTurno(dto);
  }
}
