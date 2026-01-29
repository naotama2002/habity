/**
 * Habity アプリのアセット画像を生成するスクリプト
 *
 * 使用方法: node scripts/generate-assets.mjs
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

// Habity のブランドカラー
const PRIMARY_COLOR = '#6366f1';
const WHITE = '#ffffff';

/**
 * SVG からアイコンを生成
 */
async function generateIcon(size, filename, options = {}) {
  const {
    backgroundColor = PRIMARY_COLOR,
    textColor = WHITE,
    text = 'H',
    fontSize = Math.floor(size * 0.5),
    cornerRadius = Math.floor(size * 0.2),
  } = options;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${backgroundColor}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
      >
        ${text}
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(ASSETS_DIR, filename));

  console.log(`Created: ${filename} (${size}x${size})`);
}

/**
 * スプラッシュスクリーンを生成
 */
async function generateSplash(width, height, filename) {
  const logoSize = Math.min(width, height) * 0.3;
  const fontSize = logoSize * 0.4;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${PRIMARY_COLOR}"/>
      <text
        x="50%"
        y="45%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${WHITE}"
      >
        Habity
      </text>
      <text
        x="50%"
        y="55%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize * 0.4}"
        fill="${WHITE}"
        opacity="0.8"
      >
        習慣を、もっとシンプルに
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(ASSETS_DIR, filename));

  console.log(`Created: ${filename} (${width}x${height})`);
}

/**
 * 通知アイコンを生成（モノクロ）
 */
async function generateNotificationIcon(size, filename) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="transparent"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${size * 0.6}"
        font-weight="bold"
        fill="${WHITE}"
      >
        H
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(ASSETS_DIR, filename));

  console.log(`Created: ${filename} (${size}x${size})`);
}

async function main() {
  // assets ディレクトリを作成
  await mkdir(ASSETS_DIR, { recursive: true });

  console.log('Generating Habity assets...\n');

  // アプリアイコン (1024x1024)
  await generateIcon(1024, 'icon.png');

  // Adaptive icon (Android) - 前景のみ
  await generateIcon(1024, 'adaptive-icon.png', {
    cornerRadius: 0,
  });

  // Favicon (Web) - 48x48
  await generateIcon(48, 'favicon.png', {
    cornerRadius: 8,
  });

  // スプラッシュスクリーン (1284x2778 - iPhone 向け)
  await generateSplash(1284, 2778, 'splash.png');

  // 通知アイコン (96x96)
  await generateNotificationIcon(96, 'notification-icon.png');

  console.log('\nDone! Assets generated in ./assets/');
}

main().catch(console.error);
