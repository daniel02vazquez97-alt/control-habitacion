# ==========================================
# Etapa 1: Build de Vite React
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de compilación para frontend
ARG VITE_API_URL=/api/v1
ARG VITE_DEMO_MODE=true
ARG VITE_BASE_PATH=./

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
ENV VITE_BASE_PATH=$VITE_BASE_PATH

COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/frontend/package.json apps/frontend/tsconfig.json apps/frontend/tsconfig.node.json apps/frontend/vite.config.ts apps/frontend/tailwind.config.js apps/frontend/postcss.config.js apps/frontend/index.html ./apps/frontend/

RUN npm ci

COPY packages/shared/src ./packages/shared/src
COPY apps/frontend/src ./apps/frontend/src

RUN npm --workspace=@control-habitacion/shared run build
WORKDIR /app/apps/frontend
RUN npm run build

# ==========================================
# Etapa 2: Servidor Nginx Ligero
# ==========================================
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
