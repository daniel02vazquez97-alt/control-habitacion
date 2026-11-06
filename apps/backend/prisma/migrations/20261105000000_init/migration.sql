-- CreateEnum
CREATE TYPE "EstadoHabitacion" AS ENUM ('VACANTE_SUCIA', 'VACANTE_LIMPIA', 'VACANTE_INSPECCIONADA', 'BLOQUEADA', 'OCUPADA');

-- CreateEnum
CREATE TYPE "TipoHabitacion" AS ENUM ('SENCILLA', 'DOBLE', 'SUITE');

-- CreateEnum
CREATE TYPE "RolEmpleado" AS ENUM ('GERENTE', 'SUPERVISOR', 'CAMARISTA', 'AUXILIAR');

-- CreateEnum
CREATE TYPE "TipoLimpieza" AS ENUM ('SALIDA', 'CORRECCION', 'POST_REPARACION');

-- CreateEnum
CREATE TYPE "ResultadoInspeccion" AS ENUM ('APROBADA', 'NO_CUMPLE', 'DANIO');

-- CreateEnum
CREATE TYPE "EstadoExterno" AS ENUM ('DISPONIBLE', 'BLOQUEADA', 'OCUPADA');

-- CreateEnum
CREATE TYPE "TipoReporte" AS ENUM ('INICIAL', 'CAMBIO');

-- CreateEnum
CREATE TYPE "DireccionMensaje" AS ENUM ('ENTRANTE', 'SALIENTE');

-- CreateEnum
CREATE TYPE "InterfaceIntegracion" AS ENUM ('REC_HOSP_1', 'REC_HOSP_2', 'HOSP_RES_1', 'HOSP_RES_2');

-- CreateEnum
CREATE TYPE "EstadoMensajeIntegracion" AS ENUM ('PENDIENTE', 'ENTREGADO', 'FALLIDO', 'PROCESADO');

-- CreateEnum
CREATE TYPE "OrigenBitacora" AS ENUM ('USUARIO', 'RECEPCION', 'SISTEMA');

