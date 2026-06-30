# Sales Forecast Dashboard - Team Unleashed
Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Sales Forecast Dashboard" -ForegroundColor White
Write-Host "   Team Unleashed" -ForegroundColor Gray
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Refreshing data from Excel..." -ForegroundColor Yellow

Set-Location "$PSScriptRoot\sales-dashboard"
node extract-data.js

Write-Host ""
Write-Host "  Opening dashboard in browser..." -ForegroundColor Green
Start-Process "$PSScriptRoot\sales-dashboard\index.html"

Write-Host ""
Write-Host "  Dashboard opened! You can close this window." -ForegroundColor Gray
Start-Sleep -Seconds 5
