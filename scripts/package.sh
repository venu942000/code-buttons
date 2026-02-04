#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="/home/venu/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null
fi

pnpm run build

pnpm exec vsce package --no-dependencies --allow-star-activation

ts="$(date +%Y%m%d-%H%M%S)"
mkdir -p build

latest_vsix="$(ls -t ./*.vsix | head -n 1)"
base_name="$(basename "$latest_vsix" .vsix)"
final_path="build/${base_name}-${ts}.vsix"

mv "$latest_vsix" "$final_path"
echo "Packaged: $final_path"
