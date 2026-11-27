@echo off
cd /d "%~dp0\.."
if not exist out\index.html (
 echo Build the frontend first: pnpm install then pnpm build
 exit /b 1
)
.venv\Scripts\python -m engine
pause
