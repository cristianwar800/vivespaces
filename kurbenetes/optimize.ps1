Write-Host "Optimizando Laravel en Kubernetes..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Cacheando configuraciones..." -ForegroundColor Yellow
kubectl exec -it deployment/vivespaces-app -- php artisan config:cache
Write-Host "OK" -ForegroundColor Green

Write-Host "2. Cacheando rutas..." -ForegroundColor Yellow
kubectl exec -it deployment/vivespaces-app -- php artisan route:cache
Write-Host "OK" -ForegroundColor Green

Write-Host "3. Cacheando vistas..." -ForegroundColor Yellow
kubectl exec -it deployment/vivespaces-app -- php artisan view:cache
Write-Host "OK" -ForegroundColor Green

Write-Host "4. Optimizando autoload..." -ForegroundColor Yellow
kubectl exec -it deployment/vivespaces-app -- composer dump-autoload -o
Write-Host "OK" -ForegroundColor Green

Write-Host ""
Write-Host "OPTIMIZACION COMPLETADA!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""
Write-Host "La aplicacion deberia cargar MUCHO mas rapido ahora" -ForegroundColor Cyan
Write-Host ""