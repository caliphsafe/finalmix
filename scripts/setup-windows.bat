@echo off
cd /d "%~dp0\.."
where ffmpeg >nul 2>nul
if errorlevel 1 (
 echo Install FFmpeg and add its bin folder to PATH first. See engine\README.md.
 exit /b 1
)
py -3 -m venv .venv
if errorlevel 1 exit /b 1
.venv\Scripts\python -m pip install --require-hashes -r engine\requirements.lock
if errorlevel 1 exit /b 1
echo Core engine installed. Build frontend: pnpm install ^&^& pnpm build
echo Then run scripts\start-windows.bat
