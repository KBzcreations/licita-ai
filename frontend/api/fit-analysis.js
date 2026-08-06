// Funcion serverless de Vercel (Node). La API key de Groq vive solo
// aqui, en la variable de entorno del proyecto, nunca llega al navegador.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    res.status(500).json({ error: "GROQ_API_KEY no configurada" });
    return;
  }

  const { licitacion, perfil } = req.body || {};
  if (!licitacion || !perfil) {
    res.status(400).json({ error: "Faltan licitacion o perfil" });
    return;
  }

  const prompt = `Eres analista senior en licitaciones publicas tecnologicas. Analiza el encaje empresa-licitacion. Responde SOLO JSON sin backticks.

LICITACION: ${licitacion.titulo} | ${licitacion.organismo} | ${licitacion.presupuesto || "?"}EUR | Techs: ${(licitacion.tecnologias || []).join(",")}
RESUMEN: ${licitacion.resumen_comercial}
EMPRESA: ${perfil.empresa || "empresa tech"} | Stack: ${(perfil.tecnologias_interes || []).join(",")}

JSON: {"puntuacion":85,"nivel":"Alto","recomendacion":"texto","fortalezas":["f1","f2"],"debilidades":["d1"],"acciones":["a1","a2","a3"]}`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    const raw = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: "Error de Groq", detalle: raw });
      return;
    }

    const texto = raw.choices?.[0]?.message?.content;
    if (!texto) {
      res.status(502).json({ error: "Respuesta de Groq invalida" });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(texto);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
