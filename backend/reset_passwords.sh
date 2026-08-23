#!/bin/bash
# Restaura las contraseñas demo de ComunApp (Railway Shell o local).
# Uso:  bash reset_passwords.sh
cd "$(dirname "$0")"

PY=python3
command -v python3 >/dev/null 2>&1 || PY=python
command -v "$PY" >/dev/null 2>&1 || { echo "[!] No se encontró python3 ni python en este entorno."; exit 1; }

echo "Usando: $($PY --version)"
"$PY" seed.py --reset-passwords
