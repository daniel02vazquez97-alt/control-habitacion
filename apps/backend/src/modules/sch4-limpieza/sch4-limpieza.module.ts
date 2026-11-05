import { Module } from '@nestjs/common';
import { Sch4LimpiezaService } from './sch4-limpieza.service';
import { Sch4LimpiezaController } from './sch4-limpieza.controller';
import { Sch2InventarioModule } from '../sch2-inventario/sch2-inventario.module';
import { Sch5PersonalModule } from '../sch5-personal/sch5-personal.module';

@Module({
  imports: [Sch2InventarioModule, Sch5PersonalModule],
  controllers: [Sch4LimpiezaController],
  providers: [Sch4LimpiezaService],
  exports: [Sch4LimpiezaService],
})
export class Sch4LimpiezaModule {}
