// Proxy server-side a Gemini para el analisis de encaje empresa-licitacion.
// La API key vive solo aqui (variable de entorno GEMINI_API_KEY en Netlify),
// nunca se envia al navegador.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY no configurada" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON invalido" }) };
  }

  const { licitacion, perfil } = payload;
  if (!licitacion || !perfil) {
    return { statusCode: 400, body: JSON.stringify({ error: "Faltan licitacion o perfil" }) };
  }

  const prompt = `Eres analista senior en licitaciones publicas tecnologicas. Analiza el encaje empresa-licitacion. Responde SOLO JSON sin backticks.

LICITACION: ${licitacion.titulo} | ${licitacion.organismo} | ${licitacion.presupuesto || "?"}EUR | Techs: ${(licitacion.tecnologias || []).join(",")}
RESUMEN: ${licitacion.resumen_comercial}
EMPRESA: ${perfil.empresa || "empresa tech"} | Stack: ${(perfil.tecnologias_interes || []).join(",")}

JSON: {"puntuacion":85,"nivel":"Alto","recomendacion":"texto","fortalezas":["f1","f2"],"debilidades":["d1"],"acciones":["a1","a2","a3"]}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      }
    );

    const raw = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: "Error de Gemini", detalle: raw }) };
    }

    const texto = raw.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) {
      return { statusCode: 502, body: JSON.stringify({ error: "Respuesta de Gemini invalida" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: texto,
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
