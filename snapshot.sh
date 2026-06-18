#!/bin/bash
# ============================================================
#  SkilledProz Hirer App — Full Codebase Snapshot Script
#  Usage:  bash snapshot.sh
#  Output: full_snapshot.txt  (in project root)
#
#  Captures every source file in the project — components,
#  screens, API, contexts, navigation, i18n, constants, store.
#  Skips: node_modules, .expo, .git, build/dist, binaries,
#         images, fonts, lock files, and the snapshot itself.
# ============================================================

OUTPUT="full_snapshot.txt"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Directories to include (relative to project root) ────────
INCLUDE_DIRS=(
  "src/api"
  "src/components"
  "src/constants"
  "src/contexts"
  "src/hooks"
  "src/i18n"
  "src/navigation"
  "src/screens"
  "src/store"
  "src/utils"
  "src/assets"
)

# ── Root-level files to always include ───────────────────────
ROOT_FILES=(
  "App.js"
  "app.json"
  "package.json"
  "babel.config.js"
  "metro.config.js"
  "tsconfig.json"
  "eas.json"
  ".env.example"
)

# ── File extensions to capture ───────────────────────────────
INCLUDE_EXT="\.js$|\.jsx$|\.ts$|\.tsx$|\.json$|\.md$|\.sh$|\.env\.example$"

# ── Paths/names to always skip ────────────────────────────────
SKIP_PATTERNS=(
  "node_modules"
  ".expo"
  ".git"
  "dist"
  "build"
  ".DS_Store"
  "package-lock.json"
  "yarn.lock"
  "full_snapshot.txt"
  "codebase_snapshot.txt"
  "__pycache__"
  ".nyc_output"
  "coverage"
)

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

