// Branding Logo Generator - Creates high-res logo for OAuth consent screen and store
// Sizes: 512x512 (OAuth consent), 128x128 (extension icon)
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'assets', 'branding');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateBrandingLogo(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const scale = size / 512; // Base design is 512px
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Background - gradient rounded square (TikTok-inspired dark)
  const radius = size * 0.15;
  const bgGradient = ctx.createLinearGradient(0, 0, size, size);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(0.5, '#16213e');
  bgGradient.addColorStop(1, '#0f0f23');
  
  // Draw rounded rectangle background
  ctx.fillStyle = bgGradient;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  
  // Add subtle glow/border
  const glowGradient = ctx.createLinearGradient(0, 0, size, size);
  glowGradient.addColorStop(0, 'rgba(254, 44, 85, 0.3)'); // TikTok red
  glowGradient.addColorStop(1, 'rgba(37, 244, 238, 0.3)'); // TikTok cyan
  
  ctx.strokeStyle = glowGradient;
  ctx.lineWidth = 4 * scale;
  ctx.stroke();
  
  // Draw main play button circle with TikTok-inspired gradient
  const circleRadius = 140 * scale;
  const circleGradient = ctx.createLinearGradient(
    centerX - circleRadius, centerY - circleRadius - 30 * scale,
    centerX + circleRadius, centerY + circleRadius - 30 * scale
  );
  circleGradient.addColorStop(0, '#25f4ee'); // TikTok cyan
  circleGradient.addColorStop(0.5, '#00d4aa'); // Teal
  circleGradient.addColorStop(1, '#fe2c55'); // TikTok red
  
  ctx.beginPath();
  ctx.arc(centerX, centerY - 30 * scale, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = circleGradient;
  ctx.fill();
  
  // Add subtle shadow to circle
  ctx.shadowColor = 'rgba(37, 244, 238, 0.4)';
  ctx.shadowBlur = 30 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5 * scale;
  
  // Draw play triangle inside circle
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  const playX = centerX - 20 * scale;
  const playY = centerY - 30 * scale;
  const playSize = 90 * scale;
  ctx.moveTo(playX - playSize * 0.4, playY - playSize * 0.65);
  ctx.lineTo(playX + playSize * 0.7, playY);
  ctx.lineTo(playX - playSize * 0.4, playY + playSize * 0.65);
  ctx.closePath();
  ctx.fill();
  
  // Draw download arrow below the circle
  const arrowY = centerY + 140 * scale;
  const arrowWidth = 50 * scale;
  const arrowHeight = 60 * scale;
  
  // Arrow stem with gradient
  const arrowGradient = ctx.createLinearGradient(centerX, centerY + 80 * scale, centerX, arrowY + arrowHeight);
  arrowGradient.addColorStop(0, '#ffffff');
  arrowGradient.addColorStop(1, '#e0e0e0');
  
  ctx.fillStyle = arrowGradient;
  ctx.fillRect(centerX - 18 * scale, centerY + 80 * scale, 36 * scale, 60 * scale);
  
  // Arrow head (triangle pointing down)
  ctx.beginPath();
  ctx.moveTo(centerX - arrowWidth, arrowY);
  ctx.lineTo(centerX + arrowWidth, arrowY);
  ctx.lineTo(centerX, arrowY + arrowHeight);
  ctx.closePath();
  ctx.fill();
  
  // Download base line with rounded ends
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 80 * scale, centerY + 210 * scale);
  ctx.lineTo(centerX + 80 * scale, centerY + 210 * scale);
  ctx.stroke();
  
  // Add small Google Drive cloud hint (subtle)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  
  // Small cloud shape in corner
  const cloudX = size - 90 * scale;
  const cloudY = 70 * scale;
  const cloudScale = 0.6 * scale;
  
  // Cloud circles
  ctx.beginPath();
  ctx.arc(cloudX - 25 * cloudScale, cloudY, 18 * cloudScale, 0, Math.PI * 2);
  ctx.arc(cloudX, cloudY - 8 * cloudScale, 22 * cloudScale, 0, Math.PI * 2);
  ctx.arc(cloudX + 25 * cloudScale, cloudY, 16 * cloudScale, 0, Math.PI * 2);
  ctx.arc(cloudX, cloudY + 8 * cloudScale, 20 * cloudScale, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// Generate branding logos
const brandingSizes = [
  { size: 120, name: 'logo-120x120.png', description: 'OAuth consent screen (required)' },
  { size: 512, name: 'logo-512x512.png', description: 'High-res logo' },
  { size: 128, name: 'logo-128x128.png', description: 'Store icon' },
  { size: 440, name: 'promo-small.png', description: 'Small promo tile (needs 280 height)' }
];

brandingSizes.forEach(({ size, name, description }) => {
  const buffer = generateBrandingLogo(size);
  const filepath = path.join(outputDir, name);
  fs.writeFileSync(filepath, buffer);
  console.log(`✓ Created ${name} (${description})`);
});

// Also generate a 440x280 promotional tile
function generatePromoTile(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const scale = Math.min(width, height) / 280;
  
  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(0.5, '#16213e');
  bgGradient.addColorStop(1, '#0f0f23');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Icon on left side
  const iconSize = 180 * scale;
  const iconX = 50 * scale;
  const iconY = (height - iconSize) / 2;
  
  // Draw play button circle
  const centerX = iconX + iconSize / 2;
  const centerY = iconY + iconSize / 2 - 10 * scale;
  const circleRadius = 55 * scale;
  
  const circleGradient = ctx.createLinearGradient(
    centerX - circleRadius, centerY - circleRadius,
    centerX + circleRadius, centerY + circleRadius
  );
  circleGradient.addColorStop(0, '#25f4ee');
  circleGradient.addColorStop(1, '#fe2c55');
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = circleGradient;
  ctx.fill();
  
  // Play triangle
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  const playSize = 35 * scale;
  ctx.moveTo(centerX - playSize * 0.3, centerY - playSize * 0.55);
  ctx.lineTo(centerX + playSize * 0.55, centerY);
  ctx.lineTo(centerX - playSize * 0.3, centerY + playSize * 0.55);
  ctx.closePath();
  ctx.fill();
  
  // Download arrow
  ctx.fillStyle = '#ffffff';
  const arrowY = centerY + 55 * scale;
  ctx.fillRect(centerX - 8 * scale, centerY + 30 * scale, 16 * scale, 25 * scale);
  ctx.beginPath();
  ctx.moveTo(centerX - 22 * scale, arrowY);
  ctx.lineTo(centerX + 22 * scale, arrowY);
  ctx.lineTo(centerX, arrowY + 25 * scale);
  ctx.closePath();
  ctx.fill();
  
  // Base line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 35 * scale, centerY + 85 * scale);
  ctx.lineTo(centerX + 35 * scale, centerY + 85 * scale);
  ctx.stroke();
  
  // Text on right side
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${28 * scale}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('TikTok Video', iconX + iconSize + 30 * scale, height / 2 - 15 * scale);
  ctx.fillText('Downloader', iconX + iconSize + 30 * scale, height / 2 + 20 * scale);
  
  // Subtitle
  ctx.fillStyle = '#25f4ee';
  ctx.font = `${16 * scale}px Arial, sans-serif`;
  ctx.fillText('to Google Drive', iconX + iconSize + 30 * scale, height / 2 + 50 * scale);
  
  return canvas.toBuffer('image/png');
}

// Generate promotional tiles
const promoBuffer = generatePromoTile(440, 280);
fs.writeFileSync(path.join(outputDir, 'promo-tile-440x280.png'), promoBuffer);
console.log('✓ Created promo-tile-440x280.png (Small promotional tile)');

const promoLargeBuffer = generatePromoTile(920, 680);
fs.writeFileSync(path.join(outputDir, 'promo-tile-920x680.png'), promoLargeBuffer);
console.log('✓ Created promo-tile-920x680.png (Large promotional tile)');

console.log('\n✅ All branding assets created in assets/branding/');
console.log('\nFiles created:');
console.log('  • logo-512x512.png - Upload to Google Cloud Console OAuth consent screen');
console.log('  • logo-128x128.png - Store listing icon');
console.log('  • promo-tile-440x280.png - Small promotional tile');
console.log('  • promo-tile-920x680.png - Large promotional tile');
