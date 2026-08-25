# Build debug APK locally using Android Studio's JDK (Java 17).
# Fixes: "Unsupported class file major version 70" when system Java is too new.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

if ($ProjectRoot -match '\s') {
    Write-Host "ERROR: Project path contains spaces. See scripts\fix-windows-build-path.ps1" -ForegroundColor Red
    exit 1
}

function Find-AndroidStudioJbr {
    $candidates = @(
        "${env:ProgramFiles}\Android\Android Studio\jbr",
        "${env:ProgramFiles(x86)}\Android\Android Studio\jbr",
        "${env:LOCALAPPDATA}\Programs\Android\Android Studio\jbr"
    )
    foreach ($path in $candidates) {
        if (Test-Path "$path\bin\java.exe") {
            return $path
        }
    }
    return $null
}

$jbr = Find-AndroidStudioJbr
if (-not $jbr) {
    Write-Host "Could not find Android Studio JDK (jbr)." -ForegroundColor Red
    Write-Host "Install Android Studio, or set JAVA_HOME to JDK 17 manually." -ForegroundColor Yellow
    Write-Host 'Example: $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"' -ForegroundColor Yellow
    exit 1
}

$env:JAVA_HOME = $jbr
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
java -version

Set-Location "$ProjectRoot\android"
Write-Host "`nBuilding debug APK (JS bundle embedded)..." -ForegroundColor Green
Write-Host "For a phone-only install without Metro, prefer: npm run build:android:standalone" -ForegroundColor Gray
.\gradlew clean assembleDebug

if ($LASTEXITCODE -eq 0) {
    $apk = "app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "`nBuild succeeded!" -ForegroundColor Green
    Write-Host "APK: $ProjectRoot\android\$apk" -ForegroundColor Cyan
} else {
    exit $LASTEXITCODE
}
