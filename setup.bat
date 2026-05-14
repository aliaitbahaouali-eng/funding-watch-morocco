@echo off
REM ============================================================
REM Funding Watch Morocco — Script d'installation Windows
REM Double-cliquez sur ce fichier OU lancez-le depuis cmd.
REM ============================================================

setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo  Funding Watch Morocco — Installation
echo  Dossier : %CD%
echo ============================================================
echo.

REM ---------- 1) Vérification Node.js ----------
echo [1/6] Verification de Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo   X Node.js n'est pas installe.
  echo     Telechargez-le sur https://nodejs.org/ ^(LTS recommandee^)
  goto :fail
)
for /f "delims=" %%v in ('node -v') do echo   OK Node.js %%v
echo.

REM ---------- 2) Vérification npm ----------
echo [2/6] Verification de npm...
where npm >nul 2>&1
if errorlevel 1 (
  echo   X npm introuvable. Reinstaller Node.js.
  goto :fail
)
for /f "delims=" %%v in ('npm -v') do echo   OK npm %%v
echo.

REM ---------- 3) Vérification Python (optionnel) ----------
echo [3/6] Verification de Python ^(optionnel — pour les scrapers^)...
set "PY_OK=0"
where python >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%v in ('python --version 2^>^&1') do echo   OK %%v
  set "PY_OK=1"
) else (
  where py >nul 2>&1
  if not errorlevel 1 (
    for /f "delims=" %%v in ('py --version 2^>^&1') do echo   OK %%v ^(via py launcher^)
    set "PY_OK=1"
  ) else (
    echo   ! Python introuvable — les scrapers ne pourront pas tourner.
    echo     Installez-le sur https://www.python.org/downloads/
  )
)
echo.

REM ---------- 4) npm install ----------
echo [4/6] Installation des dependances Node ^(npm install^)...
echo     Patience, ca peut prendre 1-3 minutes...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo   X npm install a echoue.
  goto :fail
)
echo   OK Dependances Node installees.
echo.

REM ---------- 5) pip install (si Python dispo) ----------
echo [5/6] Installation des dependances Python ^(scrapers^)...
if "!PY_OK!"=="1" (
  python -m pip install --upgrade pip >nul 2>&1
  python -m pip install -r scrapers\requirements.txt
  if errorlevel 1 (
    echo   ! pip install a echoue partiellement — les scrapers pourraient ne pas tourner.
    echo     Vous pourrez reessayer plus tard avec :
    echo       python -m pip install -r scrapers\requirements.txt
  ) else (
    echo   OK Dependances Python installees.
  )
) else (
  echo   ! Etape sautee ^(Python absent^).
)
echo.

REM ---------- 6) Copie .env.example -> .env.local ----------
echo [6/6] Configuration .env.local...
if exist ".env.local" (
  echo   ! .env.local existe deja — on ne l'ecrase pas.
) else (
  if exist ".env.example" (
    copy /Y ".env.example" ".env.local" >nul
    echo   OK .env.local cree a partir de .env.example.
    echo     ^>^>^> IMPORTANT : editez .env.local pour ajouter vos cles Supabase / Brevo / CRON_SECRET.
  ) else (
    echo   X .env.example introuvable.
  )
)
echo.

REM ---------- Récapitulatif ----------
echo ============================================================
echo  Installation terminee !
echo ============================================================
echo.
echo  Prochaines etapes :
echo.
echo  1. Creez un projet sur https://supabase.com
echo  2. Editez .env.local ^(Notepad^) avec :
echo       - NEXT_PUBLIC_SUPABASE_URL
echo       - NEXT_PUBLIC_SUPABASE_ANON_KEY
echo       - SUPABASE_SERVICE_ROLE_KEY
echo       - CRON_SECRET ^(chaine aleatoire^)
echo       - BREVO_API_KEY ^(optionnel^)
echo       - ANTHROPIC_API_KEY ^(optionnel — pour le LLM^)
echo  3. Dans Supabase SQL Editor, executez dans l'ordre :
echo       supabase\schema.sql
echo       supabase\seed.sql
echo  4. Lancez le serveur :
echo       npm run dev
echo     Puis ouvrez http://localhost:3000
echo  5. Creez votre compte sur /register, puis dans Supabase SQL :
echo       update profiles set role='admin' where email='votre@email.com';
echo  6. Pour lancer la collecte ^(dans une seconde fenetre cmd^) :
echo       python scrapers\scraper.py --source undp --dry-run
echo       python scrapers\scraper.py --source undp
echo     Puis validez les opportunites dans /admin/pending.
echo.
echo ============================================================
echo.

REM Propose d'ouvrir .env.local pour edition
choice /C ON /M "Ouvrir .env.local dans Notepad maintenant"
if errorlevel 2 goto :end
notepad .env.local
goto :end

:fail
echo.
echo ============================================================
echo  Installation INTERROMPUE — voir les erreurs ci-dessus.
echo ============================================================
pause
exit /b 1

:end
echo.
pause
exit /b 0
