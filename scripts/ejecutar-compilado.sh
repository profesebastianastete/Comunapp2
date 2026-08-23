#!/bin/bash
# ============================================================
#  COMUNAPP - LANZADOR DE LA VERSION COMPILADA (macOS / Linux)
#  Sirve la carpeta dist/ (build de produccion) y abre
#  la aplicacion en el navegador automaticamente.
#  Nota: vive en scripts/ y apunta a la raiz del proyecto.
# ============================================================
cd "$(dirname "$0")/.."

if [ ! -f "dist/index.html" ]; then
  echo ""
  echo "  [!] No se encontró la carpeta dist/ con la aplicación compilada."
  echo "      Ejecuta primero:  npm run build"
  echo ""
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo ""
  echo "  [!] Se necesita Python 3 para servir la app compilada."
  echo "      En Mac:  brew install python"
  echo ""
  exit 1
fi

echo ""
echo "  =============================================="
echo "    C O M U N A P P  -  versión compilada"
echo "    http://127.0.0.1:4173"
echo "    Se abrirá sola en tu navegador."
echo "    Ctrl + C  detiene el servidor."
echo "  =============================================="
echo ""

# abre el navegador 2 segundos después (en segundo plano)
(
  sleep 2
  if command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:4173"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:4173"
  fi
) &

# servidor en primer plano: Ctrl+C solo detiene este servidor
python3 -m http.server 4173 --directory dist
