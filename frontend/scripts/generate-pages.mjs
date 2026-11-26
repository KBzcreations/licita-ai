// Genera las páginas estáticas por aeropuerto y aerolínea, el sitemap y los enlaces internos de la portada.
// Uso: npm run pages   (cambia SITE en scripts/site.mjs cuando haya dominio propio y vuelve a ejecutarlo)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AIRPORT_DATA from '../reclamalo-airports.js';
import { SITE, LEGAL_DATE } from './site.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const today = new Date().toISOString().slice(0, 10);

const AIRPORTS = new Map(AIRPORT_DATA.split(';').map((row) => {
  const [code, label, lat, lon, eu] = row.split('|');
  return [code, { code, label, lat: +lat, lon: +lon, eu: eu === '1' }];
}));
const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
// Vuelo con salida de la UE: el Reglamento aplica sea cual sea la aerolínea.
const compensation = (a, b) => {
  const d = km(a, b);
  if (d <= 1500) return { d, eur: 250, band: 'Hasta 1.500 km' };
  if (a.eu && b.eu) return { d, eur: 400, band: 'Más de 1.500 km dentro de la UE' };
  if (d <= 3500) return { d, eur: 400, band: '1.500–3.500 km' };
  return { d, eur: 600, band: 'Más de 3.500 km', longHaul: true };
};
const fmtKm = (d) => Math.round(d).toLocaleString('es-ES');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Aeropuertos españoles con página propia
const SPANISH = [
  ['MAD', 'madrid', 'Madrid-Barajas'], ['BCN', 'barcelona', 'Barcelona-El Prat'], ['PMI', 'palma-de-mallorca', 'Palma de Mallorca'],
  ['AGP', 'malaga', 'Málaga-Costa del Sol'], ['ALC', 'alicante', 'Alicante-Elche'], ['LPA', 'gran-canaria', 'Gran Canaria'],
  ['TFS', 'tenerife-sur', 'Tenerife Sur'], ['TFN', 'tenerife-norte', 'Tenerife Norte'], ['VLC', 'valencia', 'Valencia'],
  ['SVQ', 'sevilla', 'Sevilla'], ['BIO', 'bilbao', 'Bilbao'], ['IBZ', 'ibiza', 'Ibiza'], ['GRX', 'granada', 'Granada-Jaén'],
  ['ACE', 'lanzarote', 'Lanzarote'], ['FUE', 'fuerteventura', 'Fuerteventura'], ['SCQ', 'santiago', 'Santiago de Compostela'],
];
// Destinos de referencia para las tablas (se omite el propio aeropuerto)
const DESTS = [
  ['MAD', 'Madrid'], ['BCN', 'Barcelona'], ['PMI', 'Palma'], ['LPA', 'Gran Canaria'], ['LHR', 'Londres-Heathrow'], ['CDG', 'París-Charles de Gaulle'],
  ['AMS', 'Ámsterdam'], ['FCO', 'Roma-Fiumicino'], ['BER', 'Berlín'], ['LIS', 'Lisboa'], ['RAK', 'Marrakech'], ['JFK', 'Nueva York-JFK'], ['BOG', 'Bogotá'],
];

// Nombres en español para las tablas
const NAMES = Object.fromEntries([...SPANISH.map(([c, , n]) => [c, n]), ...DESTS]);
const nameOf = (code) => NAMES[code] || AIRPORTS.get(code).label.split(' – ')[0];

