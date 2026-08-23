#!/bin/bash
# ============================================================
#  EXPORTAR-A-GITHUB.SH  -  Asistente para subir ComunApp
#  a GitHub desde macOS / Linux.
#
#  Opción A (recomendada): instala GitHub CLI (gh) y usa [3]:
#  crea el repositorio y sube todo de forma automática.
#  Opción B: crea el repo vacío en github.com y usa [4].
# ============================================================
cd "$(dirname "$0")"

VERDE='\033[0;32m'
LIMA='\033[1;32m'
AMARILLO='\033[0;33m'
ROJO='\033[0;31m'
GRIS='\033[0;90m'
NC='\033[0m'

ok()    { echo -e "  ${VERDE}[OK]${NC} $1"; }
warn()  { echo -e "  ${AMARILLO}[--]${NC} $1"; }
error() { echo -e "  ${ROJO}[!]${NC} $1"; }
titulo(){ echo -e "  ${LIMA}=== $1 ===${NC}"; }

verificar() {
  clear
  echo ""
  titulo "Requisitos"
  echo ""
  if command -v git >/dev/null 2>&1; then
    ok "git detectado: $(git --version)"
  else
    warn "git NO está instalado."
    echo "       En Mac:  brew install git"
    echo "       En Linux: sudo apt install git  (o equivalente)"
  fi
  echo ""
  if command -v gh >/dev/null 2>&1; then
    ok "GitHub CLI (gh) detectado: $(gh --version | head -1)"
  else
    warn "GitHub CLI no está instalado (opcional pero recomendado)."
    echo "       En Mac:  brew install gh"
    echo "       Con gh, la opción [3] hace todo automáticamente."
  fi
  echo ""
  read -rp "  Presiona Enter para volver al menú..." _
}

preparar() {
  clear
  echo ""
  command -v git >/dev/null 2>&1 || { error "git no está instalado."; read -rp "  Enter para volver..." _; return; }
  titulo "Preparando repositorio local"
  echo ""
  if [ ! -d .git ]; then
    git init
    ok "Repositorio git iniciado."
  else
    ok "Ya existe un repositorio git en esta carpeta."
  fi
  git branch -M main 2>/dev/null
  if ! git config user.name >/dev/null 2>&1; then
    echo ""
    read -rp "  Tu nombre para los commits: " gname
    read -rp "  Tu correo de GitHub: " gemail
    git config user.name "$gname"
    git config user.email "$gemail"
  fi
  echo ""
  echo -e "  ${GRIS}Agregando archivos (se respeta .gitignore: sin node_modules ni dist)...${NC}"
  git add -A
  git commit -m "ComunApp: plataforma de administración de comunidades (v1.0)"
  echo ""
  ok "Repositorio local listo."
  echo -e "  ${GRIS}Siguiente paso: opción [3] (automático) o [4] (manual).${NC}"
  echo ""
  read -rp "  Presiona Enter para volver al menú..." _
}

crear_gh() {
  clear
  echo ""
  [ -d .git ] || { error "Todavía no hay un repositorio local. Ejecuta primero la opción [2]."; read -rp "  Enter para volver..." _; return; }
  git rev-parse HEAD >/dev/null 2>&1 || { error "No hay commits todavía. Ejecuta primero la opción [2]."; read -rp "  Enter para volver..." _; return; }
  command -v gh >/dev/null 2>&1 || {
    error "GitHub CLI no está instalado."
    echo "       En Mac: brew install gh   ·   Alternativa: usa la opción [4]."
    read -rp "  Enter para volver..." _; return;
  }
  if ! gh auth status >/dev/null 2>&1; then
    echo -e "  ${AMARILLO}Primero inicia sesión en GitHub (elige HTTPS y tu navegador):${NC}"
    echo ""
    gh auth login
    gh auth status >/dev/null 2>&1 || return
  fi
  echo ""
  titulo "Crear repositorio en GitHub y subir todo"
  echo ""
  read -rp "  Nombre del repositorio [comunapp]: " repo
  repo=${repo:-comunapp}
  echo ""
  echo "    Visibilidad:"
  echo "      [1] Privado (recomendado)"
  echo "      [2] Público"
  read -rp "  Elige 1 o 2: " visop
  vis="private"
  [ "$visop" = "2" ] && vis="public"
  echo ""
  echo -e "  ${GRIS}Creando repositorio y subiendo el proyecto...${NC}"
  echo ""
  git remote remove origin 2>/dev/null
  if gh repo create "$repo" --"$vis" --source=. --remote=origin --push; then
    echo ""
    ok "¡Listo! Tu proyecto está en GitHub:"
    user=$(gh api user --jq .login 2>/dev/null)
    echo -e "  ${LIMA}https://github.com/${user}/${repo}${NC}"
  else
    echo ""
    error "No se pudo crear el repositorio. Si ya existe con ese nombre,"
    echo "       crea uno nuevo en github.com y usa la opción [4]."
  fi
  echo ""
  read -rp "  Presiona Enter para volver al menú..." _
}

