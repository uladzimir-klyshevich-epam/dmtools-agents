#!/usr/bin/env bash
# Install Playwright Python package and Chromium browser dependencies.
#
# Usage:
#   playwright.sh [version]                  # Python package version
#   PLAYWRIGHT_VERSION=1.52.0 playwright.sh  # env override
#
# Version examples: latest (default), 1.52.0
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

PLAYWRIGHT_VERSION="${1:-${PLAYWRIGHT_VERSION:-latest}}"

echo "🎭 Playwright (${PLAYWRIGHT_VERSION})"

if ! is_installed python3; then
  echo "❌ python3 not found. Install Python before Playwright." >&2
  exit 1
fi

# ── Skip if already installed ────────────────────────────────────────────────
_check_playwright_installed() {
  local desired_version="$1"
  if ! python3 -c "import playwright" 2>/dev/null; then
    return 1
  fi
  if [ "${desired_version}" = "latest" ] || [ -z "${desired_version}" ]; then
    return 0
  fi
  local installed_version
  installed_version="$(python3 -c "import playwright; print(playwright.__version__)" 2>/dev/null || echo "")"
  if [ "${installed_version}" = "${desired_version}" ]; then
    return 0
  fi
  return 1
}

_check_chromium_cached() {
  local cache_dir="${HOME}/.cache/ms-playwright"
  [ -d "${cache_dir}" ] && [ -n "$(find "${cache_dir}" -maxdepth 1 -type d -name 'chromium-*' 2>/dev/null)" ]
}

if _check_playwright_installed "${PLAYWRIGHT_VERSION}"; then
  echo "✅ Playwright Python package already installed ($(python3 -c "import playwright; print(playwright.__version__)" 2>/dev/null || echo "unknown"))"
else
  python3 -m pip install --upgrade pip
  if [ "${PLAYWRIGHT_VERSION}" = "latest" ] || [ -z "${PLAYWRIGHT_VERSION}" ]; then
    python3 -m pip install playwright pytest
  else
    python3 -m pip install "playwright==${PLAYWRIGHT_VERSION}" pytest
  fi
fi

if _check_chromium_cached; then
  echo "✅ Playwright Chromium already cached"
else
  python3 -m playwright install --with-deps chromium
fi

echo "✅ Playwright $(python3 -m playwright --version 2>/dev/null || echo "${PLAYWRIGHT_VERSION}")"
