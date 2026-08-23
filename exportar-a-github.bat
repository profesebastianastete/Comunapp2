@echo off
chcp 65001 >nul
title ComunApp - Exportar a GitHub
cd /d "%~dp0"
setlocal

REM ============================================================
REM  EXPORTAR-A-GITHUB.BAT  -  Asistente para subir ComunApp
REM  a GitHub desde Windows.
REM
REM  Opcion A (recomendada): instala GitHub CLI (gh) y usa la
REM  opcion [3]: crea el repositorio y sube todo automatico.
REM  Opcion B: crea el repo vacio en github.com y usa la [4].
REM ============================================================

:menu
cls
echo.
echo   ==========================================================
echo      C O M U N A P P  -  Exportar proyecto a GitHub
echo   ==========================================================
echo.
echo      [1] Verificar requisitos (git y gh CLI)
echo      [2] Preparar repositorio local (init + commit)
echo      [3] Crear repo en GitHub y subir TODO (requiere gh CLI)
echo      [4] Subir a un repositorio que ya creaste en GitHub
echo      [5] Ver estado del repositorio local
echo      [0] Salir
echo.
set "op="
set /p op="   Elige una opcion y presiona Enter: "
if "%op%"=="1" goto verificar
if "%op%"=="2" goto preparar
if "%op%"=="3" goto crear_gh
if "%op%"=="4" goto subir_manual
if "%op%"=="5" goto estado
if "%op%"=="0" goto fin
goto menu

REM ------------------------------------------------------------
:verificar
cls
echo.
echo   === Requisitos ===
echo.
where git >nul 2>nul
if errorlevel 1 goto v_sin_git
echo   [OK] git detectado:
git --version
goto v_gh
:v_sin_git
echo   [--] git NO esta instalado.
echo        Descargalo de https://git-scm.com/download/win
echo        e instalalo con las opciones por defecto.
:v_gh
echo.
where gh >nul 2>nul
if errorlevel 1 goto v_sin_gh
echo   [OK] GitHub CLI (gh) detectado:
gh --version
goto v_fin
:v_sin_gh
echo   [--] GitHub CLI no esta instalado (opcional pero recomendado).
echo        Instalarlo:  winget install --id GitHub.cli
echo        Con gh, la opcion [3] hace todo automaticamente.
:v_fin
echo.
pause
goto menu

REM ------------------------------------------------------------
:preparar
cls
echo.
where git >nul 2>nul
if errorlevel 1 goto sin_git
echo   === Preparando repositorio local ===
echo.
if not exist .git (
  git init
  echo   Repositorio git iniciado.
) else (
  echo   Ya existe un repositorio git en esta carpeta.
)
git branch -M main >nul 2>nul
git config user.name >nul 2>nul
if errorlevel 1 goto pedir_datos
goto hacer_commit
:pedir_datos
echo.
set /p gname="   Tu nombre para los commits: "
set /p gemail="   Tu correo de GitHub: "
git config user.name "%gname%"
git config user.email "%gemail%"
:hacer_commit
echo.
echo   Agregando archivos (se respeta .gitignore: sin node_modules ni dist)...
git add -A
git commit -m "ComunApp: plataforma de administracion de comunidades (v1.0)"
echo.
echo   Repositorio local listo.
echo   Siguiente paso: opcion [3] (automatico) o [4] (manual).
echo.
pause
goto menu

REM ------------------------------------------------------------
:crear_gh
cls
echo.
if not exist .git goto falta_repo
git rev-parse HEAD >nul 2>&1
if errorlevel 1 goto sin_commit
where gh >nul 2>nul
if errorlevel 1 goto sin_gh
gh auth status >nul 2>&1
if errorlevel 1 goto gh_login
goto gh_datos
:gh_login
echo   Primero inicia sesion en GitHub (elige HTTPS y tu navegador):
echo.
gh auth login
gh auth status >nul 2>&1
if errorlevel 1 goto menu
:gh_datos
echo.
echo   === Crear repositorio en GitHub y subir todo ===
echo.
set /p repo="   Nombre del repositorio [comunapp]: "
if "%repo%"=="" set repo=comunapp
echo.
echo     Visibilidad:
echo       [1] Privado (recomendado)
echo       [2] Publico
set /p visop="   Elige 1 o 2: "
set vis=private
if "%visop%"=="2" set vis=public
echo.
echo   Creando repositorio y subiendo el proyecto...
echo.
git remote remove origin >nul 2>&1
gh repo create "%repo%" --%vis% --source=. --remote=origin --push
if errorlevel 1 goto gh_error
echo.
echo   Listo. Tu proyecto esta en GitHub:
echo   https://github.com/TU-USUARIO/%repo%
echo.
pause
goto menu
:gh_error
echo.
echo   No se pudo crear el repositorio. Si ya existe con ese nombre,
echo   crea uno nuevo en github.com y usa la opcion [4].
echo.
pause
goto menu

REM ------------------------------------------------------------
:subir_manual
cls
echo.
if not exist .git goto falta_repo
git rev-parse HEAD >nul 2>&1
if errorlevel 1 goto sin_commit
echo   === Subir a un repositorio existente ===
echo.
echo   Crea primero un repositorio VACIO en https://github.com/new
echo   (sin README, sin .gitignore, sin licencia) y copia su URL.
echo.
set /p url="   URL del repositorio (https://github.com/TU-USUARIO/comunapp.git): "
if "%url%"=="" goto menu
git remote remove origin >nul 2>&1
git remote add origin "%url%"
git branch -M main >nul 2>nul
echo.
echo   Subiendo... si pide credenciales, usa un Personal Access Token
echo   (github.com - Settings - Developer settings - Tokens) como clave.
echo.
git push -u origin main
echo.
echo   Proceso terminado. Revisa tu repositorio en GitHub.
echo.
pause
goto menu

REM ------------------------------------------------------------
:estado
cls
echo.
echo   === Estado del repositorio local ===
echo.
if not exist .git goto falta_repo
git status --short
echo.
echo   Ultimos commits:
git log --oneline -5 2>nul
echo.
echo   Remotos configurados:
git remote -v
echo.
pause
goto menu

REM ------------------------------------------------------------
:sin_git
echo.
echo   [!] git no esta instalado. Descargalo de https://git-scm.com
echo       y vuelve a ejecutar este asistente.
echo.
pause
goto menu

:sin_gh
echo.
echo   [!] GitHub CLI no esta instalado.
echo       Instalarlo:  winget install --id GitHub.cli
echo       Alternativa: crea el repo en github.com y usa la opcion [4].
echo.
pause
goto menu

:falta_repo
echo.
echo   [!] Todavia no hay un repositorio local.
echo       Ejecuta primero la opcion [2].
echo.
pause
goto menu

:sin_commit
echo.
echo   [!] El repositorio local no tiene commits todavia.
echo       Ejecuta primero la opcion [2].
echo.
pause
goto menu

:fin
endlocal
exit /b 0
