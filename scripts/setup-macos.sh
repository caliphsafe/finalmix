#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
command -v python3 >/dev/null || { echo 'Install Python 3.11 or 3.12 first.'; exit 1; }
command -v ffmpeg >/dev/null || { echo 'Install FFmpeg (for example: brew install ffmpeg) first.'; exit 1; }
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r engine/requirements.lock
printf '\nCore engine installed. Build the frontend with pnpm install && pnpm build, then run scripts/start-macos.sh.\n'
