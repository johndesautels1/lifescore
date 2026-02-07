/**
 * Generate PWA icons from logo
 * Removes yellow background and creates all required sizes
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = path.join(__dirname, '..', 'logo', 'Copilot_20250715_222233.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

// PWA icon sizes needed
const SIZES = [
  { size: 512, name: 'logo-512.png' },
  { size: 192, name: 'logo-192.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 152, name: 'icon-152.png' },
  { size: 120, name: 'icon-120.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 72, name: 'icon-72.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 32, name: 'favicon-32.png' },
  { size: 16, name: 'favicon-16.png' },
];

// Maskable icon (with padding for safe area)
const MASKABLE_SIZES = [
  { size: 512, name: 'maskable-512.png' },
  { size: 192, name: 'maskable-192.png' },
];

async function generateIcons() {
  console.log('Reading source logo...');

  // Read the original image
  const image = sharp(INPUT);
  const metadata = await image.metadata();
  console.log(`Original size: ${metadata.width}x${metadata.height}`);

  // Remove yellow background by making it transparent
  // The background color is approximately #FFB800 (yellow/orange)
  const processedBuffer = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = processedBuffer;

  // Process pixels - remove yellow/orange background
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate hue to detect yellow-orange range (30-60 degrees)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let hue = 0;
    if (diff !== 0) {
      if (max === r) {
        hue = ((g - b) / diff) % 6;
      } else if (max === g) {
        hue = (b - r) / diff + 2;
      } else {
        hue = (r - g) / diff + 4;
      }
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
    }

    // Saturation
    const sat = max === 0 ? 0 : diff / max;
    const lightness = max / 255;

    // Remove yellow/orange background (hue 20-70, high saturation, high lightness)
    const isYellowOrange = hue >= 20 && hue <= 70 && sat > 0.3 && lightness > 0.5;

    if (isYellowOrange) {
      data[i + 3] = 0; // Make transparent
    }
  }

  // Create processed image with transparency
  const transparentImage = sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  }).png();

  // Save the transparent version
  const transparentPath = path.join(OUTPUT_DIR, 'logo-transparent.png');
  await transparentImage.clone().toFile(transparentPath);
  console.log('Created: logo-transparent.png');

  // Generate all icon sizes
  for (const { size, name } of SIZES) {
    await transparentImage
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(OUTPUT_DIR, name));
    console.log(`Created: ${name} (${size}x${size})`);
  }

  // Generate maskable icons (with background for safe area)
  for (const { size, name } of MASKABLE_SIZES) {
    // Maskable icons need padding (icon should be 80% of total size)
    const iconSize = Math.floor(size * 0.8);
    const padding = Math.floor(size * 0.1);

    await transparentImage
      .clone()
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // Dark blue background #0f172a
      })
      .toFile(path.join(OUTPUT_DIR, name));
    console.log(`Created: ${name} (${size}x${size} maskable)`);
  }

  // Generate favicon.ico (using 32x32 PNG as base)
  // Note: sharp doesn't create .ico, but modern browsers support PNG favicons
  await transparentImage
    .clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(OUTPUT_DIR, 'favicon.png'));
  console.log('Created: favicon.png');

  console.log('\nAll PWA icons generated successfully!');
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
