Write-Host "Desplegando ViveSpaces a Kubernetes (OPTIMIZADO)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker este corriendo
Write-Host "Verificando Docker..." -ForegroundColor Yellow
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker no esta corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Docker esta corriendo" -ForegroundColor Green
Write-Host ""

# Verificar que kubectl este disponible
Write-Host "Verificando Kubernetes..." -ForegroundColor Yellow
kubectl version --client >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: kubectl no esta disponible." -ForegroundColor Red
    exit 1
}
Write-Host "OK: kubectl esta disponible" -ForegroundColor Green
Write-Host ""

# Preparar ambiente para build
Write-Host "Preparando ambiente para build..." -ForegroundColor Yellow
Push-Location ..
Remove-Item public\storage -Force -ErrorAction SilentlyContinue 2>$null
Write-Host "OK: Limpieza completada" -ForegroundColor Green
Pop-Location
Write-Host ""

# Paso 1: Construir imagen
Write-Host "Paso 1/4: Construyendo imagen Docker..." -ForegroundColor Yellow
docker build -t vivespaces:latest -f Dockerfile ..
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Imagen construida exitosamente" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: Error al construir la imagen" -ForegroundColor Red
    exit 1
}

# Paso 2: Desplegar MySQL
Write-Host "Paso 2/4: Desplegando MySQL..." -ForegroundColor Yellow
kubectl apply -f vivespaces-mysql.yaml
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: MySQL configurado" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: Error al configurar MySQL" -ForegroundColor Red
    exit 1
}

# Paso 3: Desplegar App
Write-Host "Paso 3/4: Desplegando aplicacion..." -ForegroundColor Yellow
kubectl apply -f vivespaces-app.yaml
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Aplicacion configurada" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: Error al configurar aplicacion" -ForegroundColor Red
    exit 1
}

# Paso 4: Desplegar Ingress
Write-Host "Paso 4/4: Desplegando Ingress..." -ForegroundColor Yellow
kubectl apply -f vivespaces-ingress.yaml 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Ingress configurado" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Ingress no configurado (opcional)" -ForegroundColor Yellow
}
Write-Host ""

# Esperar a que esten listos
Write-Host "Esperando que los pods esten listos..." -ForegroundColor Yellow
Write-Host "   (Esto puede tomar 1-2 minutos)..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host "   Esperando MySQL..." -ForegroundColor Gray
kubectl wait --for=condition=ready pod -l app=vivespaces-mysql --timeout=180s 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK: MySQL listo" -ForegroundColor Green
} else {
    Write-Host "   ADVERTENCIA: MySQL tardo mas de lo esperado" -ForegroundColor Yellow
}

Write-Host "   Esperando Aplicacion..." -ForegroundColor Gray
kubectl wait --for=condition=ready pod -l app=vivespaces-app --timeout=300s 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK: Aplicacion lista" -ForegroundColor Green
} else {
    Write-Host "   ADVERTENCIA: La aplicacion aun esta iniciandose" -ForegroundColor Yellow
}

# Optimizaciones de Laravel
Write-Host ""
Write-Host "Aplicando optimizaciones de Laravel..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "   Limpiando cache..." -ForegroundColor Gray
kubectl exec deployment/vivespaces-app -- php artisan config:clear 2>$null
kubectl exec deployment/vivespaces-app -- php artisan cache:clear 2>$null

Write-Host "   Cacheando configuraciones..." -ForegroundColor Gray
kubectl exec deployment/vivespaces-app -- php artisan config:cache 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK: Config cache generado" -ForegroundColor Green
}

Write-Host ""
Write-Host "DESPLIEGUE COMPLETADO!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""

# Mostrar estado
Write-Host "Estado de los pods:" -ForegroundColor Cyan
kubectl get pods -o wide

Write-Host ""
Write-Host "Servicios activos:" -ForegroundColor Cyan
kubectl get services

Write-Host ""
Write-Host "================================================================" -ForegroundColor White
Write-Host "  VIVESPACES - LISTO PARA DESARROLLO" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor White
Write-Host ""
Write-Host "Backend API (Laravel en Kubernetes):" -ForegroundColor Cyan
Write-Host "   http://vivespaces.com.mx" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "   http://localhost:30080 (alternativa)" -ForegroundColor Gray
Write-Host ""
Write-Host "Frontend (Ejecuta en tu laptop):" -ForegroundColor Cyan
Write-Host "   cd C:\laragon\www\vivespaces" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host "   Luego abre: http://localhost:5174" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "Base de datos MySQL:" -ForegroundColor Cyan
Write-Host "   Host: localhost:3307" -ForegroundColor White
Write-Host "   Database: vivespaces" -ForegroundColor White
Write-Host "   User: root" -ForegroundColor White
Write-Host "   Password: (vacio)" -ForegroundColor White
Write-Host ""
Write-Host "CONFIGURACION OPTIMIZADA:" -ForegroundColor Yellow
Write-Host "   Backend: 1 pod x 768Mi RAM" -ForegroundColor White
Write-Host "   Backend CPU: 750m (0.75 cores)" -ForegroundColor White
Write-Host "   MySQL: 512Mi RAM con 256M buffer pool" -ForegroundColor White
Write-Host "   Consumo total: ~1.3Gi RAM (ligero)" -ForegroundColor White
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Yellow
Write-Host "   Ver logs:    kubectl logs -f deployment/vivespaces-app" -ForegroundColor White
Write-Host "   Reiniciar:   kubectl rollout restart deployment/vivespaces-app" -ForegroundColor White
Write-Host "   Destruir:    .\destroy.ps1" -ForegroundColor White
Write-Host ""
Write-Host "================================================================" -ForegroundColor White
Write-Host ""