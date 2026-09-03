@echo off
echo ============================================
echo  LOOP - AI Customer Feedback Intelligence
echo  Local Setup Script
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed. Please install from https://nodejs.org
  pause
  exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: npm is not installed.
  pause
  exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env
  echo Please edit .env with your credentials before continuing.
  pause
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install --legacy-peer-deps
  if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
  )
)

echo.
echo Pushing database schema...
call npx drizzle-kit push
if %errorlevel% neq 0 (
  echo ERROR: Failed to push database schema. Check your DATABASE_URL.
  pause
  exit /b 1
)

echo.
echo Seeding database with demo data...
call npm run seed
if %errorlevel% neq 0 (
  echo ERROR: Seeding failed
  pause
  exit /b 1
)

echo.
echo Building application...
call npm run build
if %errorlevel% neq 0 (
  echo WARNING: Build failed, starting dev server instead...
  call npm run dev
) else (
  echo.
  echo Starting development server...
  call npm run dev
)

pause
