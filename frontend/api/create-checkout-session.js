// Crea una sesion de Stripe Checkout para suscribirse a Pro/Enterprise.
// La clave secreta de Stripe vive solo aqui, nunca llega al navegador.

const PRICE_IDS = {
  pro: "price_1TP8RZDwJ53fjQyspnaGGQS6",
  enterprise: "price_1TP8S3DwJ53fjQysLUpFsKAC",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    res.status(500).json({ error: "STRIPE_SECRET_KEY no configurada" });
    return;
  }

  const { plan, email, userId } = req.body || {};
  const priceId = PRICE_IDS[plan];
  if (!priceId || !email || !userId) {
    res.status(400).json({ error: "Faltan plan, email o userId" });
    return;
  }

  const origin = `https://${req.headers.host}`;

  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append("customer_email", email);
  params.append("client_reference_id", userId);
  params.append("success_url", `${origin}/?suscripcion=ok`);
  params.append("cancel_url", `${origin}/?suscripcion=cancelada`);
  params.append("metadata[user_id]", userId);
  params.append("metadata[plan]", plan);
  params.append("subscription_data[metadata][user_id]", userId);
  params.append("subscription_data[metadata][plan]", plan);

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: "Error de Stripe", detalle: session });
      return;
    }

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