box() {
  local msg="$1"
  local len=${#msg}
  local border=$(printf '═%.0s' $(seq 1 $((len + 4))))
  echo "╔${border}╗"
  echo "║  ${msg}  ║"
  echo "╚${border}╝"
}

should_skip() {
  local path="$1"
  for pat in "${SKIP_PATTERNS[@]}"; do
    if [[ "$path" == *"$pat"* ]]; then
      return 0
    fi
  done
  return 1
}

is_text_file() {
  local f="$1"
  # Use file command if available, else trust extension
  if command -v file &>/dev/null; then
    file "$f" | grep -qiE "text|json|empty"
  else
    echo "$f" | grep -qE "$INCLUDE_EXT"
  fi
}

write_file_block() {
  local filepath="$1"
  local relpath="${filepath#$PROJECT_ROOT/}"

  # Skip binary / image / font files by extension
  if ! echo "$relpath" | grep -qE "$INCLUDE_EXT"; then
    return
  fi

  # Skip excluded paths
  if should_skip "$relpath"; then
    return
  fi

  # Skip empty files
  if [ ! -s "$filepath" ]; then
    return
  fi

  echo ""
  box "FILE: $relpath"
  cat "$filepath"
  echo ""
  echo "# ── end of $relpath ────────────────────────────────────────────"
}

# ─────────────────────────────────────────────────────────────
# Start writing snapshot
# ─────────────────────────────────────────────────────────────

cd "$PROJECT_ROOT"

{
  # ── Header ────────────────────────────────────────────────
  box "SkilledProz Hirer App — Full Codebase Snapshot"
  echo ""
  echo "Generated : $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Root      : $PROJECT_ROOT"
  echo "Platform  : $(uname -s) $(uname -m)"
  echo ""

  # ── File Tree ─────────────────────────────────────────────
  echo "=== PROJECT FILE TREE ==="
  echo ""
  if command -v tree &>/dev/null; then
    tree -a -I "node_modules|.expo|.git|dist|build|*.png|*.jpg|*.jpeg|*.gif|*.webp|*.svg|*.ttf|*.otf|*.woff|*.woff2|package-lock.json|yarn.lock|full_snapshot.txt|codebase_snapshot.txt" --dirsfirst
  else
    # Fallback: find + indent
    find . \
      -not -path "*/node_modules/*" \
      -not -path "*/.expo/*" \
      -not -path "*/.git/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" \
      -not -name "*.png" \
      -not -name "*.jpg" \
      -not -name "*.jpeg" \
      -not -name "*.gif" \
      -not -name "*.webp" \
      -not -name "*.ttf" \
      -not -name "*.otf" \
      -not -name "package-lock.json" \
      -not -name "yarn.lock" \
      -not -name "full_snapshot.txt" \
      -not -name "codebase_snapshot.txt" \
      | sort | sed 's|[^/]*/|  |g'
  fi
  echo ""

  # ── Package info ──────────────────────────────────────────
  echo "=== package.json SUMMARY ==="
  echo ""
  if [ -f "package.json" ]; then
    # Print name, version, dependencies count
    node -e "
      const p = require('./package.json');
      const deps = Object.keys(p.dependencies || {}).length;
      const dev  = Object.keys(p.devDependencies || {}).length;
      console.log('Name    :', p.name);
      console.log('Version :', p.version);
      console.log('Deps    :', deps, 'runtime,', dev, 'dev');
      console.log('');
      console.log('Key dependencies:');
      const key = ['expo','react','react-native','@react-navigation/native',
                   'axios','zustand','react-i18next','i18next'];
      key.forEach(k => {
        const v = (p.dependencies || {})[k] || (p.devDependencies || {})[k];
        if (v) console.log(' ', k + ':', v);
      });
    " 2>/dev/null || cat package.json
  fi
  echo ""

  # ── Root-level files ─────────────────────────────────────
  echo "=== ROOT FILES ==="
  for f in "${ROOT_FILES[@]}"; do
    if [ -f "$f" ]; then
      write_file_block "$PROJECT_ROOT/$f"
    fi
  done

  # ── Source directories — alphabetical, grouped ────────────
  echo ""
  echo "=== SOURCE FILES ==="
  echo ""

  for dir in "${INCLUDE_DIRS[@]}"; do
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
      continue
    fi

    echo ""
    echo "┌─────────────────────────────────────────────────────────┐"
    echo "│  DIRECTORY: $dir"
    echo "└─────────────────────────────────────────────────────────┘"
    echo ""

    # Find all files, sorted, respecting skip list
    while IFS= read -r -d '' filepath; do
      write_file_block "$filepath"
    done < <(find "$PROJECT_ROOT/$dir" -type f -print0 | sort -z)
  done

  # ── Anything in src/ not already captured ─────────────────
  # (handles extra dirs like src/types, src/services etc)
  if [ -d "$PROJECT_ROOT/src" ]; then
    while IFS= read -r -d '' filepath; do
      relpath="${filepath#$PROJECT_ROOT/}"
      # Skip if already covered by INCLUDE_DIRS
      already=false
      for dir in "${INCLUDE_DIRS[@]}"; do
        if [[ "$relpath" == "$dir"* ]]; then
          already=true
          break
        fi
      done
      if [ "$already" = false ]; then
        write_file_block "$filepath"
      fi
    done < <(find "$PROJECT_ROOT/src" -type f -print0 | sort -z)
  fi

  # ── Summary ───────────────────────────────────────────────
  echo ""
  echo "=== SNAPSHOT SUMMARY ==="
  echo ""

  total_files=0
  total_lines=0

  for dir in "${INCLUDE_DIRS[@]}"; do
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then continue; fi
    count=$(find "$PROJECT_ROOT/$dir" -type f | grep -cE "$INCLUDE_EXT" 2>/dev/null || echo 0)
    lines=$(find "$PROJECT_ROOT/$dir" -type f | grep -E "$INCLUDE_EXT" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
    lines=${lines:-0}
    total_files=$((total_files + count))
    total_lines=$((total_lines + lines))
    printf "  %-30s  %3d files   %6d lines\n" "$dir" "$count" "$lines"
  done

  echo ""
  printf "  %-30s  %3d files   %6d lines\n" "TOTAL" "$total_files" "$total_lines"
  echo ""
  echo "Snapshot complete: $(date '+%Y-%m-%d %H:%M:%S')"

} > "$OUTPUT"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅  Snapshot written to $OUTPUT  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Size  : $(du -sh "$OUTPUT" | cut -f1)"
echo "  Lines : $(wc -l < "$OUTPUT")"
echo ""
echo "  Upload $OUTPUT to Claude for a full audit."
echo ""