# Reclámalo

Aplicación web local-first para evaluar retrasos, cancelaciones y denegaciones de embarque conforme a las reglas europeas aplicables en España, y preparar un expediente de reclamación.

## Desarrollo

```bash
npm ci
npm test
npm run build
npm run dev
```

En Vercel, el directorio raíz del proyecto es `frontend`, el comando de compilación es `npm run build` y la salida es `dist`.

## Privacidad y pagos

- La evaluación, los datos personales y la generación de la carta ocurren en el navegador.
- Solo se usa `localStorage` cuando la persona pulsa expresamente «Guardar borrador».
- El frontend no llama a servicios de analítica, cuentas o pago.
- `/api/create-checkout-session` devuelve siempre `503 PAYMENTS_DISABLED`.
- El webhook también queda bloqueado salvo la variable específica `RECLAMALO_PAYMENTS_AUTHORIZED=true`; esa variable no debe configurarse sin autorización expresa y revisión comercial/legal.

## Versión jurídica

Reglas vigentes comprobadas a 11/11/2026. El motor no evalúa vuelos desde el 23/10/2027, fecha desde la que serán aplicables los cambios del Reglamento (UE) 2026/2202.

Fuentes principales: Reglamento (CE) 261/2004, directrices interpretativas de la Comisión de 2024, portal oficial de derechos de pasajeros de la UE y procedimiento/FAQ de AESA. Los enlaces están visibles en la aplicación.
