import { buildClaimText, evaluateCase, getAesaChecklist } from './reclamalo-core.mjs';

const evaluationForm = document.querySelector('#evaluation-form');
const premiumForm = document.querySelector('#premium-form');
const resultPanel = document.querySelector('#evaluation-result');
const workspace = document.querySelector('#premium-workspace');
const output = document.querySelector('#document-output');
const storageKey = 'reclamalo-draft-v1';
let currentInput = null;
let currentResult = null;
let currentLetter = '';

const valuesOf = (form) => Object.fromEntries(new FormData(form).entries());
const setVisible = (selector, visible) => document.querySelectorAll(selector).forEach((node) => { node.hidden = !visible; });
const money = (value) => `${Number(value).toLocaleString('es-ES')} €`;

function updateConditionalFields() {
  const input = valuesOf(evaluationForm);
  const incident = input.incident;
  setVisible('.cancellation-field', incident === 'cancellation');
  setVisible('.denied-field', incident === 'denied');
  setVisible('.reroute-field', input.rerouted === 'yes');
  setVisible('.delay-field', incident === 'delay' || input.rerouted === 'yes');
  setVisible('.connection-field', input.hasConnections === 'yes');
  setVisible('.third-country-field', input.departureScope === 'outside');
}

function renderResult(result) {
  const headline = document.querySelector('#result-headline');
  const amount = document.querySelector('#result-amount');
  const amountLabel = document.querySelector('#result-amount-label');
  const checks = document.querySelector('#result-checks');
  headline.textContent = result.headline;
  resultPanel.dataset.status = result.status;

  if (result.status === 'outside' || result.status === 'unlikely') {
    amount.textContent = '—';
    amountLabel.textContent = 'sin compensación fija identificada';
  } else {
    amount.textContent = result.status === 'review' ? `hasta ${money(result.amountPerPassenger)}` : money(result.amountPerPassenger);
    amountLabel.textContent = result.passengers > 1 ? `${money(result.totalAmount)} en total orientativo` : 'por pasajero';
  }

  checks.replaceChildren(...result.checks.map((item) => {
    const row = document.createElement('div');
    row.className = 'check-row';
    const icon = document.createElement('i');
    icon.textContent = item.ok === true ? '✓' : item.ok === false ? '×' : '?';
    const label = document.createElement('b');
    label.textContent = item.label;
    const detail = document.createElement('span');
    detail.textContent = item.detail;
    row.append(icon, label, detail);
    return row;
  }));
  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

evaluationForm.addEventListener('change', updateConditionalFields);
evaluationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!evaluationForm.reportValidity()) return;
  currentInput = valuesOf(evaluationForm);
  currentResult = evaluateCase(currentInput);
  renderResult(currentResult);
});

document.querySelector('#edit-case').addEventListener('click', () => {
  evaluationForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  evaluationForm.querySelector('input,select')?.focus({ preventScroll: true });
});

document.querySelector('#open-premium').addEventListener('click', () => {
  const evaluationDate = evaluationForm.elements.namedItem('flightDate')?.value;
  if (evaluationDate && !premiumForm.elements.namedItem('flightDate')?.value) premiumForm.elements.namedItem('flightDate').value = evaluationDate;
  workspace.hidden = false;
  workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  premiumForm.querySelector('input')?.focus({ preventScroll: true });
});

function ensureEvaluation() {
  currentInput ||= valuesOf(evaluationForm);
  currentResult ||= evaluateCase(currentInput);
}

function renderPack(input, result) {
  currentLetter = buildClaimText(input, result);
  document.querySelector('#claim-letter').textContent = currentLetter;
  document.querySelector('#document-list').replaceChildren(...getAesaChecklist(input).map((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
  output.hidden = false;
  output.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

premiumForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!premiumForm.reportValidity()) {
    document.querySelector('#premium-status').textContent = 'Revisa los campos señalados antes de generar el expediente.';
    return;
  }
  ensureEvaluation();
  const input = { ...currentInput, ...valuesOf(premiumForm) };
  renderPack(input, currentResult);
  document.querySelector('#premium-status').textContent = 'Expediente generado en este dispositivo. No se ha enviado ningún dato.';
});

document.querySelector('#copy-letter').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentLetter);
    document.querySelector('#premium-status').textContent = 'Carta copiada al portapapeles.';
  } catch {
    document.querySelector('#premium-status').textContent = 'No se pudo copiar automáticamente; selecciona el texto de la carta.';
  }
});

document.querySelector('#download-letter').addEventListener('click', () => {
  const blob = new Blob([currentLetter], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'reclamacion-aerolinea-reclamalo.txt';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.querySelector('#print-pack').addEventListener('click', () => window.print());

function fillForm(form, values = {}) {
  for (const [name, value] of Object.entries(values)) {
    const fields = form.elements.namedItem(name);
    if (!fields) continue;
    if (fields instanceof RadioNodeList) {
      [...fields].forEach((field) => { field.checked = field.value === value; });
    } else if (fields.type === 'checkbox') {
      fields.checked = Boolean(value);
    } else {
      fields.value = value;
    }
  }
}

document.querySelector('#save-local').addEventListener('click', () => {
  const draft = { evaluation: valuesOf(evaluationForm), premium: valuesOf(premiumForm), savedAt: new Date().toISOString() };
  localStorage.setItem(storageKey, JSON.stringify(draft));
  document.querySelector('#premium-status').textContent = 'Borrador guardado solo en este navegador.';
});

document.querySelector('#clear-local').addEventListener('click', () => {
  localStorage.removeItem(storageKey);
  premiumForm.reset();
  output.hidden = true;
  currentLetter = '';
  document.querySelector('#premium-status').textContent = 'Datos locales borrados.';
});

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved) {
    fillForm(evaluationForm, saved.evaluation);
    fillForm(premiumForm, saved.premium);
    document.querySelector('#premium-status').textContent = 'Hay un borrador guardado en este navegador.';
  }
} catch {
  localStorage.removeItem(storageKey);
}

updateConditionalFields();
