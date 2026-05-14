@echo off
REM ============================================================
REM Funding Watch Morocco — Ajoute les variables d'env sur Vercel
REM Pré-requis : Vercel CLI installé (npm i -g vercel) et `vercel login` fait
REM Lance ce script DEPUIS le dossier funding-watch-mvp.
REM
REM ⚠ TEMPLATE : remplis les valeurs <...> ci-dessous avec tes vraies
REM   clés AVANT de lancer. Ne committe JAMAIS ce fichier avec de vrais
REM   secrets — récupère-les depuis .env.local (qui est gitignored).
REM ============================================================

setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ============================================================
echo  Ajout des variables d'environnement sur Vercel
echo ============================================================
echo.

call :addvar NEXT_PUBLIC_SUPABASE_URL       "https://ohuxiwqsypgeaxqrmsew.supabase.co"
call :addvar NEXT_PUBLIC_SUPABASE_ANON_KEY  "sb_publishable_7iFgwT4iv188VDfyjUR4Hg_eKPuU8Qv"
call :addvar SUPABASE_SERVICE_ROLE_KEY      "<SUPABASE_SERVICE_ROLE_KEY>"
call :addvar CRON_SECRET                    "<CRON_SECRET>"
call :addvar BREVO_API_KEY                  "<BREVO_API_KEY>"
call :addvar BREVO_SENDER_EMAIL             "alerts@fundingwatch.ma"
call :addvar BREVO_SENDER_NAME              "Funding Watch Morocco"
call :addvar ANTHROPIC_API_KEY              "<ANTHROPIC_API_KEY>"
call :addvar ANTHROPIC_MODEL                "claude-haiku-4-5-20251001"
call :addvar OPENAI_API_KEY                 "<OPENAI_API_KEY>"
call :addvar NEXT_PUBLIC_APP_URL            "https://funding-watch-morocco.vercel.app"
call :addvar NEXT_PUBLIC_APP_NAME           "Funding Watch Morocco"

echo.
echo ============================================================
echo  Variables ajoutées !
echo  Lancement du deploy production...
echo ============================================================
echo.
call vercel --prod

echo.
echo ============================================================
echo  Termine. Verifie ton URL sur https://vercel.com
echo ============================================================
pause
exit /b 0

:addvar
echo Ajout de %1 ...
echo %~2 | call vercel env add %1 production 2>nul
echo %~2 | call vercel env add %1 preview 2>nul
echo %~2 | call vercel env add %1 development 2>nul
goto :eof
