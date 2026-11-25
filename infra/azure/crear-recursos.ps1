<#
.SYNOPSIS
  Crea (o actualiza) en Azure todo lo que necesita Control de Habitación, usando niveles gratuitos.

.DESCRIPTION
  - Grupo de recursos y base de datos: crea el grupo, el servidor flexible de PostgreSQL 18
    (Burstable Standard_B1ms, 32 GiB, nivel gratuito) y la base control_habitacion_db, con el
    firewall abierto solo a servicios de Azure.
  - Backend:  Azure Container Apps (plan Consumo, escala a cero, sin Log Analytics) con la imagen de GHCR.
  - Frontend: Azure Static Web Apps (plan Free).
  - CI/CD:    registro de aplicación en Microsoft Entra ID con credencial federada (OIDC) para que
              GitHub Actions despliegue sin contraseñas.
  El script se puede ejecutar varias veces: si un recurso ya existe, lo reutiliza.

.EXAMPLE
  ./infra/azure/crear-recursos.ps1
  ./infra/azure/crear-recursos.ps1 -ServidorBD control-habitacion-db2   # si el nombre anterior sigue reservado tras borrarlo
#>
param(
  [string]$Suscripcion   = '0239bbd1-fc72-4dd7-a816-fcbf29f5a631',
  [string]$GrupoRecursos = 'rg-control-habitaciones',
  [string]$Region        = 'mexicocentral',      # región del backend (la misma de la base de datos)
  [string]$RegionSwa     = 'centralus',          # Static Web Apps solo se crea en ciertas regiones; el sitio se sirve global
  [string]$ServidorBD    = 'control-habitacion-db',
  [string]$UsuarioBD     = 'adminhabitaciones',
  [string]$NombreBD      = 'control_habitacion_db',
  [string]$EntornoAca    = 'cae-control-habitacion',
  [string]$AppBackend    = 'ca-control-habitacion-api',
  [string]$AppFrontend   = 'swa-control-habitacion',
  [string]$RepoGitHub    = 'daniel02vazquez97-alt/control-habitacion',
  [string]$VersionPg     = '18'
)

$ErrorActionPreference = 'Stop'

function Ejecutar {
  # Ejecuta az y detiene el script si falla.
  $out = & az @args
  if ($LASTEXITCODE -ne 0) {
    # No mostrar contraseñas ni secretos en el mensaje de error.
    $texto = ($args -join ' ') -replace '(--admin-password\s+)\S+', '$1***' -replace '((database-url|secret|key|password)[^=\s]*=)\S+', '$1***'
    throw "Falló: az $texto"
  }
  return $out
}
function Existe {
  # Devuelve $true si el recurso existe. En Windows PowerShell 5.1, redirigir stderr de un
  # comando nativo con ErrorActionPreference='Stop' lo convierte en error fatal; por eso se
  # baja a 'Continue' solo mientras se consulta.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { & az @args 2>&1 | Out-Null } finally { $ErrorActionPreference = $prev }
  return ($LASTEXITCODE -eq 0)
}
function Clave([int]$n = 40) {
  # Solo letras y números para que no haya problemas al pasarla por la línea de comandos
  # (en Windows az se ejecuta a través de cmd). Siempre incluye mayúscula, minúscula y dígito,
  # que es lo que exige Azure para la contraseña del administrador de PostgreSQL.
  $c = [char[]]'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  do { $k = -join (1..$n | ForEach-Object { $c[(Get-Random -Maximum $c.Length)] }) }
  until ($k -cmatch '[A-Z]' -and $k -cmatch '[a-z]' -and $k -match '[0-9]')
  return $k
}
function Paso($t) { Write-Host "`n=== $t" -ForegroundColor Cyan }

# ---------------------------------------------------------------- 0. Sesión y proveedores
Paso 'Suscripción'
Ejecutar account set --subscription $Suscripcion | Out-Null
$tenant = Ejecutar account show --query tenantId -o tsv
Write-Host "Tenant: $tenant"

Paso 'Extensión de Container Apps y proveedores de recursos'
Ejecutar extension add --name containerapp --upgrade --only-show-errors | Out-Null
foreach ($p in 'Microsoft.App', 'Microsoft.Web', 'Microsoft.OperationalInsights') {
  Ejecutar provider register --namespace $p --wait | Out-Null
  Write-Host "  $p registrado"
}

# ---------------------------------------------------------------- 1. Grupo de recursos y base de datos
Paso 'Grupo de recursos'
if (-not (Existe group show -n $GrupoRecursos)) {
  Ejecutar group create -n $GrupoRecursos -l $Region | Out-Null
  Write-Host "  $GrupoRecursos creado en $Region"
} else { Write-Host "  $GrupoRecursos ya existe" }

