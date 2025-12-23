// Simple Icon Generator - Creates Video Download icons
// Design: Download arrow with play symbol (copyright-free)
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
  
  // Background - gradient rounded square (dark blue to purple)
  const radius = size * 0.18;
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  
  // Draw rounded rectangle background
  ctx.fillStyle = gradient;
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
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Draw play button circle (teal/cyan accent)
  const circleRadius = 14 * scale;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 3 * scale, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#00d4aa';
  ctx.fill();
  
  // Draw play triangle inside circle
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  const playX = centerX - 3 * scale;
  const playY = centerY - 3 * scale;
  const playSize = 10 * scale;
  ctx.moveTo(playX - playSize * 0.4, playY - playSize * 0.6);
  ctx.lineTo(playX + playSize * 0.6, playY);
  ctx.lineTo(playX - playSize * 0.4, playY + playSize * 0.6);
  ctx.closePath();
  ctx.fill();
  
  // Draw download arrow below
  const arrowY = centerY + 12 * scale;
  const arrowWidth = 6 * scale;
  const arrowHeight = 8 * scale;
  
  // Arrow stem
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(centerX - 2 * scale, centerY + 6 * scale, 4 * scale, 6 * scale);
  
  // Arrow head (triangle pointing down)
  ctx.beginPath();
  ctx.moveTo(centerX - arrowWidth, arrowY);
  ctx.lineTo(centerX + arrowWidth, arrowY);
  ctx.lineTo(centerX, arrowY + arrowHeight);
  ctx.closePath();
  ctx.fill();
  
  // Download base line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 10 * scale, centerY + 20 * scale);
  ctx.lineTo(centerX + 10 * scale, centerY + 20 * scale);
  ctx.stroke();
  
  return canvas.toBuffer('image/png');
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
