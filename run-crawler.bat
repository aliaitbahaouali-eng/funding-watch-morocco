@echo off
REM ============================================================
REM Funding Watch Morocco — Lance le deep crawler intelligent
REM Usage :
REM   run-crawler.bat              → Tanmia, dry-run, 5 items
REM   run-crawler.bat undp          → UNDP, dry-run, 5 items
REM   run-crawler.bat tanmia live   → Tanmia, envoi réel, 10 items
REM ============================================================

setlocal EnableExtensions
cd /d "%~dp0"

set "SOURCE=%~1"
set "MODE=%~2"
if "%SOURCE%"=="" set "SOURCE=tanmia"

echo.
echo ============================================================
echo  Deep Crawler — source: %SOURCE%
echo ============================================================
echo.

REM 1. Verifier dependances (pas besoin de pypdf en mode sans PDF)
echo [1/3] Mode : HTML seul (sans telechargement de PDF)
echo   OK
echo.

REM 2. Verifier .env.local
if not exist ".env.local" (
  echo X .env.local manquant. Lance setup.bat d'abord.
  pause
  exit /b 1
)
echo [2/3] .env.local OK

REM 3. Verifier ANTHROPIC_API_KEY
findstr /B "ANTHROPIC_API_KEY=" .env.local 2>nul | findstr /V "ANTHROPIC_API_KEY=$" >nul
if errorlevel 1 (
  echo   ! ANTHROPIC_API_KEY vide ^- le crawler utilisera les heuristiques.
  echo     Pour des fiches IA-extraites, ajoute ta cle dans .env.local
  echo     ^(obtiens-la sur https://console.anthropic.com^)
) else (
  echo   ANTHROPIC_API_KEY configuree
)
echo.

REM 4. Clear cache Python
echo [3/3] Clear cache Python...
rd /s /q scrapers\__pycache__ 2>nul
rd /s /q scrapers\collectors\__pycache__ 2>nul
rd /s /q scrapers\utils\__pycache__ 2>nul
rd /s /q scrapers\extractors\__pycache__ 2>nul
rd /s /q scrapers\ai\__pycache__ 2>nul
echo   OK
echo.

echo ============================================================
if /I "%MODE%"=="live" (
  echo  Mode LIVE - les fiches seront envoyees a /admin/pending
  echo  ^(pages HTML uniquement, sans telechargement PDF^)
  echo ============================================================
  python scrapers\crawler.py --source %SOURCE% --max 10
) else if /I "%MODE%"=="pdf" (
  echo  Mode LIVE avec PDF - telechargement des pieces jointes ACTIVE
  echo ============================================================
  python scrapers\crawler.py --source %SOURCE% --max 10 --with-pdf
) else (
  echo  Mode DRY-RUN - aucun envoi, juste affichage
  echo  Pour envoyer en vrai : run-crawler.bat %SOURCE% live
  echo  Pour activer le telechargement de PDF : run-crawler.bat %SOURCE% pdf
  echo ============================================================
  python scrapers\crawler.py --source %SOURCE% --max 5 --dry-run
)

echo.
echo ============================================================
echo  Termine. Verifie /admin/pending sur ton site Vercel.
echo ============================================================
pause
