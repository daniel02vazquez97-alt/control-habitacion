# FR08 — Control de Habitación · Resort

> Sistema de gestión del ciclo de vida de habitaciones para el área de Control de Habitación de un resort. Implementa el flujo normativo FR08 completo: programación de turno, inventario con máquina de estados, asignación y seguimiento de limpieza, inspección (FR08-02), reportes de estado (FR08-03) y generación de documentos PDF.

[![CI](https://github.com/daniel02vazquez97-alt/control-habitacion/actions/workflows/ci.yml/badge.svg)](https://github.com/daniel02vazquez97-alt/control-habitacion/actions/workflows/ci.yml)
[![Deploy](https://github.com/daniel02vazquez97-alt/control-habitacion/actions/workflows/deploy.yml/badge.svg)](https://github.com/daniel02vazquez97-alt/control-habitacion/actions/workflows/deploy.yml)

---

## Tabla de contenidos

1. [Arquitectura](#1-arquitectura)
2. [Requisitos previos](#2-requisitos-previos)
3. [Ejecución local sin Docker](#3-ejecución-local-sin-docker)
4. [Ejecución local con Docker](#4-ejecución-local-con-docker)
5. [Configuración de entornos y secretos](#5-configuración-de-entornos-y-secretos)
   - 5.1 [Variables de entorno del backend](#51-variables-de-entorno-del-backend)
   - 5.2 [Variables de entorno del frontend](#52-variables-de-entorno-del-frontend)
   - 5.3 [GitHub Actions — Secrets y Variables](#53-github-actions--secrets-y-variables)
   - 5.4 [GitHub Pages](#54-github-pages)
   - 5.5 [GitHub Container Registry (GHCR)](#55-github-container-registry-ghcr)
   - 5.6 [Render (backend en la nube)](#56-render-backend-en-la-nube)
   - 5.7 [Base de datos gratuita: Neon o Supabase](#57-base-de-datos-gratuita-neon-o-supabase)
6. [Estructura del repositorio](#6-estructura-del-repositorio)
7. [Servicios del backend (SCH-1 … SCH-8)](#7-servicios-del-backend-sch-1--sch-8)
8. [Máquina de estados de habitación](#8-máquina-de-estados-de-habitación)
9. [Contratos de integración](#9-contratos-de-integración)
   - 9.1 [Mensajes entrantes — Recepción → Control de Habitación](#91-mensajes-entrantes--recepción--control-de-habitación)
   - 9.2 [Mensajes salientes — Control de Habitación → Reservaciones](#92-mensajes-salientes--control-de-habitación--reservaciones)
10. [Usuarios de demostración](#10-usuarios-de-demostración)
11. [Guion de demo — 5 minutos](#11-guion-de-demo--5-minutos)
12. [Pruebas](#12-pruebas)
13. [CI/CD — Pipeline completo](#13-cicd--pipeline-completo)
14. [FAQ y problemas comunes](#14-faq-y-problemas-comunes)

---

## 1. Arquitectura

```
monorepo/
├── packages/shared          → Enums, constantes y DTOs compartidos
├── apps/backend             → API NestJS (8 módulos SCH-1…SCH-8)
└── apps/frontend            → SPA React 18 + Vite + Tailwind CSS
```

El backend expone una API REST versionada en `/api/v1` con documentación Swagger en `/api/docs`.
El frontend es una SPA con HashRouter desplegable en GitHub Pages sin servidor.

Para el diagrama completo de componentes y flujos de integración consulta [`docs/arquitectura.md`](docs/arquitectura.md).

---

## 2. Requisitos previos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| Node.js | 20 LTS | Backend y frontend |
| npm | 10 | Gestión de workspaces |
| PostgreSQL | 16 | Base de datos (solo sin Docker) |
| Docker + Compose | 24 / 2.24 | Ejecución con contenedores |
| Git | 2.40 | Control de versiones |

---

## 3. Ejecución local sin Docker

### 3.1 Clonar y configurar variables de entorno

```bash
git clone https://github.com/daniel02vazquez97-alt/control-habitacion.git
cd control-habitacion

# Copiar plantillas de variables de entorno
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Edita `apps/backend/.env` y completa al menos:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/control_habitacion?schema=public"
JWT_SECRET="cambia-esto-por-un-secreto-largo-y-aleatorio"
JWT_REFRESH_SECRET="otro-secreto-distinto-para-refresh"
RECEPCION_API_KEY="clave-api-para-recepcion"
SEED_DEMO_PASSWORD="DemoPass2026!"
```

### 3.2 Instalar dependencias

```bash
npm install
```

> Instala las dependencias de los tres workspaces (`shared`, `backend`, `frontend`) en un solo paso.

### 3.3 Generar la migración inicial de base de datos

> **Solo la primera vez.** Requiere que PostgreSQL 16 esté en ejecución y que `DATABASE_URL` apunte a él.

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

Esto crea el directorio `apps/backend/prisma/migrations/` con el SQL de la estructura inicial. Haz commit de esos archivos:

```bash
git add apps/backend/prisma/migrations/
git commit -m "feat: primera migracion de base de datos prisma"
```

### 3.4 Cargar datos de demostración (seed)

```bash
cd apps/backend
SEED_DEMO_PASSWORD=DemoPass2026! npx ts-node prisma/seed.ts
cd ../..
```

El seed crea:
- 20 habitaciones distribuidas en 4 pisos
- 1 usuario por cada rol: gerente, supervisor, camarista, auxiliar, recepcion
- Un turno del día actual

### 3.5 Ejecutar en modo desarrollo

```bash
# Desde la raíz del monorepo — levanta backend y frontend en paralelo
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/api/docs |
| Health check | http://localhost:3000/health |

---

## 4. Ejecución local con Docker

```bash
cp .env.example .env
# Edita .env si quieres cambiar contraseñas o puertos
docker compose up --build
```

| Servicio | URL |
|---|---|
| Frontend (Nginx) | http://localhost:8080 |
| Backend API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/api/docs |
| PostgreSQL | localhost:5432 |

El contenedor del backend ejecuta automáticamente `prisma migrate deploy` al arrancar.
Para cargar el seed la primera vez:

```bash
docker compose exec backend sh -c "SEED_DEMO_PASSWORD=DemoPass2026! npx ts-node prisma/seed.ts"
```

Para detener y limpiar volúmenes:

```bash
docker compose down -v
```

---

## 5. Configuración de entornos y secretos

### 5.1 Variables de entorno del backend

Archivo: `apps/backend/.env` (nunca subas este archivo al repositorio).

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto para firmar access tokens | Cadena aleatoria ≥ 32 caracteres |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens | Cadena distinta al anterior |
| `JWT_EXPIRES_IN` | Duración del access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token | `7d` |
| `RECEPCION_API_KEY` | API Key que debe enviar Recepción en `X-API-Key` | Cadena aleatoria |
| `RESERVACIONES_WEBHOOK_URL` | URL del webhook destino de Reservaciones | `https://res.resort.com/webhook` |
| `RESERVACIONES_WEBHOOK_SECRET` | Secreto HMAC-SHA256 para firmar webhook | Cadena aleatoria |
| `CORS_ORIGIN` | Origen permitido (URL del frontend) | `https://tu-usuario.github.io` |
| `PORT` | Puerto del servidor | `3000` |
| `TZ` | Zona horaria del cron | `America/Hermosillo` |
| `TURNO_CRON` | Expresión cron del turno | `0 7 * * *` |
| `SEED_DEMO_PASSWORD` | Contraseña de los usuarios de demo | `DemoPass2026!` |

### 5.2 Variables de entorno del frontend

Archivo: `apps/frontend/.env`.

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base del backend | `http://localhost:3000/api/v1` |
| `VITE_DEMO_MODE` | Activa el simulador de Recepción en la UI | `true` |
| `VITE_BASE_PATH` | Ruta base del sitio (GitHub Pages) | `/control-habitacion/` |

### 5.3 GitHub Actions — Secrets y Variables

En tu repositorio: **Settings → Secrets and variables → Actions**.

**Secrets** (cifrados, solo para valores sensibles):

| Nombre | Valor |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | URL del deploy hook de Render (incluye el token) |

**Variables** (visibles en logs, solo para valores no sensibles):

| Nombre | Valor |
|---|---|
| `VITE_API_URL` | URL del backend en Render, ej: `https://control-habitacion-backend.onrender.com/api/v1` |
| `VITE_DEMO_MODE` | `true` |

> Las variables `JWT_SECRET`, `RECEPCION_API_KEY`, etc. se configuran directamente en el panel de Render, **no** en GitHub Actions.

### 5.4 GitHub Pages

1. Entra a **Settings → Pages** de tu repositorio.
2. En **Source**, selecciona **"GitHub Actions"**.
3. Haz push a `main`. El workflow `deploy.yml` construirá el frontend y lo publicará.
4. La URL del sitio será `https://TU_USUARIO.github.io/control-habitacion/`.
5. Actualiza la variable `VITE_API_URL` en GitHub Actions con la URL del backend en Render.

### 5.5 GitHub Container Registry (GHCR)

El workflow publica automáticamente la imagen del backend en GHCR.
No requiere configuración adicional: usa el token `GITHUB_TOKEN` que GitHub Actions provee automáticamente.

La imagen queda disponible en:
```
ghcr.io/daniel02vazquez97-alt/control-habitacion-backend:latest
ghcr.io/daniel02vazquez97-alt/control-habitacion-backend:<SHA_COMMIT>
```

### 5.6 Render (backend en la nube)

El archivo `render.yaml` define el servicio web y la base de datos PostgreSQL.

**Pasos:**
1. Crea una cuenta en [render.com](https://render.com).
2. Haz clic en **"New Blueprint"** y conecta tu repositorio de GitHub.
3. Render detectará `render.yaml` automáticamente y creará el servicio y la BD.
4. En el servicio web, en **Environment**, agrega las variables sensibles:

   | Variable | Valor |
   |---|---|
   | `JWT_SECRET` | Cadena aleatoria segura |
   | `JWT_REFRESH_SECRET` | Otra cadena aleatoria |
   | `RECEPCION_API_KEY` | Clave para Recepción |
   | `RESERVACIONES_WEBHOOK_URL` | URL del webhook de Reservaciones (opcional) |
   | `RESERVACIONES_WEBHOOK_SECRET` | Secreto HMAC (opcional) |
   | `CORS_ORIGIN` | URL del frontend en GitHub Pages |
   | `SEED_DEMO_PASSWORD` | `DemoPass2026!` |

5. Copia la **Deploy Hook URL** de Render (en Settings del servicio) y agrégala como secret `RENDER_DEPLOY_HOOK_URL` en GitHub Actions.

### 5.7 Base de datos gratuita: Neon o Supabase

Si no quieres usar la base de datos de Render (plan de pago), puedes usar una base gratuita:

**Neon (recomendado):**
1. Crea un proyecto en [neon.tech](https://neon.tech) (plan gratuito disponible).
2. Copia la connection string del dashboard.
3. Úsala como `DATABASE_URL` en Render.

**Supabase:**
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **Settings → Database → Connection string** y elige el modo **Transaction**.
3. Úsala como `DATABASE_URL` en Render.

---

## 6. Estructura del repositorio

```
control-habitacion/
├── .github/
│   └── workflows/
│       ├── ci.yml              ← Lint, typecheck, tests en cada PR
│       └── deploy.yml          ← Deploy a GitHub Pages, GHCR y Render
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma   ← Modelos de datos
│   │   │   ├── seed.ts         ← Datos de demostración
│   │   │   └── migrations/     ← Generadas con `prisma migrate dev`
│   │   ├── src/
│   │   │   ├── common/         ← Filtros, interceptores, guards, decoradores
│   │   │   └── modules/
│   │   │       ├── auth/       ← JWT access + refresh tokens
│   │   │       ├── sch1-turno/         ← Programación de turno (cron)
│   │   │       ├── sch2-inventario/    ← Máquina de estados
│   │   │       ├── sch3-notificaciones/← Webhook entrante/saliente
│   │   │       ├── sch4-limpieza/      ← Asignación y seguimiento
│   │   │       ├── sch5-personal/      ← CRUD empleados y turnos
│   │   │       ├── sch6-inspeccion/    ← FR08-02
│   │   │       ├── sch7-reportes/      ← FR08-03, métricas
│   │   │       └── sch8-documentos/    ← Generación de PDF
│   │   ├── test/               ← Pruebas de integración
│   │   ├── Dockerfile
│   │   └── docker-entrypoint.sh
│   └── frontend/
│       ├── src/
│       │   ├── api/            ← Cliente fetch + endpoints
│       │   ├── components/     ← BadgeEstado, Modal, Navbar, layouts, FR08-01
│       │   ├── context/        ← AuthContext (JWT + roles)
│       │   └── pages/          ← Login, Tablero, Supervisor, MisTareas, Gerente, Integraciones
│       ├── test/               ← Pruebas de componentes (Vitest)
│       ├── Dockerfile
│       └── nginx.conf
├── packages/
│   └── shared/
│       └── src/
│           ├── constants/
│           │   ├── mapeo-estados.ts    ← Mapeo estados internos↔externos (archivo único)
│           │   └── inspeccion-puntos.ts← 8 puntos de inspección FR08-02
│           ├── enums/                  ← Todos los enums del dominio
│           └── interfaces/             ← DTOs e interfaces compartidas
├── docs/
│   └── arquitectura.md         ← Diagramas Mermaid y contratos detallados
├── docker-compose.yml
├── render.yaml
├── .env.example
└── README.md                   ← Este archivo
```

---

## 7. Servicios del backend (SCH-1 … SCH-8)

| Servicio | Nombre | Responsabilidad |
|---|---|---|
| SCH-1 | Turno | Cron `0 7 * * *` que inicia el turno, actualiza estados y genera reporte FR08-03 inicial |
| SCH-2 | Inventario | Máquina de estados transaccional con bitácora inmutable; valida transiciones según tabla de `mapeo-estados.ts` |
| SCH-3 | Notificaciones | Recepción de mensajes de Recepción (idempotente por `idMensaje`); envío de webhooks a Reservaciones con firma HMAC-SHA256 y reintentos exponenciales |
| SCH-4 | Limpieza | Asignación de camarista + auxiliar, seguimiento paralelo, reporte de habitación limpia |
| SCH-5 | Personal | CRUD de empleados, asignación a turnos, listado por rol |
| SCH-6 | Inspección | Formulario FR08-02 con 8 puntos; tres bifurcaciones: aprobada → VACANTE_INSPECCIONADA, no cumple → VACANTE_SUCIA (nueva asignación), daño → BLOQUEADA |
| SCH-7 | Reportes | Generación del reporte FR08-03 con consecutivo anual; listener de eventos `estado.cambiado`; resumen de ocupación |
| SCH-8 | Documentos | Generación de PDF del FR08-03 y FR08-02 con pdfkit; endpoint de descarga |

---

## 8. Máquina de estados de habitación

El mapeo completo reside en un único archivo configurable:
[`packages/shared/src/constants/mapeo-estados.ts`](packages/shared/src/constants/mapeo-estados.ts)

### Estados internos y su equivalente externo

| Estado interno | Estado externo (Recepción / Reservaciones) |
|---|---|
| `OCUPADA` | `OCUPADA` |
| `VACANTE_SUCIA` | `NO_DISPONIBLE` |
| `EN_LIMPIEZA` | `NO_DISPONIBLE` |
| `VACANTE_LIMPIA` | `NO_DISPONIBLE` |
| `VACANTE_INSPECCIONADA` | `DISPONIBLE` |
| `BLOQUEADA` | `BLOQUEADA` |

### Transiciones válidas

```
OCUPADA            ──(check-out)──→  VACANTE_SUCIA
VACANTE_SUCIA      ──(asignar)────→  EN_LIMPIEZA
EN_LIMPIEZA        ──(reportar)───→  VACANTE_LIMPIA
VACANTE_LIMPIA     ──(inspeccionar)→ VACANTE_INSPECCIONADA | VACANTE_SUCIA | BLOQUEADA
VACANTE_INSPECCIONADA ─(check-in)─→ OCUPADA
BLOQUEADA          ──(confirmar_reparacion) → VACANTE_SUCIA
```

Cualquier transición no listada devuelve **HTTP 409 Conflict**.

---

## 9. Contratos de integración

Documentación completa en [`docs/arquitectura.md`](docs/arquitectura.md).

### 9.1 Mensajes entrantes — Recepción → Control de Habitación

Autenticación: header `X-API-Key: <RECEPCION_API_KEY>`

#### Check-out (REC-HOSP-1)

```http
POST /api/v1/integraciones/recepcion/check-out
Content-Type: application/json
X-API-Key: <clave>

{
  "idMensaje": "uuid-único-de-recepcion",
  "numeroHabitacion": "101",
  "fechaHora": "2026-11-01T12:00:00-07:00"
}
```

Respuesta exitosa: `200 OK` — transición a `VACANTE_SUCIA`.
Mensaje duplicado (mismo `idMensaje`): `202 Accepted` — sin re-ejecutar.

#### Check-in (REC-HOSP-2)

```http
POST /api/v1/integraciones/recepcion/check-in
Content-Type: application/json
X-API-Key: <clave>

{
  "idMensaje": "uuid-único-de-recepcion",
  "numeroHabitacion": "101",
  "fechaHora": "2026-11-02T14:00:00-07:00"
}
```

Respuesta exitosa: `200 OK` — transición a `OCUPADA` (solo desde `VACANTE_INSPECCIONADA`).

**Códigos de error:**

| Código | Significado |
|---|---|
| `401` | API Key inválida o ausente |
| `404` | Habitación no encontrada |
| `409` | Transición no permitida desde el estado actual |
| `422` | Payload inválido |

### 9.2 Mensajes salientes — Control de Habitación → Reservaciones

El backend envía un `POST` al `RESERVACIONES_WEBHOOK_URL` con la firma en el header `X-Signature: sha256=<hmac>`.

Si `RESERVACIONES_WEBHOOK_URL` está vacío, el mensaje queda en la bandeja local (`GET /api/v1/integraciones/bandeja`) con estado `ENTREGADO` (modo demo).

#### HOSP-RES-1 — Reporte inicial de turno

Enviado por SCH-1 al iniciar el turno.

```json
{
  "tipo": "REPORTE_INICIAL_TURNO",
  "turnoId": 42,
  "fecha": "2026-11-01",
  "resumen": {
    "total": 20,
    "ocupadas": 8,
    "disponibles": 7,
    "noDisponibles": 4,
    "bloqueadas": 1
  }
}
```

#### HOSP-RES-2 — Cambio de estado relevante

Enviado por SCH-3 cada vez que una habitación cambia a un estado externo diferente.

```json
{
  "tipo": "CAMBIO_ESTADO_HABITACION",
  "idMensaje": "uuid-único-generado-por-control-habitacion",
  "numeroHabitacion": "101",
  "estadoAnteriorExterno": "NO_DISPONIBLE",
  "estadoNuevoExterno": "DISPONIBLE",
  "fechaHora": "2026-11-01T15:30:00-07:00"
}
```

**Reintentos:** hasta 5 intentos con backoff exponencial (1s, 2s, 4s, 8s, 16s).
**Firma:** `X-Signature: sha256=<HMAC-SHA256 del body con RESERVACIONES_WEBHOOK_SECRET>`.

---

## 10. Usuarios de demostración

Creados por el seed con la contraseña definida en `SEED_DEMO_PASSWORD`.

| Rol | Email | Acceso |
|---|---|---|
| Gerente | `gerente@resort.com` | Métricas, reportes FR08-03, PDF, empleados, turnos |
| Supervisor | `supervisor@resort.com` | Tablero, asignación, inspección FR08-02, bloqueadas |
| Camarista | `camarista@resort.com` | Mis Tareas (limpieza + reporte limpia) |
| Auxiliar | `auxiliar@resort.com` | Mis Tareas (reposición de artículos) |
| Recepción | `recepcion@resort.com` | Solo para pruebas de integración API |

> En la pantalla de Login hay botones de acceso rápido por rol para facilitar la demo.

---

## 11. Guion de demo — 5 minutos

Este guion recorre el flujo completo FR08 desde check-out hasta check-in, incluyendo limpieza, inspección con daño, reparación y reporte.

---

### Paso 1 — Inicio de turno (automático)

El cron de SCH-1 ejecuta a las 7:00 h. Para dispararlo manualmente en la demo:

```http
POST /api/v1/turno/iniciar-manual
Authorization: Bearer <token-supervisor>
```

Verifica en la bandeja de integración que se envió el mensaje **HOSP-RES-1** con el resumen del turno.

---

### Paso 2 — Check-out de habitación 101

1. Inicia sesión como **Supervisor** (`supervisor@resort.com`).
2. En el tablero observa la habitación **101** en estado **OCUPADA** (badge naranja).
3. Ve a **Integraciones → Simulador de Recepción**.
4. Selecciona "Check-out" · habitación "101" · haz clic en **Enviar**.
5. Regresa al tablero: la habitación 101 ahora muestra **NO DISPONIBLE** (interno: `VACANTE_SUCIA`).
6. En la bandeja verás el mensaje **HOSP-RES-2** enviado a Reservaciones.

---

### Paso 3 — Asignación de limpieza

1. Ve a **Supervisor → Asignar Limpieza**.
2. Selecciona habitación **101**.
3. Asigna:
   - **Camarista:** María Sánchez
   - **Auxiliar:** Juan Domínguez
4. Haz clic en **Asignar**.
5. El estado interno pasa a **EN_LIMPIEZA** (externo sigue **NO DISPONIBLE**).
6. En el panel lateral se muestra la instrucción normativa **FR08-01**.

---

### Paso 4 — Ejecución de la limpieza (camarista)

1. Cierra sesión e inicia como **Camarista** (`camarista@resort.com`).
2. En **Mis Tareas** verás la habitación 101 asignada.
3. Haz clic en el botón grande **"Terminar Limpieza"** → confirma.

---

### Paso 5 — Reposición de artículos (auxiliar)

1. Cierra sesión e inicia como **Auxiliar** (`auxiliar@resort.com`).
2. En **Mis Tareas** verás la habitación 101.
3. Haz clic en **"Terminar Reposición"** → confirma.

---

### Paso 6 — Reporte de habitación limpia (camarista)

1. Regresa como **Camarista**.
2. Haz clic en **"Reportar Habitación Limpia"** → confirma.
3. El estado pasa a **VACANTE_LIMPIA** (el externo sigue **NO DISPONIBLE**).

---

### Paso 7 — Inspección con daño (FR08-02)

1. Inicia como **Supervisor**.
2. Ve a **Supervisor → Inspeccionar → Habitación 101**.
3. Se abre el formulario FR08-02 con los 8 puntos de inspección.
4. Responde "Sí" a los puntos 1–6.
5. En el punto 7 (mobiliario) selecciona **"No"** y en el desplegable elige **"Daño material"**.
6. Responde "Sí" al punto 8.
7. Haz clic en **"Guardar Inspección"**.
8. El sistema detecta daño: aparece la modal **"¿Confirmar reporte de daño?"** con los detalles.
9. Haz clic en **"Confirmar Daño"**.
10. El estado pasa a **BLOQUEADA** (externo: **BLOQUEADA**).
11. En la bandeja se envía **HOSP-RES-2** notificando a Reservaciones que la habitación está BLOQUEADA.

---

### Paso 8 — Confirmación de reparación

1. Ve a **Supervisor → Bloqueadas**.
2. Selecciona habitación 101 y haz clic en **"Confirmar Reparación"**.
3. El estado vuelve a **VACANTE_SUCIA** y el sistema crea automáticamente una nueva asignación de limpieza.

---

### Paso 9 — Segunda limpieza e inspección sin daño

Repite los Pasos 4–6 (limpieza y reposición como camarista y auxiliar).

Luego como **Supervisor**, inspecciona la habitación 101:
- Responde **"Sí"** a todos los 8 puntos.
- Haz clic en **"Guardar Inspección"**.

El estado pasa a **VACANTE_INSPECCIONADA** (externo: **DISPONIBLE**).
Se envía **HOSP-RES-2** a Reservaciones notificando que la habitación está DISPONIBLE.

---

### Paso 10 — Check-in

1. Ve a **Integraciones → Simulador**.
2. Selecciona "Check-in" · habitación "101" · haz clic en **Enviar**.
3. El estado pasa a **OCUPADA**.
4. Se envía **HOSP-RES-2** a Reservaciones notificando que la habitación está OCUPADA.

---

### Paso 11 — Reporte del gerente (FR08-03)

1. Cierra sesión e inicia como **Gerente** (`gerente@resort.com`).
2. En **Gerente → Reportes** verás las métricas de ocupación del turno.
3. Selecciona el reporte del día y haz clic en **"Descargar PDF"**.
4. Se descarga el documento FR08-03 con el consecutivo anual, resumen de estados y bitácora.

---

## 12. Pruebas

### Backend

```bash
cd apps/backend

# Pruebas unitarias (máquina de estados)
npm test

# Pruebas con cobertura
npm run test:cov
```

Las pruebas cubren:
- Todas las transiciones válidas de la máquina de estados
- Rechazo de transiciones inválidas (HTTP 409)
- Idempotencia de mensajes de Recepción
- Endpoints de integración con mocks

### Frontend

```bash
cd apps/frontend

# Pruebas de componentes (Vitest + Testing Library)
npm test

# Modo watch
npm run test:watch
```

---

## 13. CI/CD — Pipeline completo

### `ci.yml` — Integración continua

Se ejecuta en cada `push` y `pull_request` a cualquier rama.

```
backend:  npm ci → lint → typecheck → prisma generate → prisma migrate deploy → test:cov → build
frontend: npm ci → lint → typecheck → test → vite build
```

### `deploy.yml` — Despliegue continuo

Se ejecuta solo en push a `main`.

```
deploy-frontend → build Vite (con VITE_BASE_PATH) → upload-pages-artifact → deploy-pages (GitHub Pages)
deploy-backend  → docker buildx → login GHCR → build & push imagen → curl Render deploy hook
smoke-test      → sondeo /health con 25 reintentos (10 s delay) → falla si el backend no responde
```

> Para que `deploy.yml` funcione, debes configurar los secrets y variables descritos en la [sección 5.3](#53-github-actions--secrets-y-variables).

---

## 14. FAQ y problemas comunes

### ❓ `prisma migrate deploy` falla en CI con "No migration files found"

La migración inicial no se ha generado. Ejecuta localmente:

```bash
cd apps/backend
npx prisma migrate dev --name init
git add prisma/migrations/
git commit -m "feat: primera migracion de base de datos prisma"
git push
```

### ❓ El frontend muestra pantalla en blanco en GitHub Pages

Asegúrate de que `VITE_BASE_PATH` en GitHub Actions tenga el nombre exacto de tu repositorio con `/` al inicio y al final, por ejemplo `/control-habitacion/`.

### ❓ Los webhooks a Reservaciones no se envían

Si `RESERVACIONES_WEBHOOK_URL` está vacío, el sistema funciona en **modo demo**: los mensajes se guardan en la bandeja local accesible desde `GET /api/v1/integraciones/bandeja` y en la UI de Integraciones.

### ❓ El cron de inicio de turno no dispara

Verifica la variable `TZ` (zona horaria) y `TURNO_CRON` (expresión cron). Para dispararlo manualmente durante una demo:

```bash
curl -X POST http://localhost:3000/api/v1/turno/iniciar-manual \
  -H "Authorization: Bearer <token>"
```

### ❓ Error `SEED_DEMO_PASSWORD is not defined`

El seed requiere esta variable por seguridad. Defínela antes de ejecutar:

```bash
SEED_DEMO_PASSWORD=DemoPass2026! npx ts-node prisma/seed.ts
```

### ❓ Render reinicia el servicio pero los datos persisten

La base de datos en Render es independiente del servicio web. Los datos persisten entre deploys. Solo se pierden si eliminas el servicio de base de datos manualmente.

### ❓ Error CORS al conectar frontend con backend

Asegúrate de que `CORS_ORIGIN` en el backend tenga la URL exacta del frontend, incluyendo el protocolo y sin barra al final. Ejemplo: `https://tu-usuario.github.io`.

---

## Licencia

MIT — Uso educativo y demostrativo. Para producción, revisar y endurecer la configuración de seguridad.

---

*Generado como parte del sistema FR08 Control de Habitación — Resort.*
