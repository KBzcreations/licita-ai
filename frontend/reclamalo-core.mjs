export const LEGAL_VERSION = '2026-11-11';

export const OFFICIAL_SOURCES = Object.freeze({
  regulation: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32004R0261',
  guidance: 'https://www.boe.es/buscar/doc.php?id=DOUE-Z-2024-70053',
  euRights: 'https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_es.htm',
  aesaStart: 'https://www.seguridadaerea.gob.es/es/ambitos/derechos-de-los-pasajeros/inicia-tu-reclamacion-con-aesa',
  aesaFaq: 'https://www.seguridadaerea.gob.es/es/preguntas-frecuentes-derechos-pasajeros',
  futureRules: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32026R2202',
});

const DISTANCE = Object.freeze({
  short: { amount: 250, label: 'Hasta 1.500 km', reductionHours: 2 },
  medium: { amount: 400, label: 'Entre 1.500 y 3.500 km', reductionHours: 3 },
  intra_eu_long: { amount: 400, label: 'Más de 1.500 km dentro de la UE', reductionHours: 3 },
  long: { amount: 600, label: 'Más de 3.500 km fuera de la UE', reductionHours: 4 },
});

const clampPassengers = (value) => Math.min(9, Math.max(1, Number(value) || 1));
const asNumber = (value) => value === '' || value == null ? null : Number(value);

export function isCovered(input) {
  if (input.departureScope === 'eu') return { covered: true, reason: 'El itinerario parte de un aeropuerto de la UE/EEE/Suiza.' };
  if (input.departureScope === 'outside' && input.arrivalScope === 'eu' && input.euOperatingCarrier === 'yes') {
    if (input.thirdCountryBenefits !== 'no') {
      return { covered: null, reason: 'Hay que comprobar si ya recibiste en el país de salida beneficios, compensación y asistencia equivalentes, porque puede afectar al ámbito europeo.' };
    }
    return { covered: true, reason: 'El vuelo llega a la UE/EEE/Suiza desde un tercer país y lo opera una compañía de la UE.' };
  }
  if (input.departureScope === 'outside' && input.arrivalScope === 'eu' && input.euOperatingCarrier === 'unknown') {
    return { covered: null, reason: 'Hay que confirmar si la compañía que opera el vuelo es una compañía de la UE.' };
  }
  return { covered: false, reason: 'Con los datos indicados, el Reglamento (CE) 261/2004 no parece aplicable.' };
}

function cancellationEligibility(input) {
  const notice = asNumber(input.noticeDays);
  if (notice == null) return { eligible: null, reason: 'Falta saber con cuánta antelación se comunicó la cancelación.' };
  if (notice >= 14) return { eligible: false, reason: 'La cancelación se comunicó con al menos 14 días de antelación.' };

  if (input.rerouted === 'yes') {
    const early = asNumber(input.rerouteDepartureEarlyMinutes);
    const late = asNumber(input.arrivalDelayMinutes);
    if (early == null || late == null) return { eligible: null, reason: 'Faltan los horarios del transporte alternativo.' };
    if (notice >= 7 && early <= 120 && late < 240) {
      return { eligible: false, reason: 'Entre 7 y 14 días de aviso, el transporte alternativo entra en los márgenes legales que excluyen compensación.' };
    }
    if (notice < 7 && early <= 60 && late < 120) {
      return { eligible: false, reason: 'Con menos de 7 días de aviso, el transporte alternativo entra en los márgenes legales que excluyen compensación.' };
    }
  }
  return { eligible: true, reason: 'La antelación y, en su caso, el transporte alternativo no encajan en una exclusión automática.' };
}

function delayEligibility(input, band) {
  const minutes = asNumber(input.arrivalDelayMinutes);
  if (minutes == null) return { eligible: null, reason: 'Falta el retraso real de llegada al destino final.' };
  if (minutes < 180) return { eligible: false, reason: 'El retraso de llegada indicado es inferior a 3 horas.' };
  if (band === 'long' && minutes < 240) {
    return { eligible: true, reason: 'Retraso de 3 a 4 horas en un trayecto de más de 3.500 km: la referencia actual es 300 € por pasajero.', amountOverride: 300 };
  }
  return { eligible: true, reason: 'El retraso de llegada al destino final es de 3 horas o más.' };
}

