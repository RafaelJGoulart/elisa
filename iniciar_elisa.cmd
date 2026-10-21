@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\pythonw.exe" (
  echo [Elisa] Ambiente virtual nao encontrado.
  echo Consulte a secao "Instalacao" do README.
  pause
  exit /b 1
)

if not exist "frontend\dist\index.html" (
  echo [Elisa] Build do frontend ausente. Gerando...
  pushd "frontend"
  call npm run build
  if errorlevel 1 (
    popd
    echo [Elisa] Falha ao gerar o build do frontend.
    pause
    exit /b 1
  )
  popd
)

start "" "%~dp0.venv\Scripts\pythonw.exe" "%~dp0elisa_desktop.py"
exit /b 0
