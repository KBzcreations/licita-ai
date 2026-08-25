import crypto from 'crypto';

const recipients = [
  {name: 'APYMESPA', email: 'info@apymespa.org'},
  {name: 'FREMM', email: 'fremm@fremm.es'},
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function emailHtml(name) {
  return `<div style="font-family:Arial,sans-serif;max-width:640px;color:#172033;line-height:1.55">
    <p>Hola, equipo de ${escapeHtml(name)}:</p>
    <p>Hemos creado <strong>Licita AI</strong>, una herramienta que analiza PCAP y PPT de licitaciones, localiza solvencia, garantías, documentación y riesgos, e indica la página exacta de cada hallazgo.</p>
    <p>Queremos ofrecer una <strong>prueba gratuita, sin compromiso ni suscripción</strong>, con expedientes reales a cinco empresas asociadas para medir cuánto tiempo les ahorra y recoger su valoración.</p>
    <p>Pueden probarla en <a href="https://www.licita-ai.com/">licita-ai.com</a>.</p>
    <p>Si encaja con sus asociados, coordinamos el piloto por este mismo correo.</p>
    <p>Un saludo,<br><strong>Equipo Licita AI</strong></p>
  </div>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method Not Allowed'});
  if (!process.env.RESEND_API_KEY) return res.status(500).json({error: 'Email no configurado'});

  const results = [];
  for (const recipient of recipients) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.createHash('sha256').update(`pilot-2026-08-25|${recipient.email}`).digest('hex'),
      },
      body: JSON.stringify({
        from: 'Licita AI <hola@licita-ai.com>',
        reply_to: 'hola@licita-ai.com',
        to: [recipient.email],
        subject: 'Piloto gratuito de Licita AI para empresas asociadas',
        html: emailHtml(recipient.name),
      }),
    });
    const body = await response.json().catch(() => ({}));
    results.push({name: recipient.name, email: recipient.email, ok: response.ok, id: body.id || null, error: response.ok ? null : body});
  }

  const ok = results.every(result => result.ok && result.id);
  return res.status(ok ? 200 : 502).json({ok, results});
}
