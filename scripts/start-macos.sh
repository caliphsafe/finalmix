#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -f out/index.html ] || { echo 'Build the frontend first: pnpm install && pnpm build'; exit 1; }
exec .venv/bin/python -m engine
