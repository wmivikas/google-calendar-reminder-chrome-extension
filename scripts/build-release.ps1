$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root "manifest.json"

if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found in project root"
}

$manifest = Get-Content $manifestPath | ConvertFrom-Json
$version = $manifest.version

$distDir = Join-Path $root "dist"
$packageDir = Join-Path $distDir "package"

if (Test-Path $packageDir) {
  Remove-Item $packageDir -Recurse -Force
}

New-Item -ItemType Directory -Path $packageDir -Force | Out-Null

Copy-Item (Join-Path $root "manifest.json") $packageDir -Force
Copy-Item (Join-Path $root "src") $packageDir -Recurse -Force
Copy-Item (Join-Path $root "assets") $packageDir -Recurse -Force

$zipPath = Join-Path $distDir "focus-calendar-pulse-v$version.zip"
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force
Write-Output "Created: $zipPath"
