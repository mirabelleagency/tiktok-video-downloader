// Icon Generator Script
// Run with Node.js to generate PNG icons from canvas

const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [16, 32, 48, 128];

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#000000';
  roundRect(ctx, 0, 0, size, size, size * 0.15);
  ctx.fill();
  
  // TikTok logo (simplified)
  const scale = size / 24;
  ctx.save();
  ctx.scale(scale, scale);
  
  // Cyan layer (offset)
  ctx.fillStyle = '#25F4EE';
  ctx.beginPath();
  drawTikTokPath(ctx, -0.5, -0.5);
  ctx.fill();
  
  // Pink layer
  ctx.fillStyle = '#FE2C55';
  ctx.beginPath();
  drawTikTokPath(ctx, 0, 0);
  ctx.fill();
  
  ctx.restore();
  
  return canvas.toBuffer('image/png');
}

function drawTikTokPath(ctx, offsetX, offsetY) {
  // Simplified TikTok musical note path
  ctx.moveTo(17.59 + offsetX, 8.69 + offsetY);
  ctx.bezierCurveTo(
    16.5 + offsetX, 7.5 + offsetY,
    14.82 + offsetX, 5.44 + offsetY,
    13.82 + offsetX, 4.44 + offsetY
  );
  ctx.lineTo(13.82 + offsetX, 4 + offsetY);
  ctx.lineTo(10.37 + offsetX, 4 + offsetY);
  ctx.lineTo(10.37 + offsetX, 15.67 + offsetY);
  ctx.bezierCurveTo(
    10.37 + offsetX, 17.26 + offsetY,
    9.08 + offsetX, 18.55 + offsetY,
    7.49 + offsetX, 18.55 + offsetY
  );
  ctx.bezierCurveTo(
    5.9 + offsetX, 18.55 + offsetY,
    4.61 + offsetX, 17.26 + offsetY,
    4.61 + offsetX, 15.67 + offsetY
  );
  ctx.bezierCurveTo(
    4.61 + offsetX, 14.08 + offsetY,
    5.9 + offsetX, 12.79 + offsetY,
    7.49 + offsetX, 12.79 + offsetY
  );
  ctx.lineTo(8.3 + offsetX, 12.9 + offsetY);
  ctx.lineTo(8.3 + offsetX, 9.4 + offsetY);
  ctx.bezierCurveTo(
    2.77 + offsetX, 9.4 + offsetY,
    1.15 + offsetX, 12.22 + offsetY,
    1.15 + offsetX, 15.67 + offsetY
  );
  ctx.bezierCurveTo(
    1.15 + offsetX, 19.12 + offsetY,
    4.04 + offsetX, 22.01 + offsetY,
    7.49 + offsetX, 22.01 + offsetY
  );
  ctx.bezierCurveTo(
    10.94 + offsetX, 22.01 + offsetY,
    13.83 + offsetX, 19.12 + offsetY,
    13.83 + offsetX, 15.67 + offsetY
  );
  ctx.lineTo(13.83 + offsetX, 11.4 + offsetY);
  ctx.bezierCurveTo(
    15.5 + offsetX, 12.5 + offsetY,
    17.1 + offsetX, 12.93 + offsetY,
    18.6 + offsetX, 12.93 + offsetY
  );
  ctx.lineTo(18.6 + offsetX, 9.43 + offsetY);
  ctx.closePath();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Generate icons
sizes.forEach(size => {
  try {
    const buffer = generateIcon(size);
    fs.writeFileSync(`assets/icons/icon${size}.png`, buffer);
    console.log(`Generated icon${size}.png`);
  } catch (e) {
    console.log(`Skipped icon${size}.png - canvas module not available`);
  }
});

console.log('Icon generation complete!');
console.log('Note: Install canvas module with: npm install canvas');
