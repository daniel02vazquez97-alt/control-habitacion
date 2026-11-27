import {
  PrismaClient,
  RolEmpleado,
  TipoHabitacion,
  EstadoHabitacion,
  TipoLimpieza,
  ResultadoInspeccion,
  OrigenBitacora,
  EstadoExterno,
  TipoReporte,
  EstadoReservacion,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    throw new Error(
      'La variable de entorno SEED_DEMO_PASSWORD no está definida. Por favor configúrala antes de ejecutar el seed.',
    );
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

  console.log('--- Iniciando Seed del Sistema FR08 Control de Habitación ---');

  // 0. Protección: no borrar datos existentes salvo que se fuerce con SEED_FORCE=true.
  //    En Render el contenedor se reinicia con frecuencia y RUN_SEED=true se ejecuta en cada arranque.
  const empleadosExistentes = await prisma.empleado.count();
  if (empleadosExistentes > 0 && process.env.SEED_FORCE !== 'true') {
    console.log(
      `La base de datos ya tiene ${empleadosExistentes} empleados. Seed omitido (usa SEED_FORCE=true para reiniciar los datos de demo).`,
    );
    return;
  }

  // 1. Limpieza de base de datos
  await prisma.reservacion.deleteMany();
  await prisma.mensajeIntegracion.deleteMany();
  await prisma.reporteEstado.deleteMany();
  await prisma.reparacion.deleteMany();
  await prisma.inspeccion.deleteMany();
  await prisma.asignacionLimpieza.deleteMany();
  await prisma.bitacoraEstado.deleteMany();
  await prisma.habitacion.deleteMany();
  await prisma.empleadoTurno.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.empleado.deleteMany();

  // 2. Crear Usuarios por cada Rol
  const gerente = await prisma.empleado.create({
    data: {
      nombre: 'Lic. Sofía Morales',
      email: 'gerente@resort.com',
      passwordHash,
      rol: RolEmpleado.GERENTE,
      activo: true,
    },
  });

  const supervisor = await prisma.empleado.create({
    data: {
      nombre: 'Roberto Peña',
      email: 'supervisor@resort.com',
      passwordHash,
      rol: RolEmpleado.SUPERVISOR,
      activo: true,
    },
  });

  const camarista = await prisma.empleado.create({
    data: {
      nombre: 'María Sánchez',
      email: 'camarista@resort.com',
      passwordHash,
      rol: RolEmpleado.CAMARISTA,
      activo: true,
    },
  });

  const auxiliar = await prisma.empleado.create({
    data: {
      nombre: 'Juan Domínguez',
      email: 'auxiliar@resort.com',
      passwordHash,
      rol: RolEmpleado.AUXILIAR,
      activo: true,
    },
  });

  console.log('✔ Usuarios creados (Gerente, Supervisor, Camarista, Auxiliar).');

  // 3. Crear Turno del día y registrar a todo el personal como activo
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const turnoActual = await prisma.turno.create({
    data: {
      fecha: hoy,
      horaInicio: '07:00',
      horaFin: '15:00',
      empleados: {
        create: [
          { empleadoId: gerente.id },
          { empleadoId: supervisor.id },
          { empleadoId: camarista.id },
          { empleadoId: auxiliar.id },
        ],
      },
    },
  });

  console.log('✔ Turno activo creado (07:00 - 15:00) con personal asignado.');

  // 4. Sembrar 20 Habitaciones (Pisos 1 y 2, variados tipos y estados)
  const habitacionesData = [
    // Piso 1
    { no: '101', tipo: TipoHabitacion.SENCILLA, piso: 1, estado: EstadoHabitacion.OCUPADA },
    { no: '102', tipo: TipoHabitacion.SENCILLA, piso: 1, estado: EstadoHabitacion.VACANTE_SUCIA },
    { no: '103', tipo: TipoHabitacion.SENCILLA, piso: 1, estado: EstadoHabitacion.VACANTE_LIMPIA },
    { no: '104', tipo: TipoHabitacion.SENCILLA, piso: 1, estado: EstadoHabitacion.VACANTE_INSPECCIONADA },
    { no: '105', tipo: TipoHabitacion.DOBLE, piso: 1, estado: EstadoHabitacion.OCUPADA },
    { no: '106', tipo: TipoHabitacion.DOBLE, piso: 1, estado: EstadoHabitacion.VACANTE_SUCIA },
    { no: '107', tipo: TipoHabitacion.DOBLE, piso: 1, estado: EstadoHabitacion.VACANTE_LIMPIA },
    { no: '108', tipo: TipoHabitacion.DOBLE, piso: 1, estado: EstadoHabitacion.VACANTE_INSPECCIONADA },
    { no: '109', tipo: TipoHabitacion.SUITE, piso: 1, estado: EstadoHabitacion.BLOQUEADA },
    { no: '110', tipo: TipoHabitacion.SUITE, piso: 1, estado: EstadoHabitacion.VACANTE_INSPECCIONADA },
    // Piso 2
    { no: '201', tipo: TipoHabitacion.SENCILLA, piso: 2, estado: EstadoHabitacion.OCUPADA },
    { no: '202', tipo: TipoHabitacion.SENCILLA, piso: 2, estado: EstadoHabitacion.VACANTE_SUCIA },
    { no: '203', tipo: TipoHabitacion.SENCILLA, piso: 2, estado: EstadoHabitacion.VACANTE_LIMPIA },
    { no: '204', tipo: TipoHabitacion.SENCILLA, piso: 2, estado: EstadoHabitacion.VACANTE_INSPECCIONADA },
    { no: '205', tipo: TipoHabitacion.DOBLE, piso: 2, estado: EstadoHabitacion.OCUPADA },
    { no: '206', tipo: TipoHabitacion.DOBLE, piso: 2, estado: EstadoHabitacion.BLOQUEADA },
    { no: '207', tipo: TipoHabitacion.DOBLE, piso: 2, estado: EstadoHabitacion.VACANTE_LIMPIA },
    { no: '208', tipo: TipoHabitacion.DOBLE, piso: 2, estado: EstadoHabitacion.VACANTE_INSPECCIONADA },
    { no: '209', tipo: TipoHabitacion.SUITE, piso: 2, estado: EstadoHabitacion.OCUPADA },
    { no: '210', tipo: TipoHabitacion.SUITE, piso: 2, estado: EstadoHabitacion.VACANTE_INSPECCIONADA },
  ];

  for (const item of habitacionesData) {
    const habitacion = await prisma.habitacion.create({
      data: {
        noHabitacion: item.no,
        tipo: item.tipo,
        piso: item.piso,
        estado: item.estado,
      },
    });

    // Bitácora inicial
    await prisma.bitacoraEstado.create({
      data: {
        habitacionId: habitacion.id,
        estadoAnterior: item.estado,
        estadoNuevo: item.estado,
        origen: OrigenBitacora.SISTEMA,
        fechaHora: new Date(),
        nota: 'Estado inicial cargado por seed del sistema.',
      },
    });

    // Caso de demostración para habitación 106: Asignación de limpieza en progreso
    if (item.no === '106') {
      await prisma.asignacionLimpieza.create({
        data: {
          habitacionId: habitacion.id,
          camaristaId: camarista.id,
          auxiliarId: auxiliar.id,
          limpiezaTerminada: false,
          reposicionTerminada: false,
          tipo: TipoLimpieza.SALIDA,
        },
      });
    }

    // Habitaciones bloqueadas (109 y 206): daño registrado en inspección con su reparación pendiente
    if (item.estado === EstadoHabitacion.BLOQUEADA) {
      const puntosInspeccionDanio = [
        { numero: 1, descripcion: 'Cama tendida con ropa limpia', cumple: true, observacion: 'Correcto' },
        { numero: 2, descripcion: 'Toallas limpias y completas', cumple: true, observacion: 'Correcto' },
        { numero: 3, descripcion: 'Baño limpio y desinfectado', cumple: true, observacion: 'Correcto' },
        { numero: 4, descripcion: 'Pisos y alfombras limpios', cumple: true, observacion: 'Correcto' },
        { numero: 5, descripcion: 'Amenidades y suministros completos', cumple: true, observacion: 'Correcto' },
        { numero: 6, descripcion: 'Mobiliario en buen estado', cumple: true, observacion: 'Correcto' },
        { numero: 7, descripcion: 'Luces, A/C y TV funcionando', cumple: false, observacion: 'Fuga de agua en minisplit y TV sin encender' },
        { numero: 8, descripcion: 'Sin objetos olvidados', cumple: true, observacion: 'Correcto' },
      ];

      const inspeccionDanio = await prisma.inspeccion.create({
        data: {
          habitacionId: habitacion.id,
          supervisorId: supervisor.id,
          puntos: puntosInspeccionDanio,
          hayDanio: true,
          descripcionDanio: 'Fuga persistente en minisplit de recámara principal y control de TV averiado.',
          cumpleEstandar: false,
          resultado: ResultadoInspeccion.DANIO,
        },
      });

      await prisma.reparacion.create({
        data: {
          habitacionId: habitacion.id,
          inspeccionId: inspeccionDanio.id,
          descripcion: 'Reparación de condensador y reemplazo de tarjeta electrónica en A/C.',
        },
      });
    }
  }

  // 4b. Reservaciones de demostración recibidas de Gestión de Reservas
  const diaUTC = (dias: number) => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + dias));
  };
  const reservacionesDemo = [
    { folio: 'RES-DEMO-0001', no: '201', entrada: -1, salida: 2, huesped: 'Mariana Ochoa', personas: 2, estado: EstadoReservacion.EN_CURSO },
    { folio: 'RES-DEMO-0002', no: '104', entrada: 3, salida: 6, huesped: 'Luis Arvizu', personas: 1, estado: EstadoReservacion.CONFIRMADA },
    { folio: 'RES-DEMO-0003', no: '208', entrada: 1, salida: 4, huesped: 'Familia Robles', personas: 4, estado: EstadoReservacion.CONFIRMADA },
    { folio: 'RES-DEMO-0004', no: '210', entrada: 7, salida: 10, huesped: 'Sofía Bracamontes', personas: 3, estado: EstadoReservacion.CONFIRMADA },
  ];
  for (const r of reservacionesDemo) {
    const hab = await prisma.habitacion.findUnique({ where: { noHabitacion: r.no } });
    if (!hab) continue;
    await prisma.reservacion.create({
      data: {
        folioReserva: r.folio,
        habitacionId: hab.id,
        fechaEntrada: diaUTC(r.entrada),
        fechaSalida: diaUTC(r.salida),
        huesped: r.huesped,
        numeroPersonas: r.personas,
        estado: r.estado,
      },
    });
  }
  console.log(`✔ ${reservacionesDemo.length} reservaciones de demostración creadas.`);

  // 5. Crear Reporte Inicial de demostración FR08-03
  const anio = hoy.getFullYear();
  await prisma.reporteEstado.create({
    data: {
      noReporte: `FR08-03-${anio}-0001`,
      anio,
      consecutivo: 1,
      tipo: TipoReporte.INICIAL,
      estadoExterno: EstadoExterno.DISPONIBLE,
      observaciones: 'Reporte inicial automático al comienzo del turno 07:00.',
      supervisorId: supervisor.id,
      fechaHora: new Date(),
    },
  });

  console.log('✔ 20 habitaciones sembradas con bitácora, asignación demo y reporte inicial.');
  console.log('--- Seed completado exitosamente ---');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
