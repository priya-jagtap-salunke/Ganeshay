# Build a standalone release APK (JS bundle embedded — works without Metro).
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

if ($ProjectRoot -match '\s') {
    Write-Host "ERROR: Project path contains spaces:" -ForegroundColor Red
    Write-Host "  $ProjectRoot" -ForegroundColor White
    Write-Host ""
    Write-Host "react-native-reanimated cannot build on Windows when the path has spaces" -ForegroundColor Yellow
    Write-Host "(e.g. 'SuJiT SaLuNkE' in your username)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Open the space-free project in Cursor and build from there:" -ForegroundColor Cyan
    Write-Host "  C:\Projects\bappaji-booking" -ForegroundColor White
    Write-Host "Do not build from a path under your user folder if the username has spaces." -ForegroundColor Yellow
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

if (-not (Test-Path ".env")) {
    Write-Host "WARNING: .env not found. Supabase may not work in the APK." -ForegroundColor Yellow
}

$jbr = Find-AndroidStudioJbr
if (-not $jbr) {
    Write-Host "Could not find Android Studio JDK (jbr)." -ForegroundColor Red
    exit 1
}

$env:JAVA_HOME = $jbr
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Short cache path avoids Windows MAX_PATH (260) failures with reanimated/ninja.
# Always force this path — Cursor sandbox may inject a temp GRADLE_USER_HOME that
# causes UP-TO-DATE task skips against deleted node_modules/*/android/build outputs.
$env:GRADLE_USER_HOME = "C:\gradle-home"
New-Item -ItemType Directory -Force -Path $env:GRADLE_USER_HOME | Out-Null

Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
Write-Host "Using GRADLE_USER_HOME: $env:GRADLE_USER_HOME" -ForegroundColor Cyan
java -version

if (Get-Process studio64 -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Host "WARNING: Android Studio is running and often locks node_modules/*/android/build." -ForegroundColor Yellow
    Write-Host "If clean fails with 'Unable to delete directory', close Android Studio and retry." -ForegroundColor Yellow
}

Set-Location "$ProjectRoot\android"

# Do NOT call "gradlew --stop" here — it races with assembleRelease (and any parallel
# build) and causes: "Gradle build daemon has been stopped: stop command received".
# File-lock cleanup below is enough for a reliable release build.

# Clear stale CMake cache (important after path changes)
$reanimatedCxx = "..\node_modules\react-native-reanimated\android\.cxx"
if (Test-Path $reanimatedCxx) {
    Remove-Item -Recurse -Force $reanimatedCxx -ErrorAction SilentlyContinue
}

# Drop stale Expo/RN autolinking (can keep absolute paths from an old project location)
foreach ($stale in @(
    "$ProjectRoot\android\build\generated\autolinking",
    "$ProjectRoot\android\app\build\generated\autolinking"
)) {
    if (Test-Path -LiteralPath $stale) {
        Remove-Item -LiteralPath $stale -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Avoid mass-deleting node_modules/*/android/build before assembleRelease — that races with
# Gradle UP-TO-DATE checks and can break Kotlin/Java classpath (e.g. expo.modules.fetch).
# Rely on `gradlew clean` plus the targeted reanimated/.cxx and autolinking cleans above.

Write-Host "`nBuilding standalone release APK (this may take 5-10 min)..." -ForegroundColor Green
.\gradlew clean assembleRelease --max-workers=1

if ($LASTEXITCODE -eq 0) {
    $apk = "app\build\outputs\apk\release\app-release.apk"
    Write-Host "`nBuild succeeded!" -ForegroundColor Green
    Write-Host "Install this APK on your phone (no Metro needed):" -ForegroundColor Cyan
    Write-Host "$ProjectRoot\android\$apk" -ForegroundColor White
} else {
    exit $LASTEXITCODE
}
