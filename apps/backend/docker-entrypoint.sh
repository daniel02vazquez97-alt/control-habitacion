#!/bin/sh
set -e

echo "=== Iniciando Servicio Backend FR08 Control de Habitación ==="
echo "Zona horaria configurada: $TZ"

# Aplicar migraciones pendientes de Prisma
echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

# Ejecutar el seed si se pasa la variable RUN_SEED=true
if [ "$RUN_SEED" = "true" ]; then
  echo "Ejecutando seed de base de datos..."
  npx ts-node --transpile-only prisma/seed.ts || echo "Aviso: el seed falló; el servidor arrancará de todos modos."
fi

echo "Iniciando servidor NestJS..."
exec node dist/main.js
