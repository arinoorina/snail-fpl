@echo off
setlocal
cd /d "%~dp0"
title SNAIL FPL - Deploy to Vercel

echo ==============================================
echo   SNAIL FPL - Deploy to Vercel Production
echo ==============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] This PC does not have Node.js installed.
  echo Install Node.js LTS once, then double-click this file again.
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist ".vercel\project.json" (
  echo First-time setup only:
  echo - Sign in to Vercel if asked.
  echo - Choose: Link to existing project
  echo - Select the existing SNAIL FPL project ^(snail-fpl^)
  echo.
  call npx --yes vercel@latest link
  if errorlevel 1 (
    echo.
    echo [ERROR] Project link was not completed. Nothing was deployed.
    pause
    exit /b 1
  )
)

echo.
echo Deploying this folder to the linked Production project...
call npx --yes vercel@latest --prod
if errorlevel 1 (
  echo.
  echo [ERROR] Deploy failed. The previous Production version is unchanged.
  pause
  exit /b 1
)

echo.
echo ==============================================
echo   DEPLOY COMPLETE
 echo  Future updates: replace the files in this
 echo  folder, then double-click this BAT again.
echo ==============================================
echo.
pause
