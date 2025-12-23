# Build Release Script for TikTok Video Downloader
# Run: .\build-release.ps1

param(
    [string]$Version = "1.0"
)

Write-Host "Building release v$Version..." -ForegroundColor Cyan

# Run webpack production build
Write-Host "Running webpack build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Webpack build failed!" -ForegroundColor Red
    exit 1
}

# Verify dist folder exists
if (-not (Test-Path "dist")) {
    Write-Host "❌ dist/ folder not found!" -ForegroundColor Red
    exit 1
}

# Remove source maps for production release (optional - reduces size)
Write-Host "Removing source maps..." -ForegroundColor Yellow
Get-ChildItem -Path "dist" -Recurse -Include "*.map" | Remove-Item -Force

# Create ZIP from dist folder
$zipPath = "..\TikTok-Video-Downloader-v$Version.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path "dist\*" -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "✅ Release built successfully!" -ForegroundColor Green
Write-Host "📦 ZIP: $((Resolve-Path $zipPath).Path)" -ForegroundColor White
Write-Host "📁 Folder: dist/" -ForegroundColor White
Write-Host ""
Write-Host "Share instructions:" -ForegroundColor Cyan
Write-Host "1. Unzip the file"
Write-Host "2. Open Chrome -> chrome://extensions/"
Write-Host "3. Enable 'Developer mode'"
Write-Host "4. Click 'Load unpacked'"
Write-Host "5. Select the unzipped folder"
