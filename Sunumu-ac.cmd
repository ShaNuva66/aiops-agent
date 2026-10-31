@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_presentation.ps1" %*
set "PRESENTATION_EXIT=%ERRORLEVEL%"
if not "%PRESENTATION_EXIT%"=="0" (
  echo.
  echo Sunum acilamadi. Yukaridaki aciklamayi kontrol edin.
  if "%~1"=="" pause
)
exit /b %PRESENTATION_EXIT%
