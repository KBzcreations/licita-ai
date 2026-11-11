// Bloqueo deliberado: Reclámalo no puede crear cobros hasta una autorización expresa.
// La activación futura requiere una revisión separada de precio, identidad del prestador,
// condiciones de contratación, privacidad y configuración de la pasarela.
export default function handler(_req, res) {
  res.status(503).json({
    code: 'PAYMENTS_DISABLED',
    error: 'Los pagos reales de Reclámalo no están habilitados.',
  });
}
