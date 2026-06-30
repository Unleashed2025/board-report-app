@echo off
title Sales Forecast Dashboard - Team Unleashed
echo.
echo  ====================================
echo   Sales Forecast Dashboard
echo   Team Unleashed
echo  ====================================
echo.
echo  Refreshing data from Excel...
cd /d "%~dp0sales-dashboard"
node extract-data.js
echo.
echo  Opening dashboard in browser...
start "" "%~dp0sales-dashboard\index.html"
echo.
echo  Dashboard opened! You can close this window.
timeout /t 5
