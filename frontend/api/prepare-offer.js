import { deterministicOfferPack } from './_offer-pack.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { licitacion, perfil = {} } = req.body || {};
  if (!licitacion) return res.status(400).json({ error: 'Falta la licitación' });
  return res.status(200).json(deterministicOfferPack(licitacion, perfil));
}
