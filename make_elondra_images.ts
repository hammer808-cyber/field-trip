import { Jimp } from 'jimp';
import fs from 'fs';

// Helper drawing functions using safe pixel setting for smaller optimized canvas
function drawRect(img: any, xStart: number, yStart: number, w: number, h: number, color: number) {
  const xEnd = Math.min(img.width, xStart + w);
  const yEnd = Math.min(img.height, yStart + h);
  for (let y = Math.max(0, yStart); y < yEnd; y++) {
    for (let x = Math.max(0, xStart); x < xEnd; x++) {
      img.setPixelColor(color, x, y);
    }
  }
}

function drawCircle(img: any, cx: number, cy: number, r: number, color: number) {
  const r2 = r * r;
  const xStart = Math.max(0, Math.floor(cx - r));
  const xEnd = Math.min(img.width, Math.ceil(cx + r));
  const yStart = Math.max(0, Math.floor(cy - r));
  const yEnd = Math.min(img.height, Math.ceil(cy + r));

  for (let y = yStart; y < yEnd; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    for (let x = xStart; x < xEnd; x++) {
      const dx = x - cx;
      if (dx * dx + dy2 <= r2) {
        img.setPixelColor(color, x, y);
      }
    }
  }
}

// Parametric line rendering - 100% immune to infinite loops, extremely fast
function drawLine(img: any, x0: number, y0: number, x1: number, y1: number, color: number, thickness = 1) {
  const dist = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (dist === 0) {
    drawCircle(img, x0, y0, thickness / 2, color);
    return;
  }
  for (let i = 0; i <= dist; i++) {
    const t = i / dist;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    if (thickness <= 1) {
      if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
        img.setPixelColor(color, x, y);
      }
    } else {
      drawCircle(img, x, y, thickness / 2, color);
    }
  }
}

// Draw Elondra's split-themed high-fidelity portrait procedurally on a fast 128-px scale canvas
function drawElondraCharacter(img: any, cx: number, cy: number, scale: number) {
  const w = img.width;
  const h = img.height;

  // Split-dyed hair background layers
  const hairRadFar = 22 * scale;
  const hairRadMid = 14 * scale;

  for (let y = Math.floor(cy - 10 * scale); y < Math.floor(cy + 30 * scale); y++) {
    for (let x = Math.floor(cx - hairRadFar); x < Math.floor(cx + hairRadFar); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // Nice wavy outline
      const wave = Math.sin(y / (2 * scale)) * 2 * scale;
      if (dist < hairRadFar + wave && dist > hairRadMid - 5 * scale) {
        if (x < cx) {
          img.setPixelColor(0xff1493ff, x, y); // Hot pink (magenta)
        } else {
          img.setPixelColor(0x111115ff, x, y); // Gothic charcoal black
        }
      }
    }
  }

  // Draw face skin oval
  drawCircle(img, cx, cy + 2 * scale, 12 * scale, 0xffd3b6ff); // Natural skin color

  // Draw hair bangs overlay on forehead
  for (let y = Math.floor(cy - 10 * scale); y < Math.floor(cy); y++) {
    for (let x = Math.floor(cx - 10 * scale); x < Math.floor(cx + 10 * scale); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx*dx+ dy*dy < 100 * scale * scale) {
        if (x < cx) {
          img.setPixelColor(0xff1493ff, x, y);
        } else {
          img.setPixelColor(0x111115ff, x, y);
        }
      }
    }
  }

  // Gold Star sunglasses on top of hair
  const glassY = cy - 8 * scale;
  const glassW = 6 * scale;
  drawCircle(img, cx - glassW, glassY, 5 * scale, 0xffd700ff);
  drawCircle(img, cx + glassW, glassY, 5 * scale, 0xffd700ff);
  drawCircle(img, cx - glassW, glassY, 2 * scale, 0x330033ff); // Inner dark glass lens
  drawCircle(img, cx + glassW, glassY, 2 * scale, 0x330033ff); // Inner dark glass lens
  drawLine(img, cx - glassW, glassY, cx + glassW, glassY, 0xffd700ff, 1);

  // Eyeliner and face decals
  const eyeY = cy + 2 * scale;
  img.setPixelColor(0x111115ff, cx - 5, eyeY); // Left eye
  img.setPixelColor(0x111115ff, cx + 5, eyeY); // Right eye
  img.setPixelColor(0xff1493ff, cx, cy + 6 * scale); // Cute hot pink lips

  // Gold hoop earrings
  img.setPixelColor(0xffd700ff, cx - 13 * scale, cy + 6 * scale);
  img.setPixelColor(0xffd700ff, cx + 13 * scale, cy + 6 * scale);

  // Black high collar neck
  drawRect(img, cx - 3 * scale, cy + 10 * scale, 6 * scale, 4 * scale, 0x111115ff);
  img.setPixelColor(0x00ffffff, cx, cy + 12 * scale); // Turquoise globe medallion

  // Checkered jacket shoulders
  const blazerY = cy + 14 * scale;
  for (let y = blazerY; y < h; y++) {
    for (let x = cx - 25 * scale; x < cx + 25 * scale; x++) {
      const dx = x - cx;
      const dy = y - blazerY;
      if (Math.abs(dx) < 6 * scale + dy * 1.5) {
        const cxGrid = Math.floor((x - cx) / (4 * scale));
        const cyGrid = Math.floor((y - blazerY) / (4 * scale));
        const col = (cxGrid + cyGrid) % 2 === 0 ? 0x00b4d4ff : 0x7b2cbfff; // Teal & purple chessboard jackets
        img.setPixelColor(col, x, y);
      }
    }
  }

  // Little star sparkles in the sky
  img.setPixelColor(0xffd700ff, cx - 24, cy - 20);
  img.setPixelColor(0x00ffffff, cx + 24, cy - 18);
}

