@echo off
REM ============================================================
REM Funding Watch — Cleanup : ne garder que les appels pour ONG
REM Usage :
REM   cleanup-ngo.bat           → DRY-RUN (montre quoi supprimer)
REM   cleanup-ngo.bat delete    → Applique vraiment
REM ============================================================

setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".env.local" (
  echo X .env.local manquant.
  pause
  exit /b 1
)

if /I "%~1"=="delete" (
  echo.
  echo *** Mode DELETE - les suppressions sont definitives ***
  echo.
  python scrapers\cleanup_ngo_only.py
) else (
  python scrapers\cleanup_ngo_only.py --dry-run
)

echo.
pause
