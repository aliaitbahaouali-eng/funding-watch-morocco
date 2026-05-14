@echo off
REM Lance le scraper Python.
REM Usage :
REM   run-scraper.bat                    -> toutes les sources
REM   run-scraper.bat undp                -> une seule source
REM   run-scraper.bat undp --dry-run      -> sans envoyer a l'API
cd /d "%~dp0"

if not exist ".env.local" (
  echo .env.local manquant — lancez setup.bat d'abord.
  pause
  exit /b 1
)

set "ARGS="
if not "%~1"=="" set "ARGS=--source %~1"
if not "%~2"=="" set "ARGS=%ARGS% %~2"

echo Commande : python scrapers\scraper.py %ARGS%
echo.
python scrapers\scraper.py %ARGS%
echo.
pause
