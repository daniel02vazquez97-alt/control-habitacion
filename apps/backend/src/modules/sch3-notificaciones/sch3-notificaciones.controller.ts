import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DireccionMensaje, EstadoMensajeIntegracion } from '@prisma/client';
import { Sch3NotificacionesService } from './sch3-notificaciones.service';
import { CheckOutDto } from './dto/check-out.dto';
import { CheckInDto } from './dto/check-in.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('SCH-3 Integraciones y Notificaciones')
@Controller('integraciones')
export class Sch3NotificacionesController {
  constructor(private readonly notificacionesService: Sch3NotificacionesService) {}

  @Post('recepcion/check-out')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('X-API-Key')
  @ApiOperation({ summary: 'REC-HOSP-1: Aviso de Check-Out desde Recepción (Idempotente)' })
  @ApiResponse({ status: 202, description: 'Aviso recibido y aceptado para procesamiento' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  @ApiResponse({ status: 409, description: 'Transición no permitida en la habitación' })
  async recibirCheckOut(@Body() dto: CheckOutDto) {
    return this.notificacionesService.procesarCheckOut(dto);
  }

  @Post('recepcion/check-in')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('X-API-Key')
  @ApiOperation({ summary: 'REC-HOSP-2: Aviso de Check-In desde Recepción (Idempotente)' })
  @ApiResponse({ status: 202, description: 'Aviso recibido y aceptado para procesamiento' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  @ApiResponse({ status: 409, description: 'Transición no permitida en la habitación' })
  async recibirCheckIn(@Body() dto: CheckInDto) {
    return this.notificacionesService.procesarCheckIn(dto);
  }

  @Get('mensajes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Consultar bandeja de integración (mensajes entrantes y salientes con acuses)' })
  @ApiQuery({ name: 'direccion', required: false, enum: DireccionMensaje })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoMensajeIntegracion })
  async listarMensajes(
    @Query('direccion') direccion?: DireccionMensaje,
    @Query('estado') estado?: EstadoMensajeIntegracion,
  ) {
    return this.notificacionesService.listarMensajes(direccion, estado);
  }

  @Post('mensajes/:id/reintentar')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Reintentar despacho de mensaje saliente a Reservaciones' })
  async reintentarMensaje(@Param('id') id: string) {
    return this.notificacionesService.reintentarMensaje(id);
  }
}
