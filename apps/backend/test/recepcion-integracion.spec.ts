import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Pruebas de Integración — Endpoints de Recepción (REC-HOSP-1 y REC-HOSP-2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const API_KEY = process.env.RECEPCION_API_KEY || 'demo-recepcion-key';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Autenticación y Seguridad con X-API-Key', () => {
    it('debe rechazar con 401 Unauthorized si no se envía la cabecera X-API-Key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integraciones/recepcion/check-out')
        .send({
          idMensaje: '11111111-1111-4111-8111-111111111111',
          noHabitacion: '101',
          fechaHoraSalida: new Date().toISOString(),
        })
        .expect(401);
    });

    it('debe rechazar con 401 Unauthorized si la cabecera X-API-Key es errónea', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integraciones/recepcion/check-out')
        .set('X-API-Key', 'llave-invalida')
        .send({
          idMensaje: '11111111-1111-4111-8111-111111111111',
          noHabitacion: '101',
          fechaHoraSalida: new Date().toISOString(),
        })
        .expect(401);
    });
  });

  describe('REC-HOSP-1 Check-out e Idempotencia', () => {
    const idMensaje = '22222222-2222-4222-8222-222222222222';

    it('debe aceptar el check-out con 202 Accepted y responder con el acuse de recibo', async () => {
      // Nos aseguramos que la habitación 101 exista y esté OCUPADA para la prueba
      await prisma.habitacion.upsert({
        where: { noHabitacion: '101' },
        create: {
          noHabitacion: '101',
          piso: 1,
          tipo: 'SENCILLA',
          estado: 'OCUPADA',
        },
        update: { estado: 'OCUPADA' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/integraciones/recepcion/check-out')
        .set('X-API-Key', API_KEY)
        .send({
          idMensaje,
          noHabitacion: '101',
          fechaHoraSalida: '2026-11-05T11:00:00Z',
          observaciones: 'Salida express',
        })
        .expect(202);

      expect(res.body).toHaveProperty('acuse');
      expect(res.body.acuse.idMensaje).toBe(idMensaje);
      expect(res.body.acuse).toHaveProperty('recibido');

      // Verificar que en base de datos pasó a VACANTE_SUCIA
      const hab = await prisma.habitacion.findUnique({ where: { noHabitacion: '101' } });
      expect(hab?.estado).toBe('VACANTE_SUCIA');
    });

    it('debe ser idempotente: el mismo idMensaje responde 202 sin re-ejecutar error de transición', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integraciones/recepcion/check-out')
        .set('X-API-Key', API_KEY)
        .send({
          idMensaje, // Mismo ID
          noHabitacion: '101',
          fechaHoraSalida: '2026-11-05T11:00:00Z',
        })
        .expect(202);

      expect(res.body.acuse.idMensaje).toBe(idMensaje);
    });
  });

  describe('REC-HOSP-2 Check-in e Idempotencia', () => {
    const idMensajeCheckIn = '33333333-3333-4333-8333-333333333333';

    it('debe aceptar el check-in con 202 Accepted y transicionar a OCUPADA', async () => {
      // Dejamos la habitación 104 en VACANTE_INSPECCIONADA
      await prisma.habitacion.upsert({
        where: { noHabitacion: '104' },
        create: {
          noHabitacion: '104',
          piso: 1,
          tipo: 'SENCILLA',
          estado: 'VACANTE_INSPECCIONADA',
        },
        update: { estado: 'VACANTE_INSPECCIONADA' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/integraciones/recepcion/check-in')
        .set('X-API-Key', API_KEY)
        .send({
          idMensaje: idMensajeCheckIn,
          noHabitacion: '104',
          huesped: 'Mariana Duarte',
          fechaEntrada: '2026-11-05',
          fechaSalida: '2026-11-08',
        })
        .expect(202);

      expect(res.body).toHaveProperty('acuse');
      expect(res.body.acuse.idMensaje).toBe(idMensajeCheckIn);

      const hab = await prisma.habitacion.findUnique({ where: { noHabitacion: '104' } });
      expect(hab?.estado).toBe('OCUPADA');
    });
  });
});
