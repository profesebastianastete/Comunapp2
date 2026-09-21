#!/bin/bash
# ============================================================
#  COMUNAPP - COMPILED VERSION LAUNCHER (macOS / Linux)
#  Serves the dist/ folder (production build) and opens
#  the application in the browser automatically.
#  Note: lives in scripts/ and points to project root.
# ============================================================
cd "$(dirname "$0")/.."

if [ ! -f "dist/index.html" ]; then
  echo ""
  echo "  [!] dist/ folder with compiled app not found."
  echo "      First run:  npm run build"
  echo ""
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo ""
  echo "  [!] Python 3 is needed to serve the compiled app."
  echo "      On Mac:  brew install python"
  echo ""
  exit 1
fi

echo ""
echo "  =============================================="
echo "    C O M U N A P P  -  compiled version"
echo "    http://127.0.0.1:4173"
echo "    Will open automatically in your browser."
echo "    Ctrl + C  stops the server."
echo "  =============================================="
echo ""

# open browser 2 seconds later (in background)
(
  sleep 2
  if command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:4173"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:4173"
  fi
) &

# server in foreground: Ctrl+C only stops this server
python3 -m http.server 4173 --directory dist
