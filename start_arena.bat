@echo off
setlocal

REM Root directory of this script
set "ROOT_DIR=%~dp0"

REM Project paths
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_PY=%BACKEND_DIR%\.venv\Scripts\python.exe"

if not exist "%BACKEND_DIR%\manage.py" (
  echo [ERROR] Backend not found at: %BACKEND_DIR%
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend not found at: %FRONTEND_DIR%
  pause
  exit /b 1
)

if not exist "%BACKEND_PY%" (
  echo [ERROR] Python venv not found at: %BACKEND_PY%
  echo Create it first in backend\.venv or edit this script path.
  pause
  exit /b 1
)

echo Starting backend...
start "Arena Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && ""%BACKEND_PY%"" manage.py runserver"

REM Give backend a moment to initialize before frontend starts
timeout /t 3 /nobreak >nul

echo Starting frontend...
start "Arena Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm start"

echo.
echo Arena backend and frontend launched.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000

endlocal