const AIRLINES = [
  {
    slug: 'ryanair', name: 'Ryanair',
    intro: 'Ryanair es una aerolínea irlandesa, es decir, de la Unión Europea. El Reglamento (CE) 261/2004 le aplica en todos sus vuelos que salen de un aeropuerto de la UE, el EEE o Suiza, y también en los que llegan a la UE desde fuera.',
    notes: ['Algunos vuelos del grupo los operan otras filiales europeas. Reclama siempre a la compañía que figura como operadora en tu tarjeta de embarque o en la confirmación.', 'Si te ofrecen un vale o un reembolso parcial, no estás obligado a aceptarlo en lugar de la compensación en dinero.'],
    routes: [['MAD', 'LHR'], ['BCN', 'BER'], ['AGP', 'AMS'], ['SVQ', 'FCO'], ['PMI', 'LPA']],
  },
  {
    slug: 'vueling', name: 'Vueling',
    intro: 'Vueling es una aerolínea española con base en Barcelona. Como compañía de la UE, el Reglamento le aplica en los vuelos que salen de la UE y en los que llegan a la UE desde un país de fuera.',
    notes: ['Si tu vuelo lo operó otra compañía (código compartido), reclama a la que operó el avión.', 'Los vuelos entre la Península y Canarias superan los 1.500 km dentro de la UE: la compensación de referencia es de 400 € por pasajero.'],
    routes: [['BCN', 'CDG'], ['BCN', 'LPA'], ['MAD', 'BCN'], ['BCN', 'RAK'], ['BIO', 'BCN']],
  },
  {
    slug: 'iberia', name: 'Iberia',
    intro: 'Iberia es una aerolínea española. El Reglamento le aplica en sus vuelos con salida de la UE y en los que llegan a España u otro país de la UE desde fuera, como los vuelos desde América.',
    notes: ['Muchos vuelos con código de Iberia los operan Iberia Express o Air Nostrum (Iberia Regional). La reclamación se dirige a la compañía que operó el vuelo.', 'En vuelos de más de 3.500 km fuera de la UE, un retraso de entre 3 y 4 horas da derecho a 300 € en lugar de 600 €.'],
    routes: [['MAD', 'JFK'], ['MAD', 'BOG'], ['MAD', 'LHR'], ['MAD', 'TFN'], ['MAD', 'SCQ']],
  },
  {
    slug: 'air-europa', name: 'Air Europa',
    intro: 'Air Europa es una aerolínea española con mucha presencia en vuelos entre España y América. Como compañía de la UE, el Reglamento le aplica también en los vuelos de vuelta hacia España desde fuera de la UE.',
    notes: ['En vuelos de larga distancia (más de 3.500 km fuera de la UE) la compensación de referencia es de 600 €, o de 300 € si el retraso a la llegada fue de entre 3 y 4 horas.', 'Si perdiste una conexión dentro de la misma reserva, lo que cuenta es el retraso al llegar al destino final.'],
    routes: [['MAD', 'BOG'], ['MAD', 'JFK'], ['MAD', 'PMI'], ['MAD', 'LPA'], ['BCN', 'MAD']],
  },
  {
    slug: 'volotea', name: 'Volotea',
    intro: 'Volotea es una aerolínea europea especializada en rutas entre ciudades medianas. El Reglamento le aplica en todos sus vuelos con salida de la UE.',
    notes: ['Muchas rutas de Volotea no superan los 1.500 km: la compensación de referencia en esos casos es de 250 € por pasajero.', 'Una cancelación avisada con 14 días o más de antelación no da derecho a compensación, aunque sí a reembolso o transporte alternativo.'],
    routes: [['BIO', 'PMI'], ['AGP', 'BIO'], ['VLC', 'SCQ'], ['SVQ', 'BIO'], ['ALC', 'SCQ']],
  },
  {
    slug: 'binter', name: 'Binter',
    intro: 'Binter es una aerolínea canaria. El Reglamento le aplica en los vuelos entre islas, en los vuelos entre Canarias y la Península y en sus rutas internacionales con salida de la UE.',
    notes: ['Los vuelos entre islas son cortos: la referencia es 250 € por pasajero si el retraso al llegar supera las 3 horas.', 'Entre Canarias y la Península se superan los 1.500 km dentro de la UE: la referencia sube a 400 €.'],
    routes: [['TFN', 'LPA'], ['LPA', 'ACE'], ['TFN', 'MAD'], ['LPA', 'SVQ'], ['LPA', 'RAK']],
  },
];

