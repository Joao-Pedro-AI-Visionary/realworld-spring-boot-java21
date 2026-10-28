#!/usr/bin/env node
// Gera os assets estaticos do Conduit (favicons, icones PWA, manifest e og-image)
// a partir dos SVGs-fonte versionados em scripts/assets/.
//
// Uso (dentro de frontend/): npm run assets
//
// Deterministico: mesma entrada + mesma versao do sharp/png-to-ico = mesmos bytes.
// Observacao: o og-image tem texto; o resultado depende das fontes do sistema
// (Segoe UI no Windows, DejaVu Sans no Linux). Os icones nao tem texto.

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'assets');
const out = path.resolve(here, '..', 'public');

const BRAND = {
  name: 'Conduit',
  shortName: 'Conduit',
  description: 'Um lugar para escrever e ler histórias. Vue 3 + Spring Boot 3.5 / Java 21.',
  primary: '#5B5BF7',
  dark: '#0B0D12',
  light: '#F7F8FB',
};

// Opcoes fixas de PNG para saida estavel.
const PNG = { compressionLevel: 9, adaptiveFiltering: false, palette: false };

async function svg(name) {
  return readFile(path.join(src, name));
}

/** Rasteriza um SVG quadrado no tamanho pedido, com supersampling. */
async function rasterSquare(svgBuf, size, { flatten } = {}) {
  // Renderiza em alta densidade e reduz: bordas mais limpas em 16/32/48 px.
  const density = Math.max(72, Math.ceil((size * 4 * 72) / 512));
  let img = sharp(svgBuf, { density }).resize(size, size, { kernel: 'lanczos3', fit: 'fill' });
  if (flatten) img = img.flatten({ background: flatten }).removeAlpha();
  return img.png(PNG).toBuffer();
}

async function write(name, buf) {
  await writeFile(path.join(out, name), buf);
}

async function main() {
  await mkdir(out, { recursive: true });

  const icon = await svg('icon.svg');
  const maskable = await svg('icon-maskable.svg');
  const og = await svg('og-image.svg');

  // favicon.svg: copiado como esta (tem variacao dark via prefers-color-scheme).
  await copyFile(path.join(src, 'favicon.svg'), path.join(out, 'favicon.svg'));

  // favicon.ico com 16, 32 e 48.
  const icoPngs = await Promise.all([16, 32, 48].map((s) => rasterSquare(icon, s)));
  await write('favicon.ico', await pngToIco(icoPngs));

  // Icones PWA.
  await write('icon-192.png', await rasterSquare(icon, 192));
  await write('icon-512.png', await rasterSquare(icon, 512));
  await write('icon-maskable-512.png', await rasterSquare(maskable, 512, { flatten: BRAND.primary }));

  // Apple touch: sem transparencia; o iOS aplica a propria mascara arredondada.
  await write('apple-touch-icon.png', await rasterSquare(maskable, 180, { flatten: BRAND.primary }));

  // Open Graph 1200x630, sem transparencia.
  const ogPng = await sharp(og, { density: 72 })
    .resize(1200, 630, { fit: 'fill' })
    .flatten({ background: BRAND.dark })
    .removeAlpha()
    .png(PNG)
    .toBuffer();
  await write('og-image.png', ogPng);

  // Web App Manifest.
  const manifest = {
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: BRAND.primary,
    background_color: BRAND.dark,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  await write('site.webmanifest', JSON.stringify(manifest, null, 2) + '\n');

  await verify();
}

/** Le os arquivos gerados e confere dimensoes reais; falha o processo se algo divergir. */
async function verify() {
  const expected = {
    'apple-touch-icon.png': [180, 180, false],
    'icon-192.png': [192, 192, true],
    'icon-512.png': [512, 512, true],
    'icon-maskable-512.png': [512, 512, false],
    'og-image.png': [1200, 630, false],
  };
  let ok = true;
  for (const [name, [w, h, alphaAllowed]] of Object.entries(expected)) {
    const m = await sharp(path.join(out, name)).metadata();
    const good = m.width === w && m.height === h && (alphaAllowed || !m.hasAlpha);
    ok &&= good;
    console.log(`${good ? 'OK ' : 'ERR'} ${name}: ${m.width}x${m.height} ${m.format} channels=${m.channels} alpha=${m.hasAlpha}`);
  }

  // ICO: header (6 bytes) + 16 bytes por entrada; byte 0 = largura, 1 = altura (0 = 256).
  const ico = await readFile(path.join(out, 'favicon.ico'));
  const count = ico.readUInt16LE(4);
  const sizes = [];
  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16;
    sizes.push(`${ico[off] || 256}x${ico[off + 1] || 256}`);
  }
  const icoOk = ico.readUInt16LE(2) === 1 && sizes.join(',') === '16x16,32x32,48x48';
  ok &&= icoOk;
  console.log(`${icoOk ? 'OK ' : 'ERR'} favicon.ico: ${count} imagens [${sizes.join(', ')}] ${ico.length} bytes`);

  const manifest = JSON.parse(await readFile(path.join(out, 'site.webmanifest'), 'utf8'));
  console.log(`OK  site.webmanifest: ${manifest.icons.length} icones, display=${manifest.display}`);
  console.log('OK  favicon.svg copiado');

  if (!ok) {
    console.error('Falha na verificacao dos assets.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