function deniedEligibility(input) {
  if (input.voluntaryDenied === 'yes') return { eligible: false, reason: 'La renuncia voluntaria a la plaza no da derecho automático a la compensación fija.' };
  if (input.deniedReason === 'health_security_documents') return { eligible: false, reason: 'La denegación por motivos razonables de salud, seguridad o documentación queda fuera de la compensación automática.' };
  if (!input.deniedReason) return { eligible: null, reason: 'Falta confirmar el motivo de la denegación de embarque.' };
  return { eligible: true, reason: 'La denegación involuntaria por sobreventa o razones operativas puede generar compensación.' };
}

function applyReroutingReduction(input, amount, distance) {
  if (input.rerouted !== 'yes') return { amount, reduced: false };
  const late = asNumber(input.arrivalDelayMinutes);
  if (late == null) return { amount, reduced: false, unresolved: true };
  if (late <= distance.reductionHours * 60) return { amount: amount / 2, reduced: true };
  return { amount, reduced: false };
}

export function evaluateCase(rawInput = {}) {
  const input = { ...rawInput, passengers: clampPassengers(rawInput.passengers) };
  if (input.flightDate && input.flightDate >= '2027-10-23') {
    return {
      status: 'review', headline: 'Este vuelo usa reglas futuras', amountPerPassenger: 0, totalAmount: 0,
      passengers: input.passengers,
      checks: [{ ok: null, label: 'Fecha del vuelo', detail: 'El Reglamento (UE) 2026/2202 será aplicable desde el 23/10/2027. Esta versión no calcula todavía esas reglas futuras.' }],
      reasons: ['Se requiere actualizar el motor a las reglas aplicables desde el 23/10/2027.'], legalVersion: LEGAL_VERSION,
    };
  }
  const coverage = isCovered(input);
  const distance = DISTANCE[input.distanceBand] || DISTANCE.short;
  const checks = [];
  let status = 'review';
  let headline = 'Necesita revisión';
  let eligibility = { eligible: null, reason: 'Faltan datos esenciales.' };

  checks.push({ ok: coverage.covered, label: 'Ámbito europeo', detail: coverage.reason });
  if (coverage.covered === false) {
    return {
      status: 'outside', headline: 'Fuera del ámbito probable', amountPerPassenger: 0, totalAmount: 0,
      passengers: input.passengers, checks, reasons: [coverage.reason], legalVersion: LEGAL_VERSION,
    };
  }

  if (input.incident === 'delay') eligibility = delayEligibility(input, input.distanceBand);
  if (input.incident === 'cancellation') eligibility = cancellationEligibility(input);
  if (input.incident === 'denied') eligibility = deniedEligibility(input);
  checks.push({ ok: eligibility.eligible, label: 'Tipo de incidencia', detail: eligibility.reason });

  if (eligibility.eligible === false) {
    status = 'unlikely';
    headline = 'No aparece compensación fija';
  } else if (eligibility.eligible === true) {
    status = 'likely';
    headline = 'Posible compensación';
  }

  let amount = eligibility.amountOverride ?? distance.amount;
  const rerouting = applyReroutingReduction(input, amount, distance);
  amount = rerouting.amount;
  if (rerouting.reduced) checks.push({ ok: true, label: 'Transporte alternativo', detail: 'La llegada entra en el margen que permite reducir la compensación un 50 %.' });
  if (rerouting.unresolved) {
    status = 'review';
    headline = 'Necesita horarios exactos';
    checks.push({ ok: null, label: 'Transporte alternativo', detail: 'Falta la hora real de llegada para comprobar una posible reducción del 50 %.' });
  }

  if (input.extraordinary === 'yes') {
    status = 'review';
    headline = 'La causa necesita prueba';
    checks.push({ ok: null, label: 'Circunstancias extraordinarias', detail: 'La aerolínea debe probar la causa, su relación con la incidencia y que tomó todas las medidas razonables.' });
  } else if (input.extraordinary === 'unknown') {
    status = 'review';
    headline = 'La causa necesita revisión';
    checks.push({ ok: null, label: 'Causa de la incidencia', detail: 'No des por válida una exclusión sin una explicación y pruebas de la compañía.' });
  } else if (input.extraordinary === 'no') {
    checks.push({ ok: true, label: 'Causa comunicada', detail: 'No consta una circunstancia extraordinaria; la compañía puede alegarla y debe probarla.' });
  }

  if (input.hasConnections === 'yes' && input.singleBooking !== 'yes') {
    status = 'review';
    headline = 'Hay que revisar las reservas';
    checks.push({ ok: null, label: 'Conexiones', detail: 'Los trayectos en reservas separadas no se valoran igual que un único contrato hasta destino final.' });
  }

  if (coverage.covered == null || eligibility.eligible == null) {
    status = 'review';
    headline = 'Faltan datos para concluir';
  }

  if (status === 'unlikely' || status === 'outside') amount = 0;
  return {
    status,
    headline,
    amountPerPassenger: amount,
    totalAmount: amount * input.passengers,
    passengers: input.passengers,
    distanceLabel: distance.label,
    reduced: rerouting.reduced,
    checks,
    reasons: checks.map((item) => item.detail),
    legalVersion: LEGAL_VERSION,
  };
}

