@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py -3 "%~dp0actualizar.py") else (python "%~dp0actualizar.py")
if errorlevel 1 echo. & echo *** Hubo un problema. La biblioteca quedo como estaba.
echo.
pause
