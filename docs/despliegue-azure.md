# Despliegue en Azure

Todo el sistema corre en Azure y se despliega con GitHub Actions en cada push a `main`.

```
Navegador ──HTTPS──▶ Azure Static Web Apps (frontend React, plan Free)
    │
    └──HTTPS /api/v1──▶ Azure Container Apps (backend NestJS, plan Consumo)
                              │
                              └──SSL 5432──▶ Azure Database for PostgreSQL – servidor flexible
```

| Pieza | Servicio de Azure | Recurso | Costo esperado |
|---|---|---|---|
| Frontend | Static Web Apps, plan **Free** | `swa-control-habitacion` | $0 |
| Backend | Container Apps, plan **Consumo**, 0.25 vCPU / 0.5 GiB, escala a cero | `ca-control-habitacion-api` en el entorno `cae-control-habitacion` | $0 dentro de la concesión gratuita mensual |
| Base de datos | PostgreSQL 18 servidor flexible, **Burstable B1ms**, 32 GiB | `control-habitacion-db` | $0 dentro de las 750 h/mes gratuitas |
| Imagen del backend | GitHub Container Registry (no Azure Container Registry) | `ghcr.io/daniel02vazquez97-alt/control-habitacion-backend` | $0 |
| Registros | Sin Log Analytics (`--logs-destination none`) | — | $0 |

Todo vive en el grupo de recursos `rg-control-habitaciones`.

## 1. Crear los recursos

Todo se crea desde cero con Azure CLI, sin usar el portal. Para borrar todo y volver a empezar:

```powershell
./infra/azure/eliminar-recursos.ps1   # pide escribir el nombre del grupo para confirmar
```


Requisitos: Azure CLI con sesión iniciada (`az login`) y, opcional, GitHub CLI (`gh auth login`) para que el script cargue solo los secrets en GitHub.

```powershell
cd C:\Users\pc\Desktop\Hospedaje
./infra/azure/crear-recursos.ps1
```

El script hace lo siguiente:

1. Registra los proveedores `Microsoft.App`, `Microsoft.Web` y `Microsoft.OperationalInsights` y crea el grupo `rg-control-habitaciones` en Mexico Central.
2. Crea el servidor `control-habitacion-db` (PostgreSQL 18, Burstable **Standard_B1ms**, 32 GiB, sin alta disponibilidad, respaldos de 7 días) con una contraseña de administrador generada al azar, que se muestra **una sola vez** al final: guárdenla. Si el servidor ya existe, pide la contraseña.
3. Crea la base vacía `control_habitacion_db` y la regla de firewall **PermitirServiciosAzure** (0.0.0.0), que deja entrar solo a servicios de Azure.
4. Crea la Static Web App (Free) y obtiene su token de despliegue.
5. Crea el entorno de Container Apps y la app del backend con sus secretos: `DATABASE_URL` (con `sslmode=require`), claves JWT y secreto del webhook generados al azar, y la API key de Recepción `demo-recepcion-key` (la que usa el simulador del frontend). `CORS_ORIGIN` queda apuntando a la URL de la Static Web App.
6. Crea un registro de aplicación en Microsoft Entra ID con **credencial federada (OIDC)** para el repositorio, con rol **Contributor solo sobre el grupo de recursos**. GitHub Actions inicia sesión en Azure sin contraseñas guardadas.
7. Configura en GitHub (o imprime, si no tienes `gh`) estos valores:

| Tipo | Nombre | Contenido |
|---|---|---|
| Secret | `AZURE_CLIENT_ID` | Id. de la aplicación de Entra ID |
| Secret | `AZURE_TENANT_ID` | Id. del tenant |
| Secret | `AZURE_SUBSCRIPTION_ID` | Id. de la suscripción |
| Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | Token de despliegue de la Static Web App |
| Variable | `VITE_API_URL` | `https://<fqdn-de-la-container-app>/api/v1` |
| Variable | `VITE_DEMO_MODE` | `true` |

Se puede volver a ejecutar sin problema: reutiliza lo que ya existe y actualiza la cadena de conexión y CORS.

## 2. Primer despliegue

1. Haz push a `main`. El flujo **CD - Despliegue en Azure** construye la imagen, la publica en GHCR, actualiza la Container App y publica el frontend.
2. La primera vez, el paquete de GHCR se crea **privado** y Azure no puede descargarlo. En GitHub → tu perfil → **Packages → control-habitacion-backend → Package settings → Change visibility → Public**. Después vuelve a ejecutar el flujo (Actions → CD → Re-run jobs).
3. Al arrancar, el backend aplica las migraciones de Prisma y, como la base está vacía, carga los datos de demostración (usuarios del README, contraseña `DemoPass2026!`).
4. Comprueba `https://<fqdn>/api/v1/health` → `"baseDeDatos": "CONECTADA"`, y abre la URL de la Static Web App.