export function buildClaimText(input, result) {
  const claimant = input.claimantName?.trim() || '[Nombre y apellidos]';
  const airline = input.airline?.trim() || '[Compañía aérea operadora]';
  const flight = input.flightNumber?.trim() || '[Número de vuelo]';
  const route = [input.origin?.trim(), input.destination?.trim()].filter(Boolean).join('–') || '[Origen–destino]';
  const booking = input.bookingReference?.trim() || '[Localizador]';
  const date = input.flightDate || '[Fecha del vuelo]';
  const incidentLabel = { delay: 'gran retraso', cancellation: 'cancelación', denied: 'denegación de embarque' }[input.incident] || 'incidencia';
  const amountRequest = result.totalAmount > 0
    ? `Solicito el abono de ${result.totalAmount.toLocaleString('es-ES')} € (${result.amountPerPassenger.toLocaleString('es-ES')} € por pasajero, ${result.passengers} pasajero${result.passengers === 1 ? '' : 's'}), sujeto a la comprobación de los hechos y de cualquier causa de exoneración debidamente acreditada.`
    : 'Solicito una respuesta motivada sobre mis derechos, junto con la documentación que justifique cualquier causa de exclusión alegada.';
  const expenses = Number(input.expenses) > 0
    ? ` En particular, solicito ${Number(input.expenses).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € de gastos acreditados.`
    : '';

  return `${claimant}\n\nA la atención del Servicio de Atención al Cliente de ${airline}\n\nASUNTO: Reclamación por ${incidentLabel} — vuelo ${flight}, ${route}, ${date}\nLOCALIZADOR: ${booking}\n\nEXPONGO\n\nQue tenía una reserva confirmada para el vuelo indicado y sufrí una incidencia de ${incidentLabel}. ${input.facts?.trim() || '[Describe aquí de forma breve lo ocurrido, los horarios reales y la asistencia recibida.]'}\n\nLa reclamación se formula frente a la compañía que operó el vuelo, al amparo del Reglamento (CE) n.º 261/2004 y de su interpretación vigente. ${result.checks.map((item) => item.detail).join(' ')}\n\nSOLICITO\n\n1. ${amountRequest}\n2. El reembolso de los gastos de asistencia necesarios, razonables y acreditados que la compañía no proporcionó, si procede.${expenses}\n3. Una respuesta escrita y motivada. Si se alegan circunstancias extraordinarias, solicito que se identifique la causa concreta, su relación con este vuelo y las medidas razonables adoptadas.\n\nAdjunto copia de la reserva o tarjeta de embarque y los justificantes disponibles. Conservo el comprobante de presentación de esta reclamación.\n\nAtentamente,\n\n${claimant}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n---\nDocumento generado localmente por Reclámalo. Borrador informativo: revisa los datos antes de enviarlo. Versión jurídica ${LEGAL_VERSION}.`;
}

export function getAesaChecklist(input = {}) {
  return [
    'Copia de la reclamación previa enviada a la compañía y justificante de presentación.',
    'Respuesta de la compañía, si la hubo; si no responde, espera un mes desde la reclamación previa.',
    input.hasConnections === 'yes' ? 'Reserva completa de todos los vuelos de conexión.' : 'Billete, contrato de transporte o tarjeta de embarque.',
    'Documento identificativo vigente, por ambas caras cuando corresponda, de cada pasajero reclamante.',
    'Poder o acreditación de representación, si reclama otra persona.',
    'Facturas o recibos de gastos necesarios y razonables cuya devolución se solicite.',
  ];
}
