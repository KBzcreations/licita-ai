// Registra eventos de uso (pageviews, registro, login, suscripcion) usando
// la service key en el servidor, evitando depender de permisos RLS para
// el cliente anonimo.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(500).json({ error: "Supabase no configurado" });
    return;
  }

  const { tipo, pagina, user_id, session_id, metadata } = req.body || {};
  if (!tipo) {
    res.status(400).json({ error: "Falta tipo" });
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/eventos`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ tipo, pagina, user_id: user_id || null, session_id, metadata: metadata || null }),
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