const layout = ({ path, title, description, body }) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#071d2b">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="article">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="Reclámalo">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/og-reclamalo.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/landing.css">
</head>
<body>
<header class="top"><a href="/" class="brand"><span>R</span> Reclámalo</a><a class="top-cta" href="/#evaluador">Revisar mi vuelo</a></header>
<main>
${body}
</main>
<footer>
<nav aria-label="Más páginas">
<p><b>Por aeropuerto:</b> ${SPANISH.map(([, slug, name]) => `<a href="/aeropuerto/${slug}">${esc(name)}</a>`).join(' · ')}</p>
<p><b>Por aerolínea:</b> ${AIRLINES.map((a) => `<a href="/aerolinea/${a.slug}">${esc(a.name)}</a>`).join(' · ')}</p>
</nav>
<p class="legal">Reclámalo es una herramienta informativa gratuita y no tiene relación con ninguna aerolínea ni aeropuerto. Reglas vigentes a ${LEGAL_DATE}. <a href="/aviso-legal">Aviso legal</a> · <a href="/privacidad">Privacidad</a></p>
</footer>
</body>
</html>
`;

const table = (rows) => `<table>
<thead><tr><th>Trayecto</th><th>Distancia</th><th>Compensación de referencia</th></tr></thead>
<tbody>
${rows.map(([a, b, labelA, labelB]) => {
    const c = compensation(a, b);
    const nearLimit = Math.abs(c.d - 1500) < 60 || (!(a.eu && b.eu) && Math.abs(c.d - 3500) < 60);
    return `<tr><td>${esc(labelA)} → ${esc(labelB)}</td><td>${fmtKm(c.d)} km${nearLimit ? '*' : ''}</td><td><b>${c.eur} €</b>${c.longHaul ? ' (300 € si el retraso fue de 3 a 4 h)' : ''}</td></tr>`;
  }).join('\n')}
</tbody>
</table>
${rows.some(([a, b]) => { const d = compensation(a, b).d; return Math.abs(d - 1500) < 60 || (!(a.eu && b.eu) && Math.abs(d - 3500) < 60); }) ? '<p class="note">* Distancia cercana a un límite (1.500 o 3.500 km): el importe depende de los aeropuertos exactos; compruébalo con el evaluador.</p>' : ''}`;

const howTo = `<h2>Cómo reclamar paso a paso</h2>
<ol>
<li><b>Comprueba tu caso gratis</b> en Reclámalo: te dice si parece haber compensación y cuánto, y qué datos faltan.</li>
<li><b>Reclama primero a la aerolínea</b> que operó el vuelo, por su canal oficial, y guarda el justificante.</li>
<li><b>Si en un mes no responde</b> o la respuesta no te convence, presenta la reclamación ante <a href="https://www.seguridadaerea.gob.es/es/ambitos/derechos-de-los-pasajeros/inicia-tu-reclamacion-con-aesa" rel="noopener" target="_blank">AESA</a>. Es gratis y su decisión obliga a la aerolínea.</li>
</ol>
<p class="note">No hace falta pagar comisión a un intermediario: con Reclámalo preparas la carta, la lista de documentos y los pasos para AESA sin coste.</p>`;

const basics = `<h2>Cuándo te corresponde compensación</h2>
<ul>
<li><b>Retraso:</b> si llegas a tu destino final con 3 horas o más de retraso.</li>
<li><b>Cancelación:</b> si te avisaron con menos de 14 días de antelación, salvo que te ofrecieran una alternativa dentro de los márgenes legales.</li>
<li><b>Embarque denegado:</b> por sobreventa u otro motivo operativo, sin renunciar voluntariamente a tu plaza.</li>
</ul>
<p>La aerolínea puede librarse si prueba circunstancias extraordinarias que no pudo evitar, como una tormenta o una huelga de controladores. Una avería técnica normal no suele serlo.</p>`;

const written = [];
const write = (rel, html) => {
  const file = join(pub, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written.push(rel);
};

rmSync(join(pub, 'aeropuerto'), { recursive: true, force: true });
rmSync(join(pub, 'aerolinea'), { recursive: true, force: true });

for (const [code, slug, name] of SPANISH) {
  const a = AIRPORTS.get(code);
  if (!a) throw new Error(`Falta el aeropuerto ${code}`);
  const rows = DESTS.filter(([d]) => d !== code).map(([d, label]) => [a, AIRPORTS.get(d), name, label]);
  const path = `/aeropuerto/${slug}`;
  write(`aeropuerto/${slug}.html`, layout({
    path,
    title: `Vuelo retrasado o cancelado en ${name} (${code}): cuánto te deben`,
    description: `¿Retraso de 3 horas o más o cancelación en el aeropuerto de ${name}? Mira cuánto te corresponde según la distancia y prepara tu reclamación gratis, sin comisión.`,
    body: `<p class="eyebrow">AEROPUERTO DE ${esc(name.toUpperCase())} · ${code}</p>
