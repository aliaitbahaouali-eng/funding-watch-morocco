@echo off
REM Lance le serveur Next.js en developpement.
cd /d "%~dp0"
if not exist ".env.local" (
  echo .env.local manquant — lancez setup.bat d'abord.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo node_modules manquant — lancez setup.bat d'abord.
  pause
  exit /b 1
)
echo Lancement de Next.js sur http://localhost:3000 ...
echo Ctrl+C pour arreter.
echo.
call npm run dev
