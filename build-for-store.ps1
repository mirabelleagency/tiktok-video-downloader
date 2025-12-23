# Build script for Chrome Web Store submission
# Run: .\build-for-store.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔨 Building TikTok Video Downloader for Chrome Web Store..." -ForegroundColor Cyan

# Configuration
$projectDir = $PSScriptRoot
$distDir = Join-Path $projectDir "dist-store"
$zipName = "tiktok-video-downloader-v1.0.0.zip"
$zipPath = Join-Path $projectDir $zipName

# Clean previous build
if (Test-Path $distDir) {
    Write-Host "🗑️  Cleaning previous build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $distDir
}

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

# Create dist directory
Write-Host "📁 Creating distribution folder..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $distDir | Out-Null

# Copy required files
Write-Host "📋 Copying files..." -ForegroundColor Yellow

# Copy production manifest (without the key)
Copy-Item (Join-Path $projectDir "manifest.production.json") (Join-Path $distDir "manifest.json")

# Copy source folders
$foldersToInclude = @("src", "assets")
foreach ($folder in $foldersToInclude) {
    $sourcePath = Join-Path $projectDir $folder
    $destPath = Join-Path $distDir $folder
    if (Test-Path $sourcePath) {
        Copy-Item -Recurse $sourcePath $destPath
        Write-Host "  ✓ Copied $folder" -ForegroundColor Green
    }
}

# Remove any unnecessary files from the copy
$filesToRemove = @(
    "assets/icons/README.md",
    "assets/icons/*.svg"
)

foreach ($pattern in $filesToRemove) {
    $fullPattern = Join-Path $distDir $pattern
    Get-ChildItem -Path $fullPattern -ErrorAction SilentlyContinue | Remove-Item -Force
}

# List contents
Write-Host "`n📦 Package contents:" -ForegroundColor Cyan
Get-ChildItem -Recurse $distDir | ForEach-Object {
    $relativePath = $_.FullName.Substring($distDir.Length + 1)
    if ($_.PSIsContainer) {
        Write-Host "  📁 $relativePath/" -ForegroundColor Blue
    } else {
        $size = "{0:N2} KB" -f ($_.Length / 1KB)
        Write-Host "  📄 $relativePath ($size)" -ForegroundColor Gray
    }
}

# Create ZIP
Write-Host "`n🗜️  Creating ZIP package..." -ForegroundColor Yellow
Compress-Archive -Path (Join-Path $distDir "*") -DestinationPath $zipPath -Force

# Get ZIP size
$zipSize = (Get-Item $zipPath).Length
$zipSizeKB = "{0:N2} KB" -f ($zipSize / 1KB)
$zipSizeMB = "{0:N2} MB" -f ($zipSize / 1MB)

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📦 Package: $zipName" -ForegroundColor White
Write-Host "📏 Size: $zipSizeKB ($zipSizeMB)" -ForegroundColor White
Write-Host "📍 Location: $zipPath" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://chrome.google.com/webstore/devconsole" -ForegroundColor White
Write-Host "2. Click 'New Item'" -ForegroundColor White
Write-Host "3. Upload: $zipName" -ForegroundColor White
Write-Host "4. Fill out store listing (see CHROME-STORE-SUBMISSION-GUIDE.md)" -ForegroundColor White

Write-Host "`n⚠️  Remember:" -ForegroundColor Yellow
Write-Host "• Complete OAuth verification FIRST" -ForegroundColor White
Write-Host "• Host privacy policy online" -ForegroundColor White
Write-Host "• Prepare screenshots (1280x800)" -ForegroundColor White
