# Build Release Script for TikTok Video Downloader
# Run: .\build-release.ps1

param(
    [string]$Version = "1.0"
)

Write-Host "Building release v$Version..." -ForegroundColor Cyan

# Clean and recreate release folder
if (Test-Path "release") {
    Remove-Item -Path "release" -Recurse -Force
}
New-Item -ItemType Directory -Path "release" -Force | Out-Null

# Copy essential files
Write-Host "Copying files..." -ForegroundColor Yellow
Copy-Item -Path "manifest.json" -Destination "release/"
Copy-Item -Path "src" -Destination "release/" -Recurse
Copy-Item -Path "README.md" -Destination "release/"

# Copy assets/icons
if (Test-Path "assets") {
    Copy-Item -Path "assets" -Destination "release/" -Recurse
}

# Remove any .map files or dev files
Get-ChildItem -Path "release" -Recurse -Include "*.map" | Remove-Item -Force

# Create ZIP
$zipPath = "..\TikTok-Video-Downloader-v$Version.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path "release\*" -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "✅ Release built successfully!" -ForegroundColor Green
Write-Host "📦 ZIP: $((Resolve-Path $zipPath).Path)" -ForegroundColor White
Write-Host "📁 Folder: release/" -ForegroundColor White
Write-Host ""
Write-Host "Share instructions:" -ForegroundColor Cyan
Write-Host "1. Unzip the file"
Write-Host "2. Open Chrome -> chrome://extensions/"
Write-Host "3. Enable 'Developer mode'"
Write-Host "4. Click 'Load unpacked'"
Write-Host "5. Select the unzipped folder"
