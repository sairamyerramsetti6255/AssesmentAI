@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing production dependencies...
  call npm install --omit=dev
)
if not exist .env (
  echo.
  echo ERROR: Create .env from .env.example and set OPENROUTER_API_KEY
  echo        .env must live in this folder only — never copy it into dist\
  pause
  exit /b 1
)
echo Starting AI Readiness server on http://127.0.0.1:4173
node --env-file=.env server.mjs
