@echo off
REM ============================================================
REM Funding Watch — Backfill complet
REM Exécute dans l'ordre : taxonomy → embeddings
REM Usage : backfill-all.bat [--limit N]
REM ============================================================

setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".env.local" (
  echo X .env.local manquant
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  [1/2] BACKFILL TAXONOMIE (SDG + DAC + populations)
echo ============================================================
python scrapers\backfill_taxonomy.py %*
if errorlevel 1 (
  echo X Erreur taxonomy
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  [2/2] BACKFILL EMBEDDINGS (orga + opportunites)
echo ============================================================
python scrapers\backfill_embeddings.py %*
if errorlevel 1 (
  echo X Erreur embeddings
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Termine ! Verifie /dashboard pour le widget Top Matches.
echo ============================================================
pause
