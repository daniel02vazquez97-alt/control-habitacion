import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PrismaModule } from './common/prisma/prisma.module';
import { HealthController } from './common/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { Sch1TurnoModule } from './modules/sch1-turno/sch1-turno.module';
import { Sch2InventarioModule } from './modules/sch2-inventario/sch2-inventario.module';
import { Sch3NotificacionesModule } from './modules/sch3-notificaciones/sch3-notificaciones.module';
import { Sch4LimpiezaModule } from './modules/sch4-limpieza/sch4-limpieza.module';
import { Sch5PersonalModule } from './modules/sch5-personal/sch5-personal.module';
import { Sch6InspeccionModule } from './modules/sch6-inspeccion/sch6-inspeccion.module';
import { Sch7ReportesModule } from './modules/sch7-reportes/sch7-reportes.module';
import { Sch8DocumentosModule } from './modules/sch8-documentos/sch8-documentos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    Sch1TurnoModule,
    Sch2InventarioModule,
    Sch3NotificacionesModule,
    Sch4LimpiezaModule,
    Sch5PersonalModule,
    Sch6InspeccionModule,
    Sch7ReportesModule,
    Sch8DocumentosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
