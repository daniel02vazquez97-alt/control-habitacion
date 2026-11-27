import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EstadoReservacion } from '@prisma/client';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CrearReservacionDto } from './dto/crear-reservacion.dto';
import { Sch9ReservacionesService } from './sch9-reservaciones.service';

@ApiTags('SCH-9 Reservaciones (Gestión de Reservas → Hospedaje)')
@ApiSecurity('X-API-Key')
@UseGuards(ApiKeyGuard)
@Controller('reservaciones')
export class Sch9ReservacionesController {
  constructor(private readonly reservacionesService: Sch9ReservacionesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reservas registra una habitación rentada con su fecha de entrada y salida' })
  @ApiResponse({ status: 201, description: 'Reservación registrada' })
  @ApiResponse({ status: 400, description: 'Datos o fechas inválidas' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  @ApiResponse({ status: 404, description: 'La habitación no existe' })
  @ApiResponse({ status: 409, description: 'La habitación ya está reservada en esas fechas o el folio ya existe' })
  async crear(@Body() dto: CrearReservacionDto) {
    return this.reservacionesService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Consultar reservaciones (por habitación, estado o rango de fechas)' })
  @ApiQuery({ name: 'noHabitacion', required: false })
  @ApiQuery({ name: 'desde', required: false, description: 'AAAA-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, description: 'AAAA-MM-DD' })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoReservacion })
  async listar(
    @Query('noHabitacion') noHabitacion?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('estado') estado?: EstadoReservacion,
  ) {
    return this.reservacionesService.listar({ noHabitacion, desde, hasta, estado });
  }

  @Get(':folioReserva')
  @ApiOperation({ summary: 'Consultar una reservación por folio' })
  async consultar(@Param('folioReserva') folioReserva: string) {
    return this.reservacionesService.consultar(folioReserva);
  }

  @Patch(':folioReserva/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar una reservación CONFIRMADA; la habitación queda libre en esas fechas' })
  async cancelar(@Param('folioReserva') folioReserva: string) {
    return this.reservacionesService.cancelar(folioReserva);
  }
}