<h1>Vuelo retrasado o cancelado en ${esc(name)}: cuánto te deben</h1>
<p class="lead">Todos los vuelos que salen de ${esc(name)} están cubiertos por el Reglamento europeo 261/2004, sea cual sea la aerolínea. Si llegaste a tu destino con 3 horas o más de retraso o te cancelaron el vuelo con poco aviso, puedes tener derecho a entre 250 y 600 € por pasajero.</p>
<a class="cta" href="/?origen=${code}#evaluador">Comprobar mi vuelo desde ${esc(name)}</a>
<h2>Cuánto te corresponde desde ${esc(name)}</h2>
<p>La cantidad depende de la distancia del vuelo, medida en línea recta como indica el Reglamento. Estos son algunos ejemplos calculados desde ${code}:</p>
${table(rows)}
<p class="note">Importes por pasajero. Si te ofrecieron otro vuelo y llegaste con poco retraso, la compensación puede reducirse a la mitad. Para vuelos que llegan a ${esc(name)} desde fuera de la UE, solo hay compensación si la aerolínea es europea.</p>
${basics}
${howTo}`,
  }));
}

for (const al of AIRLINES) {
  const rows = al.routes.map(([o, d]) => [AIRPORTS.get(o), AIRPORTS.get(d), nameOf(o), nameOf(d)]);
  const path = `/aerolinea/${al.slug}`;
  write(`aerolinea/${al.slug}.html`, layout({
    path,
    title: `Reclamar a ${al.name} por retraso o cancelación: cuánto te deben`,
    description: `¿Retraso de 3 horas o más o cancelación con ${al.name}? Comprueba gratis si te corresponden 250, 400 o 600 € y prepara la reclamación sin pagar comisión.`,
    body: `<p class="eyebrow">RECLAMAR A ${esc(al.name.toUpperCase())}</p>
<h1>Reclamar a ${esc(al.name)} por retraso o cancelación</h1>
<p class="lead">${esc(al.intro)}</p>
<a class="cta" href="/#evaluador">Comprobar mi vuelo con ${esc(al.name)}</a>
<h2>Lo que conviene saber</h2>
<ul>${al.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
<h2>Ejemplos de trayectos y su compensación</h2>
<p>La cantidad depende de la distancia del vuelo, no del precio del billete. Algunos ejemplos:</p>
${table(rows)}
${basics}
${howTo}`,
  }));
}

// Sitemap
const urls = ['/', ...written.map((f) => `/${f.replace(/\.html$/, '')}`), '/aviso-legal', '/privacidad'];
writeFileSync(join(pub, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(pub, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// Enlaces internos y dominio en la portada
const indexFile = join(root, 'index.html');
let index = readFileSync(indexFile, 'utf8');
const links = `<!-- paginas:inicio -->
    <section class="section pages-section" id="por-aeropuerto"><div class="shell narrow">
      <div class="section-heading"><p class="eyebrow coral">GUÍAS RÁPIDAS</p><h2>Por aeropuerto y por aerolínea</h2></div>
      <p class="pages-links"><b>Aeropuertos:</b> ${SPANISH.map(([, slug, name]) => `<a href="/aeropuerto/${slug}">${esc(name)}</a>`).join(' · ')}</p>
      <p class="pages-links"><b>Aerolíneas:</b> ${AIRLINES.map((a) => `<a href="/aerolinea/${a.slug}">${esc(a.name)}</a>`).join(' · ')}</p>
    </div></section>
    <!-- paginas:fin -->`;
index = index.replace(/<!-- paginas:inicio -->[\s\S]*?<!-- paginas:fin -->/, links);
index = index
  .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}/">`)
  .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${SITE}/">`)
  .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${SITE}/og-reclamalo.png">`)
  .replace(/("url": ")[^"]*(",\s*"applicationCategory")/, `$1${SITE}/$2`);
writeFileSync(indexFile, index);

console.log(`Generadas ${written.length} páginas; sitemap con ${urls.length} URLs en ${SITE}`);
