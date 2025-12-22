// Simple Icon Generator - Creates TikTok-style icons
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
  
  // Background - rounded black square
  const radius = size * 0.15;
  ctx.fillStyle = '#000000';
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
  
  // Scale for TikTok logo
  const scale = size / 24;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Draw simplified TikTok musical note
  function drawNote(offsetX, offsetY, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    
    // Note body (vertical bar)
    const barWidth = 3 * scale;
    const barHeight = 12 * scale;
    const barX = centerX - barWidth/2 + offsetX;
    const barY = centerY - barHeight/2 + offsetY - 2 * scale;
    
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Note head (circle)
    const headRadius = 3.5 * scale;
    const headX = centerX - 4 * scale + offsetX;
    const headY = centerY + 5 * scale + offsetY;
    
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Top curve
    const curveX = centerX + 3 * scale + offsetX;
    const curveY = barY + 2 * scale;
    
    ctx.beginPath();
    ctx.arc(curveX, curveY, 4 * scale, Math.PI * 0.8, Math.PI * 1.8);
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  
  // Draw cyan layer (offset)
  drawNote(-0.8 * scale, -0.8 * scale, '#25F4EE');
  
  // Draw pink layer
  drawNote(0.8 * scale, 0.8 * scale, '#FE2C55');
  
  // Draw white center
  drawNote(0, 0, '#FFFFFF');
  
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
