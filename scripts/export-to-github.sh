#!/bin/bash
# ============================================================
#  EXPORT-TO-GITHUB.SH  -  Assistant to upload ComunApp
#  to GitHub from macOS / Linux.
#  Note: lives in scripts/ and points to project root.
#
#  Option A (recommended): install GitHub CLI (gh) and use [3]:
#  creates the repository and uploads everything automatically.
#  Option B: create empty repo at github.com and use [4].
# ============================================================
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
LIME='\033[1;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

ok()    { echo -e "  ${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "  ${YELLOW}[--]${NC} $1"; }
error() { echo -e "  ${RED}[!]${NC} $1"; }
title() { echo -e "  ${LIME}=== $1 ===${NC}"; }

check_requirements() {
  clear
  echo ""
  title "Requirements"
  echo ""
  if command -v git >/dev/null 2>&1; then
    ok "Git installed: $(git --version | cut -d' ' -f3)"
  else
    error "Git not found. Install from https://git-scm.com"
    exit 1
  fi
  
  if command -v gh >/dev/null 2>&1; then
    ok "GitHub CLI installed: $(gh --version | head -1)"
  else
    warn "GitHub CLI (gh) not found."
    echo "   Recommended for automatic repo creation."
    echo "   Install: brew install gh  OR  visit https://cli.github.com"
  fi
  echo ""
}

show_menu() {
  title "Export to GitHub"
  echo ""
  echo "  [1] Check requirements"
  echo "  [2] Auth with GitHub (gh auth login)"
  echo "  [3] Create repo & push (automatic, needs gh)"
  echo "  [4] Push to existing repo (manual)"
  echo "  [0] Exit"
  echo ""
  read -p "  Choose option: " opt
}

check_requirements

while true; do
  show_menu
  case $opt in
    1) check_requirements; read -p "Press Enter to continue...";;
    2) gh auth login; ok "Auth completed"; read -p "Press Enter to continue...";;
    3)
      echo ""
      read -p "Repository name (default: comunapp): " REPO_NAME
      REPO_NAME=${REPO_NAME:-comunapp}
      echo ""
      title "Creating repository: $REPO_NAME"
      gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
      ok "Repository created and pushed!"
      echo ""
      echo "  URL: https://github.com/$(gh api user | jq -r .login)/$REPO_NAME"
      echo ""
      read -p "Press Enter to continue..."
      ;;
    4)
      echo ""
      read -p "Enter remote URL (e.g., https://github.com/user/repo.git): " REMOTE_URL
      if [ -n "$REMOTE_URL" ]; then
        git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
        git branch -M main
        git push -u origin main
        ok "Pushed to $REMOTE_URL"
      fi
      read -p "Press Enter to continue..."
      ;;
    0) exit 0;;
    *) error "Invalid option";;
  esac
done
