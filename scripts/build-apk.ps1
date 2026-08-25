# Build Android APK for Ganeshay (EAS Cloud)
# Run in PowerShell from the project folder.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Ganeshay - Android APK Build ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
  Write-Host "WARNING: .env file not found. Create it from .env.example with your Supabase keys." -ForegroundColor Yellow
}

Write-Host "`n[1/4] Installing dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[2/4] Checking Expo login..." -ForegroundColor Green
npx eas-cli whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nNot logged in. Run: npx eas-cli login" -ForegroundColor Yellow
  npx eas-cli login
}

Write-Host "`n[3/5] Syncing Supabase env vars to EAS (preview)..." -ForegroundColor Green
if (Test-Path ".env") {
  $envMap = @{}
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $envMap[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
  foreach ($key in @("EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY")) {
    if ($envMap.ContainsKey($key) -and $envMap[$key] -and $envMap[$key] -notmatch "your-") {
      Write-Host "  Setting $key on EAS preview environment..."
      npx eas-cli env:create --name $key --value $envMap[$key] --environment preview --visibility plaintext --force 2>$null
    }
  }
} else {
  Write-Host "  Skipped (no .env). Set vars in Expo dashboard: Project > Environment variables." -ForegroundColor Yellow
}

Write-Host "`n[4/5] Linking EAS project (if needed)..." -ForegroundColor Green
$appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
$projectId = $appJson.expo.extra.eas.projectId
if ([string]::IsNullOrWhiteSpace($projectId)) {
  npx eas-cli init
}

Write-Host "`n[5/5] Starting cloud APK build (preview profile)..." -ForegroundColor Green
Write-Host "This takes about 10-20 minutes. You will get a download link when done.`n" -ForegroundColor Gray

# Load .env into process for EXPO_PUBLIC_* vars during config resolution
if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

npx eas-cli build --platform android --profile preview

Write-Host "`nDone. Open the build URL above on your phone to download and install the APK." -ForegroundColor Cyan