Paso 'Servidor PostgreSQL (servidor flexible)'
$pwdNueva = $false
if (-not (Existe postgres flexible-server show -g $GrupoRecursos -n $ServidorBD)) {
  $pwdPlano = Clave 24
  $pwdNueva = $true
  Write-Host "  Creando $ServidorBD (PostgreSQL $VersionPg, Burstable Standard_B1ms, 32 GiB). Tarda de 5 a 10 minutos..."
  Ejecutar postgres flexible-server create -g $GrupoRecursos -n $ServidorBD -l $Region `
    --version $VersionPg --tier Burstable --sku-name Standard_B1ms --storage-size 32 `
    --admin-user $UsuarioBD --admin-password $pwdPlano `
    --public-access 0.0.0.0 --backup-retention 7 --yes | Out-Null   # 0.0.0.0 = acceso público solo para servicios de Azure
  Write-Host "  Servidor creado"
  Write-Host "  Contraseña de ${UsuarioBD}: $pwdPlano  (guárdala ya; se repite al final)" -ForegroundColor Yellow
} else {
  $sku = Ejecutar postgres flexible-server show -g $GrupoRecursos -n $ServidorBD --query sku.name -o tsv
  Write-Host "  $ServidorBD ya existe (tamaño $sku)"
  if ($sku -ne 'Standard_B1ms') {
    Write-Host '  AVISO: solo Standard_B1ms entra en el nivel gratuito. Para empezar de cero: ./infra/azure/eliminar-recursos.ps1' -ForegroundColor Yellow
  }
  $pwdSeguro = Read-Host "Contraseña de $UsuarioBD (Enter vacío = generar una nueva y asignarla al servidor)" -AsSecureString
  $pwdPlano = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwdSeguro))
  if ([string]::IsNullOrEmpty($pwdPlano)) {
    $pwdPlano = Clave 24
    $pwdNueva = $true
    Ejecutar postgres flexible-server update --resource-group $GrupoRecursos --name $ServidorBD --admin-password $pwdPlano | Out-Null
    Write-Host '  Contraseña del administrador restablecida (se muestra al final)'
    Write-Host "  Contraseña de ${UsuarioBD}: $pwdPlano  (guárdala ya; se repite al final)" -ForegroundColor Yellow
  }
}

Paso 'Base de datos y firewall'
if (-not (Existe postgres flexible-server db show --resource-group $GrupoRecursos --server-name $ServidorBD --name $NombreBD)) {
  Ejecutar postgres flexible-server db create --resource-group $GrupoRecursos --server-name $ServidorBD --name $NombreBD | Out-Null
  Write-Host "  Base $NombreBD creada (vacía: las tablas las crea Prisma al arrancar el backend)"
} else { Write-Host "  Base $NombreBD ya existe" }

# Las reglas de firewall solo funcionan si el acceso público está habilitado.
$acceso = Ejecutar postgres flexible-server show --resource-group $GrupoRecursos --name $ServidorBD --query network.publicNetworkAccess -o tsv
if ($acceso -ne 'Enabled') {
  Ejecutar postgres flexible-server update --resource-group $GrupoRecursos --name $ServidorBD --public-access Enabled | Out-Null
  Write-Host '  Acceso público habilitado (el firewall decide quién entra)'
}

# 0.0.0.0 - 0.0.0.0 es la regla especial "Permitir acceso desde servicios de Azure".
if (-not (Existe postgres flexible-server firewall-rule show --resource-group $GrupoRecursos --server-name $ServidorBD --name PermitirServiciosAzure)) {
  Ejecutar postgres flexible-server firewall-rule create --resource-group $GrupoRecursos --server-name $ServidorBD --name PermitirServiciosAzure `
    --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 | Out-Null
  Write-Host '  Firewall: acceso desde servicios de Azure permitido'
}

$pwdUrl = [uri]::EscapeDataString($pwdPlano)
# Sin '&' en la cadena: en Windows az se ejecuta a través de cmd y '&' cortaría el argumento. Prisma usa el esquema public por defecto.
$databaseUrl = "postgresql://${UsuarioBD}:$pwdUrl@$ServidorBD.postgres.database.azure.com:5432/$NombreBD`?sslmode=require"