-- CreateTable
CREATE TABLE "Habitacion" (
    "id" TEXT NOT NULL,
    "noHabitacion" TEXT NOT NULL,
    "tipo" "TipoHabitacion" NOT NULL,
    "piso" INTEGER NOT NULL,
    "estado" "EstadoHabitacion" NOT NULL DEFAULT 'VACANTE_LIMPIA',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitacoraEstado" (
    "id" TEXT NOT NULL,
    "habitacionId" TEXT NOT NULL,
    "estadoAnterior" "EstadoHabitacion" NOT NULL,
    "estadoNuevo" "EstadoHabitacion" NOT NULL,
    "origen" "OrigenBitacora" NOT NULL,
    "usuarioId" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,

    CONSTRAINT "BitacoraEstado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolEmpleado" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpleadoTurno" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,

    CONSTRAINT "EmpleadoTurno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionLimpieza" (
    "id" TEXT NOT NULL,
    "habitacionId" TEXT NOT NULL,
    "camaristaId" TEXT NOT NULL,
    "auxiliarId" TEXT NOT NULL,
    "limpiezaTerminada" BOOLEAN NOT NULL DEFAULT false,
    "reposicionTerminada" BOOLEAN NOT NULL DEFAULT false,
    "tipo" "TipoLimpieza" NOT NULL DEFAULT 'SALIDA',
    "detallesCorreccion" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadaEn" TIMESTAMP(3),

    CONSTRAINT "AsignacionLimpieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspeccion" (
    "id" TEXT NOT NULL,
    "habitacionId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "puntos" JSONB NOT NULL,
    "hayDanio" BOOLEAN NOT NULL DEFAULT false,
    "descripcionDanio" TEXT,
    "cumpleEstandar" BOOLEAN NOT NULL DEFAULT true,
    "resultado" "ResultadoInspeccion" NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reparacion" (
    "id" TEXT NOT NULL,
    "habitacionId" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "confirmadaPor" TEXT,
    "confirmadaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReporteEstado" (
    "id" TEXT NOT NULL,
    "noReporte" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "consecutivo" INTEGER NOT NULL,
    "habitacionId" TEXT,
    "tipo" "TipoReporte" NOT NULL DEFAULT 'CAMBIO',
    "estadoExterno" "EstadoExterno" NOT NULL,
    "observaciones" TEXT,
    "supervisorId" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfPath" TEXT,

    CONSTRAINT "ReporteEstado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeIntegracion" (
    "id" TEXT NOT NULL,
    "idMensaje" TEXT NOT NULL,
    "direccion" "DireccionMensaje" NOT NULL,
    "interface" "InterfaceIntegracion" NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" "EstadoMensajeIntegracion" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimoError" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeIntegracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Habitacion_noHabitacion_key" ON "Habitacion"("noHabitacion");

-- CreateIndex
CREATE INDEX "Habitacion_estado_idx" ON "Habitacion"("estado");

-- CreateIndex
CREATE INDEX "Habitacion_piso_idx" ON "Habitacion"("piso");

-- CreateIndex
CREATE INDEX "BitacoraEstado_habitacionId_idx" ON "BitacoraEstado"("habitacionId");

-- CreateIndex
CREATE INDEX "BitacoraEstado_fechaHora_idx" ON "BitacoraEstado"("fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_email_key" ON "Empleado"("email");

-- CreateIndex
CREATE INDEX "Turno_fecha_idx" ON "Turno"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "EmpleadoTurno_empleadoId_turnoId_key" ON "EmpleadoTurno"("empleadoId", "turnoId");

-- CreateIndex
CREATE INDEX "AsignacionLimpieza_habitacionId_idx" ON "AsignacionLimpieza"("habitacionId");

-- CreateIndex
CREATE INDEX "AsignacionLimpieza_camaristaId_idx" ON "AsignacionLimpieza"("camaristaId");

-- CreateIndex
CREATE INDEX "AsignacionLimpieza_auxiliarId_idx" ON "AsignacionLimpieza"("auxiliarId");

-- CreateIndex
CREATE INDEX "Inspeccion_habitacionId_idx" ON "Inspeccion"("habitacionId");

-- CreateIndex
CREATE INDEX "Inspeccion_supervisorId_idx" ON "Inspeccion"("supervisorId");

-- CreateIndex
CREATE INDEX "Inspeccion_fechaHora_idx" ON "Inspeccion"("fechaHora");

-- CreateIndex
CREATE INDEX "Reparacion_habitacionId_idx" ON "Reparacion"("habitacionId");

-- CreateIndex
CREATE INDEX "Reparacion_inspeccionId_idx" ON "Reparacion"("inspeccionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReporteEstado_noReporte_key" ON "ReporteEstado"("noReporte");

-- CreateIndex
CREATE INDEX "ReporteEstado_noReporte_idx" ON "ReporteEstado"("noReporte");

-- CreateIndex
CREATE INDEX "ReporteEstado_fechaHora_idx" ON "ReporteEstado"("fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "ReporteEstado_anio_consecutivo_key" ON "ReporteEstado"("anio", "consecutivo");

-- CreateIndex
CREATE UNIQUE INDEX "MensajeIntegracion_idMensaje_key" ON "MensajeIntegracion"("idMensaje");

-- CreateIndex
CREATE INDEX "MensajeIntegracion_idMensaje_idx" ON "MensajeIntegracion"("idMensaje");

-- CreateIndex
CREATE INDEX "MensajeIntegracion_estado_idx" ON "MensajeIntegracion"("estado");

-- CreateIndex
CREATE INDEX "MensajeIntegracion_direccion_idx" ON "MensajeIntegracion"("direccion");

-- AddForeignKey
ALTER TABLE "BitacoraEstado" ADD CONSTRAINT "BitacoraEstado_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraEstado" ADD CONSTRAINT "BitacoraEstado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpleadoTurno" ADD CONSTRAINT "EmpleadoTurno_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpleadoTurno" ADD CONSTRAINT "EmpleadoTurno_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionLimpieza" ADD CONSTRAINT "AsignacionLimpieza_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionLimpieza" ADD CONSTRAINT "AsignacionLimpieza_camaristaId_fkey" FOREIGN KEY ("camaristaId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionLimpieza" ADD CONSTRAINT "AsignacionLimpieza_auxiliarId_fkey" FOREIGN KEY ("auxiliarId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspeccion" ADD CONSTRAINT "Inspeccion_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspeccion" ADD CONSTRAINT "Inspeccion_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparacion" ADD CONSTRAINT "Reparacion_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparacion" ADD CONSTRAINT "Reparacion_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparacion" ADD CONSTRAINT "Reparacion_confirmadaPor_fkey" FOREIGN KEY ("confirmadaPor") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteEstado" ADD CONSTRAINT "ReporteEstado_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteEstado" ADD CONSTRAINT "ReporteEstado_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
