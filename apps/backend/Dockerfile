# ==========================================
# Etapa 1: Dependencias y Compilación
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias necesarias para compilar módulos nativos si se requieren
RUN apk add --no-cache libc6-compat openssl

# Copiar manifiestos de paquetes del monorepo
COPY package.json tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/backend/package.json apps/backend/tsconfig.json apps/backend/nest-cli.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/

# Instalar todas las dependencias
RUN npm install

# Copiar código fuente
COPY packages/shared/src ./packages/shared/src
COPY apps/backend/src ./apps/backend/src

# Compilar paquetes
RUN npm --workspace=@hospedaje/shared run build
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# ==========================================
# Etapa 2: Runner Ligero para Producción
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl tzdata
ENV TZ=America/Hermosillo
ENV NODE_ENV=production

# Copiar dependencias y artefactos compilados
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

WORKDIR /app/apps/backend

# Script de arranque para migrar automáticamente y lanzar el servidor
COPY apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
