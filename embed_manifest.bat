@echo off
setlocal

rem Set the paths to the manifest and executable
set "manifestPath=C:\Users\eiman\Documents\GitHub\DEVASTMOD-SOFTWARE\src-tauri\target\release\app.manifest"
set "executablePath=C:\Users\eiman\Documents\GitHub\DEVASTMOD-SOFTWARE\src-tauri\target\release\devastmod.exe"
set "mtPath=C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\mt.exe"


rem Check if the manifest file exists
if not exist "%manifestPath%" (
  echo Manifest file not found: "%manifestPath%"
  pause
  exit /b
)

rem Check if the executable file exists
if not exist "%executablePath%" (
  echo Executable file not found: "%executablePath%"
  pause
  exit /b
)

rem Run mt.exe to embed the manifest
"%mtPath%" -manifest "%manifestPath%" -outputresource:"%executablePath%";#1

rem Check the exit code of mt.exe
if %errorlevel% neq 0 (
  echo Failed to embed the manifest into the executable.
  pause
  exit /b
)

echo Manifest successfully embedded into the executable.
pause
