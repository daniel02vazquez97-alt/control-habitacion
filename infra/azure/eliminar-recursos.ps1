<#
.SYNOPSIS
  Borra TODO lo de Control de Habitación en Azure para empezar de cero.

.DESCRIPTION
  Elimina el grupo de recursos completo (servidor PostgreSQL con sus datos, Container Apps,
  Static Web App) y el registro de aplicación de GitHub Actions en Microsoft Entra ID.
  No se puede deshacer: pide escribir el nombre del grupo para confirmar.
  Después se vuelve a crear todo con ./infra/azure/crear-recursos.ps1.
#>
param(
  [string]$Suscripcion   = '0239bbd1-fc72-4dd7-a816-fcbf29f5a631',
  [string]$GrupoRecursos = 'rg-control-habitaciones'
)
$ErrorActionPreference = 'Stop'

az account set --subscription $Suscripcion
if ($LASTEXITCODE -ne 0) { throw 'No se pudo seleccionar la suscripción. ¿Ejecutaste az login?' }

Write-Host "Recursos que se van a borrar en ${GrupoRecursos}:" -ForegroundColor Yellow
az resource list -g $GrupoRecursos --query '[].{nombre:name, tipo:type}' -o table
Write-Host "Además: registro de aplicación 'gh-actions-control-habitacion' en Entra ID." -ForegroundColor Yellow

$conf = Read-Host "Escribe '$GrupoRecursos' para confirmar (no se puede deshacer)"
if ($conf -ne $GrupoRecursos) { Write-Host 'Cancelado.'; exit 1 }

$appId = az ad app list --display-name gh-actions-control-habitacion --query '[0].appId' -o tsv
if ($appId) { az ad app delete --id $appId; Write-Host '  Registro de aplicación eliminado' }

Write-Host "Eliminando $GrupoRecursos (tarda varios minutos)..."
az group delete -n $GrupoRecursos --yes
if ($LASTEXITCODE -ne 0) { throw 'No se pudo eliminar el grupo de recursos.' }
Write-Host 'Listo. Para volver a crear todo: ./infra/azure/crear-recursos.ps1' -ForegroundColor Green
Write-Host 'Si Azure dice que el nombre del servidor no está disponible, espera unos minutos o usa -ServidorBD con otro nombre.'
