import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  applyDecorators,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiSecurity, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EstadoHabitacion, OrigenBitacora, RolEmpleado } from '@prisma/client';
import { Sch2InventarioService } from './sch2-inventario.service';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { EdoHabitacionDto } from './dto/edo-habitacion.dto';

/** Rutas internas del microservicio: JWT de usuarios de Hospedaje y control por rol. */
const Interno = () => applyDecorators(ApiBearerAuth(), UseGuards(AuthGuard('jwt'), RolesGuard));

@ApiTags('SCH-2 Inventario de Habitaciones')
@Controller('habitaciones')
export class Sch2InventarioController {
  constructor(private readonly inventarioService: Sch2InventarioService) {}

  @Get()
  @Interno()
  @ApiOperation({ summary: 'Consultar todas las habitaciones con filtros opcionales' })
  @ApiQuery({ name: 'piso', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoHabitacion })
  async obtenerTodas(
    @Query('piso') piso?: number,
    @Query('estado') estado?: EstadoHabitacion,
  ) {
    return this.inventarioService.consultarTodas(piso, estado);
  }

  @Get('contadores')
  @Interno()
  @ApiOperation({ summary: 'Obtener contadores de habitaciones agrupados por estado' })
  async obtenerContadores() {
    return this.inventarioService.obtenerContadoresPorEstado();
  }

  @Get('disponibles')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('X-API-Key')
  @ApiOperation({ summary: 'Interface 15 DispHabitaciones (GET, pull): estatus de las habitaciones para Reservas (RES) y Recepción (CIO)' })
  @ApiQuery({ name: 'estatus', required: false, enum: ['DISPONIBLE', 'OCUPADA', 'BLOQUEADA'] })
  @ApiQuery({ name: 'tipo', required: false, enum: ['SENCILLA', 'DOBLE', 'SUITE'] })
  @ApiQuery({ name: 'fechaEntrada', required: false, description: 'AAAA-MM-DD; junto con fechaSalida calcula el estatus para esa estancia' })
  @ApiQuery({ name: 'fechaSalida', required: false, description: 'AAAA-MM-DD' })
  @ApiResponse({ status: 200, description: 'Lista de habitaciones con número, tipo, capacidad y estatus' })
  @ApiResponse({ status: 400, description: 'Fechas inválidas' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  async dispHabitaciones(
    @Query('estatus') estatus?: string,
    @Query('tipo') tipo?: string,
    @Query('fechaEntrada') fechaEntrada?: string,
    @Query('fechaSalida') fechaSalida?: string,
  ) {
    return this.inventarioService.consultarDisponibilidad(estatus, tipo, fechaEntrada, fechaSalida);
  }

  @Get(':id')
  @Interno()
  @ApiOperation({ summary: 'Consultar detalle completo de una habitación por su ID' })
  async obtenerPorId(@Param('id') id: string) {
    return this.inventarioService.consultarPorId(id);
  }

  @Patch(':id/estado-interno')
  @Interno()
  @HttpCode(HttpStatus.OK)
  @Roles(RolEmpleado.GERENTE, RolEmpleado.SUPERVISOR, RolEmpleado.CAMARISTA)
  @ApiOperation({ summary: 'Cambiar estado interno de una habitación evaluando la máquina de estados' })
  @ApiResponse({ status: 200, description: 'Estado actualizado correctamente' })
  @ApiResponse({ status: 409, description: 'Transición inválida rechazada por la máquina de estados' })
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() user: any,
  ) {
    return this.inventarioService.cambiarEstado(
      id,
      dto.nuevoEstado,
      OrigenBitacora.USUARIO,
      user?.id,
      dto.nota,
    );
  }

  @Patch(':noHabitacion/estado')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('X-API-Key')
  @ApiParam({ name: 'noHabitacion', example: '101' })
  @ApiOperation({ summary: 'Interface 14 EdoHabitacion (PATCH, push): Recepción (CIO) avisa check-in o check-out' })
  @ApiResponse({ status: 200, description: 'Estado actualizado; devuelve el estado nuevo y el acuse' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  @ApiResponse({ status: 404, description: 'La habitación no existe' })
  @ApiResponse({ status: 409, description: 'La habitación no está en un estado que permita el movimiento' })
  async edoHabitacion(@Param('noHabitacion') noHabitacion: string, @Body() dto: EdoHabitacionDto) {
    return this.inventarioService.procesarEdoHabitacion(noHabitacion, dto);
  }
}
