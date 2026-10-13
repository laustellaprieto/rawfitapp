// Genera los íconos PNG de la PWA a partir de un SVG (usa sharp).
import sharp from 'sharp';

const svg = (size, { maskable = false } = {}) => {
  const pad = maskable ? 0.18 : 0;
  const s = 512;
  const inner = s * (1 - pad * 2);
  const off = s * pad;
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${maskable ? 0 : 112}" fill="#111111"/>
  <g transform="translate(${off} ${off}) scale(${inner / s})">
    <rect x="40" y="40" width="432" height="432" rx="88" fill="none" stroke="#C9A96E" stroke-width="10" opacity="0.5"/>
    <text x="256" y="335" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="250" fill="#C9A96E" letter-spacing="8">RF</text>
    <rect x="166" y="372" width="180" height="8" rx="4" fill="#E8D9B5"/>
  </g>
</svg>`);
};

const out = [
  ['public/pwa-192.png', 192, {}],
  ['public/pwa-512.png', 512, {}],
  ['public/pwa-maskable-512.png', 512, { maskable: true }],
  ['public/apple-touch-icon.png', 180, { maskable: true }],
];
for (const [file, size, opts] of out) {
  await sharp(svg(size, opts)).png().toFile(file);
  console.log('✓', file);
}
