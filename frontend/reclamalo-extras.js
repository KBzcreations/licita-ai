import AIRPORT_DATA from './reclamalo-airports.js';

/* ===== Reclámalo · extensiones (aportación voluntaria, aeropuertos, comparativa, recordatorio) ===== */
(() => {
  // ---------- CONFIGURACIÓN: pega aquí tu enlace de aportaciones voluntarias ----------
  // Ko-fi (https://ko-fi.com/tunombre) o un enlace de Stripe con importe libre.
  // Vacío = el botón de apoyo no se muestra.
  const DONATION_LINK = 'https://donate.stripe.com/5kQ3cv2cZbPE1Iu0UyeUU05';
  const BROKER_RATE = 0.35; // comisión habitual publicada por intermediarios (IVA incluido)
  // ---------------------------------------------------------------------------

  const UTM_KEY = 'reclamalo-utm-v1';
  const AESA_URL = 'https://www.seguridadaerea.gob.es/es/ambitos/derechos-de-los-pasajeros/inicia-tu-reclamacion-con-aesa';
  const $ = (q) => document.querySelector(q);
  const eur = (n) => `${n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;

  // ---------- UTM: recordar de qué vídeo o campaña llega la visita ----------
  const params = new URLSearchParams(location.search);
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    .map((k) => params.get(k)).filter(Boolean).join('_');
  if (utm) { try { sessionStorage.setItem(UTM_KEY, utm); } catch { /* nada */ } }
  const campaign = () => {
    let v = '';
    try { v = sessionStorage.getItem(UTM_KEY) || ''; } catch { /* nada */ }
    return (v || 'web').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120) || 'web';
  };

  // ---------- Aeropuertos y distancia ortodrómica ----------
  const AIRPORTS = new Map(AIRPORT_DATA.split(';').map((row) => {
    const [code, label, lat, lon, eu] = row.split('|');
    return [code, { code, label, lat: +lat, lon: +lon, eu: eu === '1' }];
  }));
  const list = document.createElement('datalist');
  list.id = 'airport-list';
  list.append(...[...AIRPORTS.values()].map((a) => {
    const o = document.createElement('option');
    o.value = `${a.code} · ${a.label}`;
    return o;
  }));
  document.body.append(list);

  const findAirport = (text) => {
    const t = (text || '').trim();
    const code = t.slice(0, 3).toUpperCase();
    if (/^[A-Z]{3}$/.test(code) && AIRPORTS.has(code) && (t.length === 3 || t[3] === ' ')) return AIRPORTS.get(code);
    const low = t.toLowerCase();
    if (low.length < 3) return null;
    const hits = [...AIRPORTS.values()].filter((a) => a.label.toLowerCase().includes(low));
    return hits.length === 1 ? hits[0] : null;
  };
  const distanceKm = (a, b) => {
    const r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  const bandFor = (km, bothEu) => {
    if (km <= 1500) return 'short';
    if (bothEu) return 'intra_eu_long';
    if (km <= 3500) return 'medium';
    return 'long';
  };

  const form = $('#evaluation-form');
  const setField = (name, value) => {
    const el = form.elements.namedItem(name);
    if (el && el.value !== value) { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  const routeInfo = $('#route-info');
  const updateRoute = () => {
    const a = findAirport(form.elements.namedItem('originAirport').value);
    const b = findAirport(form.elements.namedItem('destinationAirport').value);
    if (!a || !b) {
      routeInfo.textContent = 'Escribe la ciudad o el código (MAD, GRX…) y elige de la lista. Si tu aeropuerto no aparece, elige la distancia a mano.';
      routeInfo.dataset.state = '';
      return;
    }
    const km = distanceKm(a, b);
    const band = bandFor(km, a.eu && b.eu);
    setField('departureScope', a.eu ? 'eu' : 'outside');
    setField('arrivalScope', b.eu ? 'eu' : 'outside');
    setField('distanceBand', band);
    const label = form.elements.namedItem('distanceBand').selectedOptions[0]?.textContent || '';
    const near = [1500, 3500].some((t) => Math.abs(km - t) < 60);
    routeInfo.textContent = `${a.code} → ${b.code}: ${Math.round(km).toLocaleString('es-ES')} km en línea recta (método del Reglamento) · ${label}.`
      + (near ? ' Está cerca de un límite: confirma la distancia antes de reclamar.' : '');
    routeInfo.dataset.state = 'ok';
  };
  ['originAirport', 'destinationAirport'].forEach((n) => form.elements.namedItem(n).addEventListener('input', updateRoute));
  // Enlaces desde las páginas por aeropuerto: /?origen=AGP&destino=LHR
  [['origen', 'originAirport'], ['destino', 'destinationAirport']].forEach(([param, field]) => {
    const code = (params.get(param) || '').toUpperCase();
    const el = form.elements.namedItem(field);
    if (AIRPORTS.has(code) && !el.value) el.value = `${code} · ${AIRPORTS.get(code).label}`;
  });
  updateRoute();

  // ---------- Comparativa con un intermediario a comisión ----------
  const compare = $('#result-compare');
  const updateCompare = () => {
    const txt = ($('#result-amount').textContent || '').replace(/\./g, '').match(/(\d+(?:,\d+)?)/);
    const per = txt ? Number(txt[1].replace(',', '.')) : 0;
    const pax = Number(form.elements.namedItem('passengers').value) || 1;
    const total = per * pax;
    if (!total) { compare.hidden = true; return; }
    const broker = total * (1 - BROKER_RATE);
    const mine = total;
    compare.innerHTML = '';
    const h = document.createElement('p');
    h.className = 'compare-title';
    h.textContent = `Si la reclamación prospera (${eur(total)} en total):`;
    const row = (name, value, note, strong) => {
      const d = document.createElement('div');
      d.className = `compare-row${strong ? ' strong' : ''}`;
      const n = document.createElement('span'); n.textContent = name;
      const v = document.createElement('b'); v.textContent = eur(Math.round(value * 100) / 100);
      const s = document.createElement('small'); s.textContent = note;
      d.append(n, v, s);
      return d;
    };
    compare.append(
      h,
      row('Con un intermediario a comisión', broker, `te quitaría ${eur(Math.round(total * BROKER_RATE * 100) / 100)} (35 % IVA incl., tarifa habitual del sector)`),
      row('Con Reclámalo', mine, 'gratis y sin comisión: reclamas tú, y ante AESA también es gratis', true),
    );
    compare.hidden = false;
  };
  form.addEventListener('submit', () => setTimeout(updateCompare, 0));

  // ---------- Expediente gratis + aportación voluntaria ----------
  const openBtn = $('#open-premium');
  const premiumForm = $('#premium-form');
  const status = $('#premium-status');
  const prefillPremium = () => {
    const a = findAirport(form.elements.namedItem('originAirport').value);
    const b = findAirport(form.elements.namedItem('destinationAirport').value);
    const set = (n, v) => { const el = premiumForm.elements.namedItem(n); if (el && !el.value && v) el.value = v; };
    const place = (x) => {
      const [city, name] = x.label.split(' – ');
      return name && name.length <= 20 && !name.toLowerCase().includes(city.toLowerCase()) && !city.toLowerCase().includes(name.toLowerCase()) ? name : city;
    };
    if (a) set('origin', `${place(a)} (${a.code})`);
    if (b) set('destination', `${place(b)} (${b.code})`);
  };
  openBtn.addEventListener('click', prefillPremium);
  openBtn.addEventListener('click', () => {
    const st = $('#evaluation-result').dataset.status;
    const warn = $('#premium-warning');
    if (st === 'outside' || st === 'unlikely') {
      warn.textContent = st === 'outside'
        ? 'Con los datos de la evaluación, tu vuelo no parece cubierto por el Reglamento europeo. Puedes preparar igualmente la carta: no reclamará una cantidad, solo pedirá a la aerolínea una respuesta motivada. Si crees que algún dato está mal, vuelve a la evaluación y corrígelo.'
        : 'Con los datos de la evaluación no aparece compensación fija. Puedes preparar igualmente la carta: no reclamará una cantidad, solo pedirá a la aerolínea una respuesta motivada y el reembolso de gastos justificados, si los tuviste. Si algún dato está mal, vuelve a la evaluación y corrígelo.';
      warn.hidden = false;
    } else {
      warn.hidden = true;
    }
  });

  const donateOk = /^https:\/\//.test(DONATION_LINK);
  document.querySelectorAll('.donate-only').forEach((el) => { el.hidden = !donateOk; });
  if (donateOk) {
    document.querySelectorAll('a.donate-link').forEach((a) => {
      const url = new URL(DONATION_LINK);
      if (/^(buy|donate)\.stripe\.com$/.test(url.hostname)) url.searchParams.set('client_reference_id', `${campaign()}_${a.dataset.place || 'web'}`);
      a.href = url.toString();
    });
  }

  // ---------- Recordatorio de calendario (.ics) ----------
  $('#ics-reminder').addEventListener('click', () => {
    const p = Object.fromEntries(new FormData(premiumForm).entries());
    const d = new Date(); d.setDate(d.getDate() + 30);
    const ymd = (x) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`;
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const esc = (s) => String(s || '').replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, '\\n');
    const airline = p.airline?.trim() || 'la aerolínea';
    const flight = p.flightNumber?.trim() ? ` (vuelo ${p.flightNumber.trim()})` : '';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reclamalo//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@reclamalo`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(next)}`,
      `SUMMARY:${esc(`Reclámalo: ¿ha respondido ${airline}${flight}?`)}`,
      `DESCRIPTION:${esc(`Ha pasado un mes desde tu reclamación. Si ${airline} no ha respondido o la respuesta no te convence, presenta tu expediente ante AESA (gratis): ${AESA_URL}`)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Revisa tu reclamación aérea', 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'recordatorio-reclamacion-reclamalo.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `Recordatorio creado para el ${d.toLocaleDateString('es-ES')}. Ábrelo para añadirlo a tu calendario.`;
  });
})();
