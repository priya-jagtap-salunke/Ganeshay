# Canonical project location (no spaces) for Windows Android builds.
# Open THIS folder in Cursor / Android Studio — do not use the copy under
# C:\Users\...\Projects\bappaji-booking (username has spaces).

$ProjectRoot = "C:\Projects\bappaji-booking"

Write-Host "Project root for builds:" -ForegroundColor Cyan
Write-Host "  $ProjectRoot" -ForegroundColor White
Write-Host ""

if (-not (Test-Path $ProjectRoot)) {
    Write-Host "ERROR: $ProjectRoot not found." -ForegroundColor Red
    Write-Host "Create it by moving or cloning the repo to C:\Projects\bappaji-booking" -ForegroundColor Yellow
    exit 1
}

if ($ProjectRoot -match '\s') {
    Write-Host "ERROR: Path still contains spaces." -ForegroundColor Red
    exit 1
}

Write-Host "OK — use this folder only:" -ForegroundColor Green
Write-Host "  Cursor: File -> Open Folder -> $ProjectRoot" -ForegroundColor White
Write-Host "  Android Studio: Open -> $ProjectRoot\android" -ForegroundColor White
Write-Host "  Build: cd $ProjectRoot ; npm run build:android:standalone" -ForegroundColor White
