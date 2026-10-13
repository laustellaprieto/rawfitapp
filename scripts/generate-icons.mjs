// Genera los íconos de la PWA a partir del logo de la marca (assets/logo.png) con sharp.
// Para cambiar el ícono: reemplaza assets/logo.png (PNG con fondo transparente) y ejecuta `npm run icons`.
import sharp from 'sharp';

const LOGO = 'assets/logo.png';
const FONDO = '#111111';

/** Logo centrado sobre fondo oscuro; `escala` = alto del logo respecto al ícono. */
async function icono(archivo, tam, escala, { redondeado = false } = {}) {
  const alto = Math.round(tam * escala);
  const logo = await sharp(LOGO).resize({ height: alto, width: alto, fit: 'inside' }).toBuffer();
  const meta = await sharp(logo).metadata();
  let img = sharp({ create: { width: tam, height: tam, channels: 4, background: FONDO } }).composite([
    { input: logo, left: Math.round((tam - meta.width) / 2), top: Math.round((tam - meta.height) / 2) },
  ]);
  if (redondeado) {
    const r = Math.round(tam * 0.22);
    const mascara = Buffer.from(`<svg width="${tam}" height="${tam}"><rect width="${tam}" height="${tam}" rx="${r}" fill="#fff"/></svg>`);
    img = sharp(await img.png().toBuffer()).composite([{ input: mascara, blend: 'dest-in' }]);
  }
  await img.png().toFile(archivo);
  console.log('✓', archivo);
}

await icono('public/pwa-192.png', 192, 0.72);
await icono('public/pwa-512.png', 512, 0.72);
// Android recorta los íconos "maskable": el logo va más chico para quedar dentro de la zona segura.
await icono('public/pwa-maskable-512.png', 512, 0.56);
// iPhone (pantalla de inicio): fondo opaco, iOS redondea las esquinas solo.
await icono('public/apple-touch-icon.png', 180, 0.66);
await icono('public/favicon.png', 64, 0.8, { redondeado: true });
