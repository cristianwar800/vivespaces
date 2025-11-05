Write-Host "Eliminando ViveSpaces de Kubernetes..." -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

Write-Host "Eliminando HorizontalPodAutoscaler..." -ForegroundColor Yellow
kubectl delete -f vivespaces-hpa.yaml 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: HPA eliminado" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: HPA no encontrado" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Eliminando PodDisruptionBudget..." -ForegroundColor Yellow
kubectl delete -f vivespaces-pdb.yaml 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: PDB eliminado" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: PDB no encontrado" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Eliminando Ingress..." -ForegroundColor Yellow
kubectl delete -f vivespaces-ingress.yaml 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Ingress eliminado" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Ingress no encontrado" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Eliminando aplicacion..." -ForegroundColor Yellow
kubectl delete -f vivespaces-app.yaml 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Aplicacion eliminada" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Aplicacion no encontrada" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Eliminando MySQL..." -ForegroundColor Yellow
kubectl delete -f vivespaces-mysql.yaml 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: MySQL eliminado" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: MySQL no encontrado" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Esperando a que los pods terminen..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar que todo fue eliminado
$pods = kubectl get pods 2>$null | Select-String "vivespaces"
if ($pods) {
    Write-Host "ADVERTENCIA: Algunos pods aun estan terminando..." -ForegroundColor Yellow
    kubectl get pods | Select-String "vivespaces"
} else {
    Write-Host "OK: Todos los recursos eliminados" -ForegroundColor Green
}

Write-Host ""
Write-Host "ViveSpaces eliminado completamente" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para volver a desplegar: .\deploy.ps1" -ForegroundColor Cyan
Write-Host ""