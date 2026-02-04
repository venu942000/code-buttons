#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="/home/venu/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null
fi

pnpm run build