# ---------------------------------------------------------------- 2. Frontend: Static Web Apps (Free)
Paso 'Frontend: Azure Static Web Apps (Free)'
if (-not (Existe staticwebapp show -n $AppFrontend -g $GrupoRecursos)) {
  Ejecutar staticwebapp create -n $AppFrontend -g $GrupoRecursos -l $RegionSwa --sku Free | Out-Null
  Write-Host "  $AppFrontend creada"
}
$swaHost  = Ejecutar staticwebapp show -n $AppFrontend -g $GrupoRecursos --query defaultHostname -o tsv
$swaToken = Ejecutar staticwebapp secrets list -n $AppFrontend -g $GrupoRecursos --query properties.apiKey -o tsv
$frontUrl = "https://$swaHost"
Write-Host "  URL: $frontUrl"

# ---------------------------------------------------------------- 3. Backend: Container Apps (Consumo)
Paso 'Backend: entorno de Azure Container Apps'
if (-not (Existe containerapp env show -n $EntornoAca -g $GrupoRecursos)) {
  # Sin Log Analytics para no generar cobro por ingesta de registros; los logs se ven con 'az containerapp logs show'.
  Ejecutar containerapp env create -n $EntornoAca -g $GrupoRecursos -l $Region --logs-destination none | Out-Null
  Write-Host "  Entorno $EntornoAca creado"
} else { Write-Host "  Entorno $EntornoAca ya existe" }

Paso 'Backend: Container App'
$secretos = @(
  "database-url=$databaseUrl",
  "jwt-secret=$(Clave)", "jwt-refresh-secret=$(Clave)",
  "recepcion-api-key=demo-recepcion-key", "reservaciones-webhook-secret=$(Clave 32)",
  "seed-demo-password=DemoPass2026!"
)
$variables = @(
  'NODE_ENV=production', 'PORT=3000', 'TZ=America/Hermosillo', 'TURNO_CRON=0 7 * * *', 'RUN_SEED=true',
  "CORS_ORIGIN=$frontUrl",
  'DATABASE_URL=secretref:database-url', 'JWT_SECRET=secretref:jwt-secret',
  'JWT_REFRESH_SECRET=secretref:jwt-refresh-secret', 'RECEPCION_API_KEY=secretref:recepcion-api-key',
  'RESERVACIONES_WEBHOOK_SECRET=secretref:reservaciones-webhook-secret', 'SEED_DEMO_PASSWORD=secretref:seed-demo-password'
)
if (-not (Existe containerapp show -n $AppBackend -g $GrupoRecursos)) {
  # recepcion-api-key usa la clave de demo porque el simulador de Recepción del frontend la envía;
  # cuando el equipo de Recepción se integre de verdad, cámbienla con: az containerapp secret set ...
  # Imagen temporal de Microsoft; el primer despliegue de GitHub Actions la reemplaza por la de GHCR.
  Ejecutar containerapp create -n $AppBackend -g $GrupoRecursos --environment $EntornoAca `
    --image mcr.microsoft.com/k8se/quickstart:latest --target-port 3000 --ingress external `
    --cpu 0.25 --memory 0.5Gi --min-replicas 0 --max-replicas 1 `
    --secrets @secretos --env-vars @variables | Out-Null
  Write-Host "  $AppBackend creada (escala a cero cuando no hay tráfico)"
} else {
  Write-Host "  $AppBackend ya existe: se actualizan la cadena de conexión y CORS (las demás claves se conservan)"
  Ejecutar containerapp secret set -n $AppBackend -g $GrupoRecursos --secrets "database-url=$databaseUrl" | Out-Null
  Ejecutar containerapp update -n $AppBackend -g $GrupoRecursos --set-env-vars "CORS_ORIGIN=$frontUrl" | Out-Null
}
$apiHost = Ejecutar containerapp show -n $AppBackend -g $GrupoRecursos --query properties.configuration.ingress.fqdn -o tsv
$apiUrl  = "https://$apiHost/api/v1"
Write-Host "  API: $apiUrl"

# ---------------------------------------------------------------- 4. Identidad de GitHub Actions (OIDC)
Paso 'Identidad de GitHub Actions (OIDC, sin contraseñas)'
$nombreApp = 'gh-actions-control-habitacion'
$clientId = Ejecutar ad app list --display-name $nombreApp --query '[0].appId' -o tsv
if (-not $clientId) {
  $clientId = Ejecutar ad app create --display-name $nombreApp --query appId -o tsv
  Write-Host "  Registro de aplicación $nombreApp creado"
}
if (-not (Existe ad sp show --id $clientId)) { Ejecutar ad sp create --id $clientId | Out-Null }
$scope = Ejecutar group show -n $GrupoRecursos --query id -o tsv
$rol = Ejecutar role assignment list --assignee $clientId --scope $scope --role Contributor --query '[0].id' -o tsv
if (-not $rol) {
  Start-Sleep -Seconds 15   # la entidad de servicio tarda unos segundos en propagarse
  Ejecutar role assignment create --assignee $clientId --role Contributor --scope $scope | Out-Null
  Write-Host '  Rol Contributor asignado solo sobre el grupo de recursos'
}
# GitHub puede presentar el sujeto con el formato clásico (repo:dueño/repo) o con los Id. inmutables
# del dueño y del repositorio (repo:dueño@123/repo@456). Se registran los dos para que el inicio de sesión funcione siempre.
$sujetos = @{ 'github-main' = "repo:${RepoGitHub}:ref:refs/heads/main" }
if (Get-Command gh -ErrorAction SilentlyContinue) {
  $ids = gh api "repos/$RepoGitHub" --jq '[.owner.id, .id] | @tsv' 2>$null
  if ($LASTEXITCODE -eq 0 -and $ids) {
    $dueno, $repo = $RepoGitHub.Split('/'); $idDueno, $idRepo = $ids.Trim().Split("`t")
    $sujetos['github-main-ids'] = "repo:${dueno}@${idDueno}/${repo}@${idRepo}:ref:refs/heads/main"
  }
} else {
  Write-Host '  Sin GitHub CLI: si Actions falla con AADSTS700213, agrega la credencial con el sujeto que muestra el error (ver docs/despliegue-azure.md).' -ForegroundColor Yellow
}
foreach ($nombre in $sujetos.Keys) {
  $fed = Ejecutar ad app federated-credential list --id $clientId --query "[?name=='$nombre'].name" -o tsv
  if (-not $fed) {
    $json = @{ name = $nombre; issuer = 'https://token.actions.githubusercontent.com';
               subject = $sujetos[$nombre]; audiences = @('api://AzureADTokenExchange') } | ConvertTo-Json
    $tmp = New-TemporaryFile; [IO.File]::WriteAllText($tmp.FullName, $json)   # UTF-8 sin BOM
    Ejecutar ad app federated-credential create --id $clientId --parameters "@$tmp" | Out-Null
    Remove-Item $tmp
    Write-Host "  Credencial federada $nombre creada: $($sujetos[$nombre])"
  }
}

