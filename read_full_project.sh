#!/bin/bash
# ============================================================
#  SkilledProz Hirer App — Full Project Reader v2
#  Run from project root: bash read_full_project.sh
#  Output: full_snapshot.txt  (upload this file to Claude)
# ============================================================

OUT="full_snapshot.txt"
> "$OUT"

# ── Colours for terminal (not written to file) ───────────────
CYAN='\033[0;36m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
MAGENTA='\033[0;35m'; BOLD='\033[1m'; RESET='\033[0m'

section()  { echo -e "\n${YELLOW}${BOLD}━━━ $1 ━━━${RESET}"; }
ok()       { echo -e "  ${GREEN}✅  $1${RESET}"; }
skip()     { echo -e "  ${CYAN}⏭   $1 (not found)${RESET}"; }

# ── Write a file into the snapshot ──────────────────────────
dump() {
  local f="$1"
  if [ -f "$f" ]; then
    printf '\n\n╔══════════════════════════════════════════════════════════╗\n' >> "$OUT"
    printf '  FILE: %s\n' "$f" >> "$OUT"
    printf '╚══════════════════════════════════════════════════════════╝\n' >> "$OUT"
    cat "$f" >> "$OUT"
    ok "$f"
  else
    skip "$f"
  fi
}

# ── Header ───────────────────────────────────────────────────
cat >> "$OUT" << 'HDR'
╔══════════════════════════════════════════════════════════════╗
║          SkilledProz Hirer App — Full Codebase Snapshot      ║
╚══════════════════════════════════════════════════════════════╝
HDR

# ── File tree ────────────────────────────────────────────────
section "FILE TREE"
echo -e "\n\n=== PROJECT FILE TREE ===\n" >> "$OUT"
if command -v tree &>/dev/null; then
  tree -I 'node_modules|.expo|.git|*.bak|__pycache__|*.png|*.jpg|*.jpeg|*.gif|*.webp|*.ttf|*.otf' \
       --dirsfirst -a >> "$OUT" 2>/dev/null
else
  find . -not \( -path './node_modules/*' -o -path './.expo/*' -o -path './.git/*' \) \
         -not \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.gif' \
              -o -name '*.ttf' -o -name '*.otf' -o -name '*.bak' \) \
         | sort >> "$OUT"
fi

# ════════════════════════════════════════════════════════════
#  ROOT CONFIG
# ════════════════════════════════════════════════════════════
section "ROOT CONFIG"
for f in App.js app.json package.json babel.config.js; do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  API
# ════════════════════════════════════════════════════════════
section "API"
for f in \
  src/api/client.js \
  src/api/hirer.js \
  src/api/categories.js \
  src/api/settings.js
do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  COMPONENTS (every .js in src/components)
# ════════════════════════════════════════════════════════════
section "COMPONENTS"
if [ -d "src/components" ]; then
  for f in src/components/*.js; do dump "$f"; done
else
  skip "src/components"
fi

# ════════════════════════════════════════════════════════════
#  CONSTANTS
# ════════════════════════════════════════════════════════════
section "CONSTANTS"
for f in \
  src/constants/theme.js \
  src/constants/currencies.js \
  src/constants/languages.js
do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  CONTEXTS
# ════════════════════════════════════════════════════════════
section "CONTEXTS"
for f in \
  src/contexts/ThemeContext.js \
  src/contexts/CurrencyContext.js \
  src/contexts/ToastContext.js
do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  STORE
# ════════════════════════════════════════════════════════════
section "STORE"
for f in src/store/*.js; do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  i18n + LOCALES
# ════════════════════════════════════════════════════════════
section "i18n"
dump "src/i18n/index.js"
for f in src/i18n/locales/*.json; do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  NAVIGATION
# ════════════════════════════════════════════════════════════
section "NAVIGATION"
for f in \
  src/navigation/RootNavigator.js \
  src/navigation/AuthNavigator.js \
  src/navigation/HirerNavigator.js
do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  SCREENS — AUTH
# ════════════════════════════════════════════════════════════
section "SCREENS / AUTH"
for f in src/screens/auth/*.js; do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  SCREENS — MAIN
# ════════════════════════════════════════════════════════════
section "SCREENS / MAIN"
for f in src/screens/main/*.js; do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  UTILS
# ════════════════════════════════════════════════════════════
section "UTILS"
for f in src/utils/*.js; do dump "$f"; done

# ════════════════════════════════════════════════════════════
#  HOOKS (if any)
# ════════════════════════════════════════════════════════════
section "HOOKS"
if [ -d "src/hooks" ]; then
  for f in src/hooks/*.js; do dump "$f"; done
else
  skip "src/hooks"
fi

# ════════════════════════════════════════════════════════════
#  SUMMARY
# ════════════════════════════════════════════════════════════
echo -e "\n\n╔══════════════════════════════════════════════════════════╗" >> "$OUT"
echo    "  SNAPSHOT COMPLETE" >> "$OUT"
echo -e "╚══════════════════════════════════════════════════════════╝\n" >> "$OUT"

FILE_COUNT=$(grep -c '^  FILE:' "$OUT" 2>/dev/null || echo "?")

echo ""
echo -e "${MAGENTA}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Snapshot complete!                 ║"
echo "  ║                                      ║"
printf "  ║   Files captured : %-17s║\n" "$FILE_COUNT"
printf "  ║   Output file    : %-17s║\n" "$OUT"
echo "  ╚══════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  ${CYAN}Upload ${BOLD}$OUT${RESET}${CYAN} to Claude and ask any question.${RESET}"
echo ""