// TikTok Logo Icon Generator
// Design: TikTok music note logo
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, '..', 'assets', 'icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background - black (TikTok style)
  const radius = size * 0.18;
  ctx.fillStyle = '#000000';
  
  // Draw rounded rectangle background
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
  
  const scale = size / 48; // Base design is 48px
  
  // TikTok music note design
  // Draw the cyan/teal shadow (offset left)
  ctx.fillStyle = '#25F4EE'; // TikTok cyan
  drawMusicNote(ctx, size * 0.18, size * 0.12, scale);
  
  // Draw the red/pink shadow (offset right)  
  ctx.fillStyle = '#FE2C55'; // TikTok red/pink
  drawMusicNote(ctx, size * 0.24, size * 0.12, scale);
  
  // Draw the white main note
  ctx.fillStyle = '#FFFFFF';
  drawMusicNote(ctx, size * 0.21, size * 0.12, scale);
  
  return canvas.toBuffer('image/png');
}

function drawMusicNote(ctx, offsetX, offsetY, scale) {
  ctx.beginPath();
  
  // TikTok note shape - simplified music note
  const noteWidth = 22 * scale;
  const noteHeight = 32 * scale;
  
  // Main vertical stem
  ctx.moveTo(offsetX + noteWidth * 0.7, offsetY);
  ctx.lineTo(offsetX + noteWidth, offsetY);
  ctx.lineTo(offsetX + noteWidth, offsetY + noteHeight * 0.75);
  
  // Bottom circle (note head)
  ctx.arc(
    offsetX + noteWidth * 0.65, 
    offsetY + noteHeight * 0.85, 
    noteWidth * 0.35, 
    0, 
    Math.PI * 2
  );
  
  ctx.moveTo(offsetX + noteWidth * 0.7, offsetY);
  ctx.lineTo(offsetX + noteWidth, offsetY);
  
  // Top curved part extending right
  ctx.moveTo(offsetX + noteWidth, offsetY);
  ctx.quadraticCurveTo(
    offsetX + noteWidth * 1.5, 
    offsetY + noteHeight * 0.15,
    offsetX + noteWidth * 1.4, 
    offsetY + noteHeight * 0.35
  );
  ctx.lineTo(offsetX + noteWidth * 1.1, offsetY + noteHeight * 0.3);
  ctx.quadraticCurveTo(
    offsetX + noteWidth * 1.2, 
    offsetY + noteHeight * 0.15,
    offsetX + noteWidth * 0.7, 
    offsetY
  );
  
  ctx.fill();
}

// Generate all icon sizes
sizes.forEach(size => {
  const buffer = generateIcon(size);
  const filename = `icon${size}.png`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`✓ Created ${filename}`);
});

console.log('\n✅ All icons generated successfully!');
console.log(`📁 Location: ${outputDir}`);
