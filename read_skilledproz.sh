#!/bin/bash
# paste the script content here
#!/bin/bash

# ============================================================
#  SkilledProz Hirer App — Full Codebase Reader
#  Run from the project root: bash read_skilledproz.sh
# ============================================================

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

divider() {
  echo -e "${CYAN}══════════════════════════════════════════════════════════${RESET}"
}

section() {
  echo ""
  divider
  echo -e "${YELLOW}${BOLD}  📁 $1${RESET}"
  divider
}

print_file() {
  local filepath="$1"
  if [ -f "$filepath" ]; then
    echo ""
    echo -e "${GREEN}┌─ 📄 $filepath${RESET}"
    echo -e "${GREEN}└──────────────────────────────────────────────────────${RESET}"
    cat "$filepath"
    echo ""
    echo -e "${GREEN}──────────────────────────────────────────────────────${RESET}"
  else
    echo -e "${RED}  ⚠️  File not found: $filepath${RESET}"
  fi
}

echo ""
echo -e "${MAGENTA}${BOLD}"
echo "  ███████╗██╗  ██╗██╗██╗     ██╗     ███████╗██████╗ "
echo "  ██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝██╔══██╗"
echo "  ███████╗█████╔╝ ██║██║     ██║     █████╗  ██║  ██║"
echo "  ╚════██║██╔═██╗ ██║██║     ██║     ██╔══╝  ██║  ██║"
echo "  ███████║██║  ██╗██║███████╗███████╗███████╗██████╔╝"
echo "  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═════╝ "
echo -e "${RESET}"
echo -e "${BOLD}         SkilledProz Hirer App — Codebase Overview${RESET}"
echo ""

# ── API ────────────────────────────────────────────────────
section "API"
print_file "src/api/client.js"
print_file "src/api/hirer.js"

# ── COMPONENTS ─────────────────────────────────────────────
section "COMPONENTS"
for f in \
  src/components/AppButton.js \
  src/components/AppCurrency.js \
  src/components/AppInput.js \
  src/components/AppScreen.js \
  src/components/AppText.js \
  src/components/Avatar.js \
  src/components/Badge.js \
  src/components/BookingRow.js \
  src/components/Card.js \
  src/components/CurrencyPicker.js \
  src/components/DrawerContent.js \
  src/components/SectionHeader.js \
  src/components/SkilledProzLogo.js \
  src/components/SkilledProzWordmark.js \
  src/components/StatCard.js \
  src/components/TopBar.js \
  src/components/WorkerRow.js
do
  print_file "$f"
done

# ── CONSTANTS ──────────────────────────────────────────────
section "CONSTANTS"
print_file "src/constants/currencies.js"
print_file "src/constants/languages.js"
print_file "src/constants/theme.js"

# ── CONTEXTS ───────────────────────────────────────────────
section "CONTEXTS"
print_file "src/contexts/CurrencyContext.js"
print_file "src/contexts/ThemeContext.js"
print_file "src/contexts/ToastContext.js"

# ── i18n / LOCALES ─────────────────────────────────────────
section "i18n — LOCALES"
print_file "src/i18n/index.js"
print_file "src/i18n/locales/en.json"
print_file "src/i18n/locales/ar.json"
print_file "src/i18n/locales/es.json"
print_file "src/i18n/locales/fr.json"
print_file "src/i18n/locales/pt.json"

# ── NAVIGATION ─────────────────────────────────────────────
section "NAVIGATION"
print_file "src/navigation/RootNavigator.js"
print_file "src/navigation/AuthNavigator.js"
print_file "src/navigation/HirerNavigator.js"

# ── SCREENS — AUTH ─────────────────────────────────────────
section "SCREENS / AUTH"
print_file "src/screens/auth/WelcomeScreen.js"
print_file "src/screens/auth/LoginScreen.js"
print_file "src/screens/auth/RegisterScreen.js"
print_file "src/screens/auth/ForgotPasswordScreen.js"
print_file "src/screens/auth/VerifyEmailScreen.js"

# ── SCREENS — MAIN ─────────────────────────────────────────
section "SCREENS / MAIN"
print_file "src/screens/main/DashboardScreen.js"
print_file "src/screens/main/PlaceholderScreen.js"

# ── STORE ──────────────────────────────────────────────────
section "STORE"
print_file "src/store/authStore.js"

# ── UTILS ──────────────────────────────────────────────────
section "UTILS"
print_file "src/utils/validators.js"

# ── ROOT FILES ─────────────────────────────────────────────
section "ROOT FILES"
print_file "src/App.js"
print_file "app.json"
print_file "package.json"
print_file "babel.config.js"

# ── SUMMARY ────────────────────────────────────────────────
echo ""
divider
echo -e "${MAGENTA}${BOLD}  ✅  Read complete — you are now up to speed on SkilledProz Hirer App${RESET}"
divider
echo ""

echo -e "${BOLD}Quick reference — key entry points:${RESET}"
echo -e "  ${CYAN}Navigation root  ${RESET} → src/navigation/RootNavigator.js"
echo -e "  ${CYAN}Auth flow        ${RESET} → src/navigation/AuthNavigator.js"
echo -e "  ${CYAN}Hirer tabs       ${RESET} → src/navigation/HirerNavigator.js"
echo -e "  ${CYAN}API client       ${RESET} → src/api/client.js"
echo -e "  ${CYAN}Hirer endpoints  ${RESET} → src/api/hirer.js"
echo -e "  ${CYAN}Auth state       ${RESET} → src/store/authStore.js"
echo -e "  ${CYAN}Theme tokens     ${RESET} → src/constants/theme.js"
echo -e "  ${CYAN}Dashboard        ${RESET} → src/screens/main/DashboardScreen.js"
echo ""