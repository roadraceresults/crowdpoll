# First-time developer setup (FR-005a, 002-smtp-env-config).
# Copies the checked-in launch-asset templates to their git-ignored locations
# and writes ONE freshly generated ENV_BETTER_AUTH_SECRET (48 chars) into both,
# so sessions stay valid whether the server was started from the script or the
# IDE debugger. Re-running without -Force never overwrites existing copies
# (preserving your secret and SES development key).
#
# Usage:  ./devScripts.example/setup-dev.ps1 [-Force]

param([switch]$Force)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$assets = @(
    @{ Source = Join-Path $root "launch.json.example"
       Target = Join-Path $root ".vscode/launch.json" },
    @{ Source = Join-Path $root "devScripts.example/launch-dev.ps1"
       Target = Join-Path $root "devScripts/launch-dev.ps1" }
)

$existing = $assets | Where-Object { Test-Path $_.Target } | ForEach-Object { $_.Target }
if ($existing -and -not $Force) {
    Write-Host "Refusing to overwrite existing launch assets:" -ForegroundColor Yellow
    $existing | ForEach-Object { Write-Host "  $_" }
    Write-Host "Re-run with -Force to regenerate them (this mints a NEW secret and invalidates existing dev sessions)."
    exit 1
}

# 36 random bytes -> 48-char base64url string (>= 32-char minimum, no padding).
$bytes = [byte[]]::new(36)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$secret = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")

foreach ($asset in $assets) {
    $dir = Split-Path -Parent $asset.Target
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    (Get-Content -Raw $asset.Source).Replace("__GENERATED_ON_SETUP__", $secret) |
        Set-Content -NoNewline $asset.Target
    Write-Host "Wrote $($asset.Target)"
}

Write-Host ""
Write-Host "Done. One shared ENV_BETTER_AUTH_SECRET was generated into both files." -ForegroundColor Green
Write-Host "Next: fill in ENV_SES_ACCESS_KEY_ID / ENV_SES_SECRET_ACCESS_KEY (your SES development sending key)"
Write-Host "in BOTH git-ignored copies listed above. Never put real credentials in the"
Write-Host "checked-in *.example templates."