// Draw backgrounds with high visual style
async function generateAll() {
  console.log('Generating fast procedural designs for Elondra...');

  // 1. avatar.png (Draw small at 128x128, scale up to 512x512)
  const avImg = new Jimp({ width: 128, height: 128, color: 0x180f2dff });
  drawCircle(avImg, 64, 64, 60, 0xffd700ff); // Gold ring margin
  drawCircle(avImg, 64, 64, 57, 0x180f2dff); // Hollow inner circle
  drawElondraCharacter(avImg, 64, 64, 2.0);
  avImg.resize({ w: 512, h: 512 });
  await avImg.write('public/assets/characters/elondra/avatar.png');
  console.log('Saved avatar.png successfully');

  // 2. card.png (Draw small at 128x192, scale up to 800x1200)
  const cardImg = new Jimp({ width: 128, height: 192, color: 0x1c1236ff });
  drawRect(cardImg, 0, 0, 128, 4, 0xfaf4e8ff); // Margins cream
  drawRect(cardImg, 0, 188, 128, 4, 0xfaf4e8ff);
  drawRect(cardImg, 0, 0, 4, 192, 0xfaf4e8ff);
  drawRect(cardImg, 124, 0, 4, 192, 0xfaf4e8ff);
  // Leopard prints / starry diagonal accents
  for (let y = 140; y < 188; y += 12) {
    for (let x = 4; x < 60; x += 12) {
      if ((Math.round(x/12) + Math.round(y/12)) % 2 === 0) {
        drawCircle(cardImg, x, y, 2, 0x0c0617ff);
      }
    }
  }
  drawElondraCharacter(cardImg, 64, 80, 2.4);
  // Gold parchment scrolled banner
  drawRect(cardImg, 14, 150, 100, 22, 0xfaf4e8ff);
  drawRect(cardImg, 14, 150, 100, 2, 0xffd700ff);
  cardImg.resize({ w: 800, h: 1200 });
  await cardImg.write('public/assets/characters/elondra/card.png');
  console.log('Saved card.png successfully');

  // 3. full.png (Draw small at 128x192, scale to 800x1200 with alpha transparent back)
  const fullImg = new Jimp({ width: 128, height: 192, color: 0x00000000 });
  drawElondraCharacter(fullImg, 64, 80, 2.5);
  // Standing badge plate
  drawRect(fullImg, 24, 160, 80, 16, 0xff00ffff);
  drawRect(fullImg, 26, 162, 76, 12, 0x111115ff);
  fullImg.resize({ w: 800, h: 1200 });
  await fullImg.write('public/assets/characters/elondra/full.png');
  console.log('Saved full.png successfully');

  // 4. results.png (Draw small at 128x128, scale to 1024x1024)
  const resImg = new Jimp({ width: 128, height: 128, color: 0x150b28ff });
  // Vanity lights strip on left
  drawRect(resImg, 6, 6, 2, 116, 0xffd166ff);
  for (let y = 12; y < 116; y += 20) {
    drawCircle(resImg, 7, y, 3, 0xffeb3bff);
  }
  // Pink lava lamp on right
  drawRect(resImg, 110, 60, 6, 40, 0x7b2cbfff);
  drawCircle(resImg, 113, 75, 2, 0xff007fff);
  drawCircle(resImg, 113, 85, 2, 0xff00ffff);
  drawElondraCharacter(resImg, 64, 60, 2.0);
  resImg.resize({ w: 1024, h: 1024 });
  await resImg.write('public/assets/characters/elondra/results.png');
  console.log('Saved results.png successfully');

  // Mirror generated public assets directly into live dist folder, to ensure dev server has them immediately
  fs.mkdirSync('dist/assets/characters/elondra', { recursive: true });
  fs.copyFileSync('public/assets/characters/elondra/avatar.png', 'dist/assets/characters/elondra/avatar.png');
  fs.copyFileSync('public/assets/characters/elondra/card.png', 'dist/assets/characters/elondra/card.png');
  fs.copyFileSync('public/assets/characters/elondra/full.png', 'dist/assets/characters/elondra/full.png');
  fs.copyFileSync('public/assets/characters/elondra/results.png', 'dist/assets/characters/elondra/results.png');
  console.log('Successfully cloned all public assets to live dev /dist directory!');
}

generateAll().catch(err => {
  console.error('Compilation or execution error:', err);
});
