-- AlterEnum
ALTER TYPE "InterfaceIntegracion" ADD VALUE 'RES_HOSP_1';

-- CreateEnum
CREATE TYPE "EstadoReservacion" AS ENUM ('CONFIRMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Reservacion" (
    "id" TEXT NOT NULL,
    "folioReserva" TEXT NOT NULL,
    "habitacionId" TEXT NOT NULL,
    "fechaEntrada" DATE NOT NULL,
    "fechaSalida" DATE NOT NULL,
    "huesped" TEXT,
    "numeroPersonas" INTEGER,
    "estado" "EstadoReservacion" NOT NULL DEFAULT 'CONFIRMADA',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservacion_folioReserva_key" ON "Reservacion"("folioReserva");

-- CreateIndex
CREATE INDEX "Reservacion_habitacionId_idx" ON "Reservacion"("habitacionId");

-- CreateIndex
CREATE INDEX "Reservacion_fechaEntrada_fechaSalida_idx" ON "Reservacion"("fechaEntrada", "fechaSalida");

-- AddForeignKey
ALTER TABLE "Reservacion" ADD CONSTRAINT "Reservacion_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
