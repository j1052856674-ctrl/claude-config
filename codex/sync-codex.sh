#!/usr/bin/env bash
# Codex adapter sync script
# Usage: bash codex/sync-codex.sh <status|deploy>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"
CONFIG="${SCRIPT_DIR}/sync-codex.json"

items=("AGENTS.md" "skills/" "prompts/" "workflows/" "references/")

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

same_file() {
  [ -f "$1" ] && [ -f "$2" ] && [ "$(sha256 "$1")" = "$(sha256 "$2")" ]
}

copy_file() {
  local src="$1" dst="$2" label="$3"
  mkdir -p "$(dirname "$dst")"
  if same_file "$src" "$dst"; then
    echo "  [skip] ${label}"
  else
    cp "$src" "$dst"
    echo "  [write] ${label}"
  fi
}

copy_dir() {
  local src="$1" dst="$2" label="$3"
  if [ ! -d "$src" ]; then
    echo "  [skip] ${label} missing in repo"
    return
  fi
  mkdir -p "$dst"
  local changed=0 skipped=0
  while IFS= read -r -d '' file; do
    local rel="${file#$src/}"
    local target="${dst}/${rel}"
    mkdir -p "$(dirname "$target")"
    if same_file "$file" "$target"; then
      skipped=$((skipped + 1))
    else
      cp "$file" "$target"
      changed=$((changed + 1))
    fi
  done < <(find "$src" -type f -print0)
  echo "  [dir] ${label}: ${changed} changed, ${skipped} unchanged"
}

status() {
  echo "Codex sync status"
  echo "  source: ${SCRIPT_DIR}"
  echo "  target: ${CODEX_HOME}"
  echo ""
  for item in "${items[@]}"; do
    local src="${SCRIPT_DIR}/${item}"
    local dst="${CODEX_HOME}/${item}"
    if [ -e "$src" ]; then src_state="present"; else src_state="missing"; fi
    if [ -e "$dst" ]; then dst_state="present"; else dst_state="missing"; fi
    printf "  %-14s source:%-8s target:%-8s\n" "$item" "$src_state" "$dst_state"
  done
}

deploy() {
  echo "Deploying Codex adapter assets"
  echo "  source: ${SCRIPT_DIR}"
  echo "  target: ${CODEX_HOME}"
  echo ""
  mkdir -p "$CODEX_HOME"
  copy_file "${SCRIPT_DIR}/AGENTS.md" "${CODEX_HOME}/AGENTS.md" "AGENTS.md"
  copy_dir "${SCRIPT_DIR}/skills" "${CODEX_HOME}/skills" "skills/"
  copy_dir "${SCRIPT_DIR}/prompts" "${CODEX_HOME}/prompts" "prompts/"
  copy_dir "${SCRIPT_DIR}/workflows" "${CODEX_HOME}/workflows" "workflows/"
  copy_dir "${SCRIPT_DIR}/references" "${CODEX_HOME}/references" "references/"
}

case "${1:-}" in
  status) status ;;
  deploy) deploy ;;
  *)
    echo "Usage: bash codex/sync-codex.sh <status|deploy>"
    exit 1
    ;;
esac
