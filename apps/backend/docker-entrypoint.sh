#!/bin/sh
set -e

echo "=== Iniciando Servicio Backend FR08 Hospedaje ==="
echo "Zona horaria configurada: $TZ"

# Aplicar migraciones pendientes de Prisma
echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

# Ejecutar el seed si se pasa la variable RUN_SEED=true
if [ "$RUN_SEED" = "true" ]; then
  echo "Ejecutando seed de base de datos..."
  npm run prisma:seed || echo "Aviso: Seed ya ejecutado o no requerido."
fi

echo "Iniciando servidor NestJS..."
exec node dist/main.js
