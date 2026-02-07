@echo off
echo === SilentEye - Iniciando servicios ===
echo.

REM Liberar puertos si estan en uso
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul

echo Iniciando Backend...
start "Backend" cmd /k "cd /d %~dp0 && npm run dev:backend"

timeout /t 5 /nobreak >nul

echo Iniciando Frontend...
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev:frontend"

echo.
echo === Servicios iniciados ===
echo.
echo Abre tu navegador en: http://localhost:3000
echo (Si no carga, prueba 3001, 3002 o 3003)
start http://localhost:3000
echo.
echo Credenciales: +51999999999 (admin), +51999999998 (helper), +51999999997 (driver)
echo El codigo OTP aparece en la consola del backend al solicitarlo.
echo.
pause