## 3. Cambiar el modelo de datos durante el prototipo

Las tablas las define `apps/backend/prisma/schema.prisma` y se crean con **migraciones** de Prisma (carpeta `apps/backend/prisma/migrations`). Nunca se crean ni se modifican a mano en Azure.

1. Levanta PostgreSQL local: `docker compose up -d postgres`.
2. Edita `schema.prisma`.
3. Genera la migración contra la base local: `npm run prisma:migrate:dev -- --name describe_el_cambio`.
4. Si el cambio afecta los datos demo, actualiza `apps/backend/prisma/seed.ts`.
5. Haz commit de `schema.prisma` y de la carpeta de la nueva migración, y push a `main`. CI prueba las migraciones en un PostgreSQL 18 limpio y, al desplegar, el backend aplica las pendientes (`prisma migrate deploy`) al arrancar.

Mientras sea prototipo, si un cambio no se puede aplicar sobre los datos existentes (o se editó una migración ya aplicada), se reinicia la base de Azure desde GitHub: **Actions → Reiniciar base de datos (prototipo) → Run workflow**, escribiendo `REINICIAR`. El flujo abre el firewall solo para su runner, borra el esquema, aplica todas las migraciones, carga los datos demo y vuelve a cerrar el firewall. Para la base local: `npm run prisma:reset`.

El frontend no requiere nada especial: cada push a `main` lo vuelve a publicar.

## 4. Operación diaria

```powershell
# Ver registros del backend en vivo
az containerapp logs show -n ca-control-habitacion-api -g rg-control-habitaciones --follow

# Ver réplicas y estado
az containerapp replica list -n ca-control-habitacion-api -g rg-control-habitaciones -o table

# Cambiar una variable (por ejemplo, la URL del webhook de Reservaciones cuando la tengan)
az containerapp update -n ca-control-habitacion-api -g rg-control-habitaciones --set-env-vars "RESERVACIONES_WEBHOOK_URL=https://..."

# Volver a cargar los datos demo (borra todo): agregar SEED_FORCE=true, esperar el reinicio y quitarlo
az containerapp update -n ca-control-habitacion-api -g rg-control-habitaciones --set-env-vars "SEED_FORCE=true"
az containerapp update -n ca-control-habitacion-api -g rg-control-habitaciones --remove-env-vars SEED_FORCE

# Conectarse a la base desde tu computadora (agrega antes tu IP al firewall)
az postgres flexible-server firewall-rule create --resource-group rg-control-habitaciones --server-name control-habitacion-db --name MiIP --start-ip-address <tu-ip> --end-ip-address <tu-ip>
az postgres flexible-server connect -n control-habitacion-db -u adminhabitaciones -d control_habitacion_db --interactive
```

## 5. Cuidar el crédito de Azure for Students

- **Base de datos**: es lo único que cobra por hora. **Standard_B1ms** con 32 GiB entra en las 750 h/mes gratuitas durante 12 meses (un servidor encendido todo el mes usa ~730 h). No creen un segundo servidor: las horas se suman.
- **Detener la base cuando no la usen** (no cobra cómputo mientras está detenida; Azure la vuelve a encender sola a los 7 días):
  `az postgres flexible-server stop -g rg-control-habitaciones -n control-habitacion-db` y `... start ...` para encenderla.
- **Backend**: con mínimo de 0 réplicas no consume nada sin tráfico. La primera petición después de un rato tarda unos 20–40 s en arrancar.
- **Presupuesto**: crea una alerta en *Cost Management → Presupuestos* (por ejemplo, 5 USD) para enterarte antes de gastar crédito.

## 6. Limitaciones conocidas

- **Cron de inicio de turno**: como el backend escala a cero, el cron `TURNO_CRON` solo corre si hay una réplica encendida a esa hora. El reporte inicial se puede enviar desde la pantalla del supervisor. Si se necesita automático, se puede cambiar a `--min-replicas 1` (consume crédito) o crear un *Container Apps Job* programado.
- **Región**: si `mexicocentral` no admite Container Apps en su suscripción, ejecuten el script con `-Region southcentralus` (o la región permitida más cercana).
