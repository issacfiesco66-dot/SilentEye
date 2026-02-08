@echo off
chcp 65001 >nul
echo ================================================
echo   SilentEye - Iniciar Backend + Ngrok (GPS)
echo ================================================
echo.

REM Liberar puerto 5000 si está en uso
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
    echo Puerto 5000 liberado.
)
timeout /t 2 /nobreak >nul

echo [1/2] Iniciando Backend (TCP en puerto 5000)...
start "Backend - SilentEye" cmd /k "cd /d %~dp0 && npm run dev:backend"

timeout /t 6 /nobreak >nul

echo [2/2] Iniciando Ngrok TCP (puerto 5000)...
start "Ngrok" cmd /k "ngrok tcp 5000"

echo.
echo ================================================
echo   INSTRUCCIONES
echo ================================================
echo 1. En la ventana de Ngrok, busca la linea:
echo    tcp://X.tcp.ngrok.io:XXXXX
echo.
echo 2. Copia:
echo    - Dominio: X.tcp.ngrok.io
echo    - Puerto: XXXXX
echo.
echo 3. Configura el GPS (Teltonika Config Tool ^> GPRS):
echo    Domain: X.tcp.ngrok.io
echo    Port: XXXXX
echo    Guarda y reinicia el dispositivo
echo.
echo 4. Para probar la conexion (PowerShell):
echo    Test-NetConnection -ComputerName X.tcp.ngrok.io -Port XXXXX
echo    ^(Debe mostrar TcpTestSucceeded: True^)
echo ================================================
echo.
pause