subir_manual() {
  clear
  echo ""
  [ -d .git ] || { error "Todavía no hay un repositorio local. Ejecuta primero la opción [2]."; read -rp "  Enter para volver..." _; return; }
  git rev-parse HEAD >/dev/null 2>&1 || { error "No hay commits todavía. Ejecuta primero la opción [2]."; read -rp "  Enter para volver..." _; return; }
  titulo "Subir a un repositorio existente"
  echo ""
  echo -e "  ${GRIS}Crea primero un repositorio VACÍO en https://github.com/new${NC}"
  echo -e "  ${GRIS}(sin README, sin .gitignore, sin licencia) y copia su URL.${NC}"
  echo ""
  read -rp "  URL del repositorio (https://github.com/TU-USUARIO/comunapp.git): " url
  [ -z "$url" ] && return
  git remote remove origin 2>/dev/null
  git remote add origin "$url"
  git branch -M main 2>/dev/null
  echo ""
  echo -e "  ${GRIS}Subiendo... si pide credenciales, usa un Personal Access Token${NC}"
  echo -e "  ${GRIS}(github.com → Settings → Developer settings → Tokens) como contraseña.${NC}"
  echo ""
  git push -u origin main
  echo ""
  ok "Proceso terminado. Revisa tu repositorio en GitHub."
  echo ""
  read -rp "  Presiona Enter para volver al menú..." _
}

estado() {
  clear
  echo ""
  titulo "Estado del repositorio local"
  echo ""
  [ -d .git ] || { error "Todavía no hay un repositorio local."; read -rp "  Enter para volver..." _; return; }
  echo "  Cambios sin commitear:"
  git status --short | sed 's/^/    /'
  echo ""
  echo "  Últimos commits:"
  git log --oneline -5 2>/dev/null | sed 's/^/    /'
  echo ""
  echo "  Remotos configurados:"
  git remote -v | sed 's/^/    /'
  echo ""
  read -rp "  Presiona Enter para volver al menú..." _
}

while true; do
  clear
  echo ""
  echo "  =========================================================="
  echo -e "     ${LIMA}C O M U N A P P${NC}  -  Exportar proyecto a GitHub"
  echo "  =========================================================="
  echo ""
  echo "     [1] Verificar requisitos (git y gh CLI)"
  echo "     [2] Preparar repositorio local (init + commit)"
  echo "     [3] Crear repo en GitHub y subir TODO (requiere gh CLI)"
  echo "     [4] Subir a un repositorio que ya creaste en GitHub"
  echo "     [5] Ver estado del repositorio local"
  echo "     [0] Salir"
  echo ""
  read -rp "  Elige una opción y presiona Enter: " op
  case "$op" in
    1) verificar ;;
    2) preparar ;;
    3) crear_gh ;;
    4) subir_manual ;;
    5) estado ;;
    0) echo -e "  ${GRIS}¡Hasta pronto!${NC}"; exit 0 ;;
    *) ;;
  esac
done
