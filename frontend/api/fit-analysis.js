import { deterministicDecision, mergeAiAdvice } from "./_decision-engine.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { licitacion, perfil } = req.body || {};
  if (!licitacion || !perfil) return res.status(400).json({ error: "Faltan licitacion o perfil" });

  const base = deterministicDecision(licitacion, perfil);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(200).json(base);
  const prompt = `Actuas como apoyo de un motor determinista de decision de licitaciones. No puedes cambiar el veredicto, puntuacion, evidencias, bloqueos ni datos desconocidos. Explica brevemente el resultado y formula preguntas concretas para resolver incognitas. No inventes requisitos del pliego. Responde SOLO JSON: {"explanation":"...","questions":["..."]}.

RESULTADO DETERMINISTA: ${JSON.stringify(base)}
LICITACION: ${JSON.stringify(licitacion)}
PERFIL: ${JSON.stringify(perfil)}`;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, temperature: 0.1 }),
    });
    if (!response.ok) return res.status(200).json(base);
    const raw = await response.json();
    const content = raw.choices?.[0]?.message?.content;
    return res.status(200).json(mergeAiAdvice(base, content ? JSON.parse(content) : null));
  } catch {
    return res.status(200).json(base);
  }
}
