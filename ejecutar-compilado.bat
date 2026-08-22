@echo off
chcp 65001 >nul
title ComunApp - Aplicacion compilada
cd /d "%~dp0"

REM ============================================================
REM  COMUNAPP - LANZADOR DE LA VERSION COMPILADA (Windows)
REM  Sirve la carpeta dist\ (build de produccion) y abre
REM  la aplicacion en el navegador automaticamente.
REM ============================================================

if not exist dist\index.html (
  echo.
  echo   [!] No se encontro la carpeta dist\ con la aplicacion compilada.
  echo       Ejecuta primero:  npm run build
  echo.
  pause
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] Se necesita Python para servir la app compilada.
  echo       Instalalo desde https://www.python.org (marca "Add to PATH").
  echo.
  pause
  exit /b 1
)

echo.
echo   ==============================================
echo     C O M U N A P P  -  version compilada
echo     http://127.0.0.1:4173
echo     Se abrira sola en tu navegador.
echo     Ctrl + C  detiene el servidor.
echo   ==============================================
echo.

REM abre el navegador 2 segundos despues (proceso auxiliar)
start "" cmd /c "timeout /t 2 /nobreak >nul && start """" http://127.0.0.1:4173"

REM servidor en primer plano: Ctrl+C solo detiene este servidor
python -m http.server 4173 --directory dist
