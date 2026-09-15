@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Publicando la biblioteca en internet...
echo.
git add -A
git commit -m "Biblioteca actualizada"
git push origin main
if errorlevel 1 (echo. & echo *** No se pudo publicar. Revisa la conexion.) else (echo. & echo Listo. En el iPad se vera en unos minutos: & echo    https://aquirosp2705-cloud.github.io/mi-biblioteca/)
echo.
pause
