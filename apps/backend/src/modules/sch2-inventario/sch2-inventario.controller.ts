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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EstadoHabitacion, OrigenBitacora, RolEmpleado } from '@prisma/client';
import { Sch2InventarioService } from './sch2-inventario.service';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SCH-2 Inventario de Habitaciones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('habitaciones')
export class Sch2InventarioController {
  constructor(private readonly inventarioService: Sch2InventarioService) {}

  @Get()
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
  @ApiOperation({ summary: 'Obtener contadores de habitaciones agrupados por estado' })
  async obtenerContadores() {
    return this.inventarioService.obtenerContadoresPorEstado();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar detalle completo de una habitación por su ID' })
  async obtenerPorId(@Param('id') id: string) {
    return this.inventarioService.consultarPorId(id);
  }

  @Patch(':id/estado')
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
}
