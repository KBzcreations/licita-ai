# Reclámalo

Herramienta web gratuita para comprobar si un retraso, una cancelación o una denegación de embarque dan derecho a compensación según el Reglamento (CE) 261/2004, y preparar la reclamación a la aerolínea y, si hace falta, ante AESA. Todo se procesa en el navegador: no hay servidor de datos ni cuentas.

Se publica en Vercel desde la carpeta `frontend/` (rama `master` → producción; ramas y PR → vista previa).

## Estructura

| Ruta | Qué es |
| --- | --- |
| `frontend/index.html` | Portada con el evaluador, el expediente, AESA y preguntas frecuentes |
| `frontend/reclamalo-core.mjs` | Motor de reglas (importes, umbrales, exclusiones) y carta de reclamación |
| `frontend/reclamalo-app.js` | Interfaz del evaluador y del expediente |
| `frontend/reclamalo-extras.js` | Aeropuertos y distancia, comparativa, recordatorio `.ics`, aportaciones voluntarias (Stripe) |
| `frontend/reclamalo-airports.js` | Aeropuertos con vuelos regulares (OurAirports) |
| `frontend/scripts/` | Generador de páginas por aeropuerto y aerolínea, sitemap y dominio (`site.mjs`) |
| `frontend/public/` | Páginas estáticas: aeropuertos, aerolíneas, aviso legal, privacidad, 404 |
| `frontend/vercel.json` | Rutas: 410 para direcciones antiguas de Licita/MapScore y 404 real |

## Comandos (dentro de `frontend/`)

```bash
npm install
npm run dev     # desarrollo local
npm test        # pruebas del motor y de la carta
npm run lint
npm run pages   # regenera páginas, sitemap y enlaces internos (tras cambiar SITE o los listados)
npm run build
```

## Cambiar de dominio

1. Edita `SITE` en `frontend/scripts/site.mjs`.
2. Ejecuta `npm run pages` (actualiza canónicas, sitemap, robots y vista previa al compartir).
3. Añade el dominio en Vercel y redirige el anterior.

El código de Licita AI y MapScore está archivado en las ramas `archive/licita-before-reclamalo-2026-11-11` y `archive/licita-mapscore-2026-11-26`.
