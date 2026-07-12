// One-off script: crop the new EasyLinks brand assets and generate every
// derived icon size used across the web app, browser extension, and Android app.
// Run with: node scripts/generate-branding.mjs
// Safe to delete after running.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ICON_SRC = path.join(ROOT, 'Images/easylinks_icon.jpg');
const LOGO_SRC = path.join(ROOT, 'Images/easylinks_logo.jpg');

// Bounding boxes were located by flood-filling from a seed pixel known to be
// inside the flat white area of the rounded-square icon, using a whiteness
// threshold that excludes the mockup's off-white paper background.
const ICON_BBOX = { left: 484, top: 164, width: 923 - 484, height: 603 - 164 };
const LOGO_LOCKUP_BBOX = { left: 389, top: 120, width: 1019 - 389, height: 586 - 120 };

async function main() {
  // 1. Master square icon (flat white rounded square + blue rings, no shadow, no bg).
  // The extract() bbox is a bounding rectangle around a rounded-corner shape, so its
  // four corner triangles still show a sliver of the source mockup's background.
  // Mask those out with a matching rounded-rect so corners become transparent.
  const rawIcon = await sharp(ICON_SRC).extract(ICON_BBOX).resize(1024, 1024).png().toBuffer();
  const roundedMask = Buffer.from(
    `<svg width="1024" height="1024"><rect x="0" y="0" width="1024" height="1024" rx="220" ry="220" fill="#fff"/></svg>`
  );
  const masterIcon = await sharp(rawIcon)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  writeFileSync(path.join(ROOT, 'Images/icon-master.png'), masterIcon);

  // 2. Logo lockup (icon + "EasyLinks" wordmark), flattened onto solid white
  const logoLockup = await sharp(LOGO_SRC)
    .extract(LOGO_LOCKUP_BBOX)
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  writeFileSync(path.join(ROOT, 'public/logo-lockup.png'), logoLockup);

  // 3. White silhouette of just the ring glyph on transparent bg, for Android's
  // monochrome status-bar notification icon. Derive alpha from how "blue" each
  // pixel is; recolor every kept pixel pure white.
  const { data, info } = await sharp(masterIcon)
    .resize(512, 512)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    // Blueness: how far this pixel is from white, scaled by blue-vs-red gap.
    const blueness = Math.max(0, Math.min(255, (255 - r) * 1.6));
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = b > r ? blueness : 0;
  }
  const silhouette = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
  writeFileSync(path.join(ROOT, 'Images/icon-silhouette.png'), silhouette);

  // ---- Web / PWA ----
  await sharp(masterIcon).resize(192, 192).toFile(path.join(ROOT, 'public/icon-192.png'));
  await sharp(masterIcon).resize(512, 512).toFile(path.join(ROOT, 'public/icon-512.png'));

  const icon64 = await sharp(masterIcon).resize(64, 64).png().toBuffer();
  const icon64b64 = icon64.toString('base64');
  writeFileSync(
    path.join(ROOT, 'public/icon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n  <image href="data:image/png;base64,${icon64b64}" width="64" height="64"/>\n</svg>\n`
  );

  // favicon.ico: pack a single 256x256 PNG into a minimal ICO container
  // (modern browsers/OSes accept PNG-compressed ICO frames).
  const favPng = await sharp(masterIcon).resize(256, 256).png().toBuffer();
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type: icon
  icoHeader.writeUInt16LE(1, 4); // 1 image
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0); // width (0 = 256)
  dirEntry.writeUInt8(0, 1); // height (0 = 256)
  dirEntry.writeUInt8(0, 2); // color palette
  dirEntry.writeUInt8(0, 3); // reserved
  dirEntry.writeUInt16LE(1, 4); // color planes
  dirEntry.writeUInt16LE(32, 6); // bits per pixel
  dirEntry.writeUInt32LE(favPng.length, 8); // image data size
  dirEntry.writeUInt32LE(6 + 16, 12); // offset
  writeFileSync(path.join(ROOT, 'app/favicon.ico'), Buffer.concat([icoHeader, dirEntry, favPng]));

  // ---- Chrome extension ----
  mkdirSync(path.join(ROOT, 'chrome-extension/icons'), { recursive: true });
  for (const size of [16, 48, 128]) {
    await sharp(masterIcon)
      .resize(size, size)
      .toFile(path.join(ROOT, `chrome-extension/icons/icon-${size}.png`));
  }

  // ---- Android ----
  const mipmapSizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const splashSizes = { mdpi: 300, hdpi: 450, xhdpi: 600, xxhdpi: 900, xxxhdpi: 1200 };
  const notifSizes = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };

  for (const [density, size] of Object.entries(mipmapSizes)) {
    await sharp(masterIcon)
      .resize(size, size)
      .toFile(path.join(ROOT, `android/app/src/main/res/mipmap-${density}/ic_launcher.png`));
  }
  for (const [density, size] of Object.entries(splashSizes)) {
    await sharp(masterIcon)
      .resize(size, size)
      .toFile(path.join(ROOT, `android/app/src/main/res/drawable-${density}/splash.png`));
  }
  for (const [density, size] of Object.entries(notifSizes)) {
    await sharp(silhouette)
      .resize(size, size)
      .toFile(path.join(ROOT, `android/app/src/main/res/drawable-${density}/ic_notification_icon.png`));
  }
  await sharp(masterIcon).resize(512, 512).toFile(path.join(ROOT, 'android/store_icon.png'));

  console.log('Done.');
}

main();