# ---------------------------------------------------------------- 5. GitHub: secrets y variables
Paso 'Configuración de GitHub Actions'
$valores = [ordered]@{
  'secret AZURE_CLIENT_ID' = $clientId; 'secret AZURE_TENANT_ID' = $tenant; 'secret AZURE_SUBSCRIPTION_ID' = $Suscripcion;
  'secret AZURE_STATIC_WEB_APPS_API_TOKEN' = $swaToken; 'variable VITE_API_URL' = $apiUrl; 'variable VITE_DEMO_MODE' = 'true'
}
if (Get-Command gh -ErrorAction SilentlyContinue) {
  foreach ($k in $valores.Keys) {
    $tipo, $nombre = $k -split ' '
    if ($tipo -eq 'secret') { $valores[$k] | gh secret set $nombre --repo $RepoGitHub }
    else { gh variable set $nombre --repo $RepoGitHub --body $valores[$k] }
    Write-Host "  $k configurado en GitHub"
  }
} else {
  Write-Host 'No se encontró GitHub CLI (gh). Captura estos valores en GitHub -> Settings -> Secrets and variables -> Actions:' -ForegroundColor Yellow
  foreach ($k in $valores.Keys) {
    $v = if ($k -like '*TOKEN*') { '(ver abajo)' } else { $valores[$k] }
    Write-Host ("  {0,-42} {1}" -f $k, $v)
  }
  Write-Host "`n  AZURE_STATIC_WEB_APPS_API_TOKEN:`n  $swaToken" -ForegroundColor Yellow
}

Paso 'Listo'
if ($pwdNueva) {
  Write-Host "Contraseña generada para ${UsuarioBD}: $pwdPlano" -ForegroundColor Yellow
  Write-Host '  Guárdala en un gestor de contraseñas. Azure no la vuelve a mostrar (se puede cambiar con az postgres flexible-server update --admin-password).' -ForegroundColor Yellow
}
Write-Host "Frontend: $frontUrl"
Write-Host "Backend:  $apiUrl   (salud: $apiUrl/health)"
Write-Host 'Siguiente paso: haz push a main. Después del primer despliegue, en GitHub -> Packages ->'
Write-Host 'control-habitacion-backend -> Package settings, cambia la visibilidad a Public para que Azure pueda descargar la imagen.'
