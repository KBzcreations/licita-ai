# Transformación de LICITA a Reclámalo

Fecha: 11 de noviembre de 2026.

## Conservación de LICITA

El estado previo de LICITA corresponde al commit `67efc2b` de `master`. Antes de iniciar la transformación se creó la referencia local `archive/licita-before-reclamalo-2026-11-11`. La nueva aplicación se desarrolla en `reclamalo/premium-2026-11-11`, por lo que el producto anterior sigue recuperable desde Git.

## Alcance implementado

- Evaluador gratuito para retraso, cancelación y denegación de embarque.
- Comprobación de ámbito territorial, compañía operadora, distancia, antelación, transporte alternativo, retraso final, conexiones y circunstancias extraordinarias.
- Resultado prudente: posible compensación, no identificada, fuera de ámbito o requiere revisión.
- Importes de 250/400/600 euros, reducción del 50 % y tramo de 300 euros en el caso aplicable.
- Bloqueo de cálculos para vuelos desde el 23/10/2027 hasta incorporar las reglas nuevas.
- Premium de 4,99 euros como pago único, presentado en modo de validación sin cobro.
- Carta personalizada, checklist documental, instrucciones AESA, copia, descarga de texto e impresión/PDF.
- Procesamiento local y borrador opcional en el navegador.
- Checkout bloqueado de forma incondicional y webhook bloqueado sin autorización específica.

## Fuentes oficiales verificadas

- Reglamento (CE) 261/2004: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32004R0261
- Directrices interpretativas de 2024: https://www.boe.es/buscar/doc.php?id=DOUE-Z-2024-70053
- Derechos de pasajeros de la UE: https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_es.htm
- Inicio de reclamación ante AESA: https://www.seguridadaerea.gob.es/es/ambitos/derechos-de-los-pasajeros/inicia-tu-reclamacion-con-aesa
- FAQ de AESA: https://www.seguridadaerea.gob.es/es/preguntas-frecuentes-derechos-pasajeros
- Reglamento (UE) 2026/2202, aplicable desde 23/10/2027: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32026R2202

## Límites deliberados

- No se evalúan equipaje, daños y perjuicios ni cláusulas del contrato.
- Una alegación de circunstancias extraordinarias nunca se acepta automáticamente: se marca para revisión porque la compañía debe probar causa, relación y medidas razonables.
- Las conexiones en reservas separadas se marcan para revisión.
- No se promete un resultado ante la aerolínea o AESA.
- Antes de activar pagos faltan identidad del prestador, condiciones de contratación, política final de privacidad, configuración de precio y autorización expresa.

## Pruebas

Los tests unitarios cubren importes, umbrales de cancelación, reducciones, ámbito territorial, conexiones, reglas futuras, carta, checklist y bloqueo de pagos. La compilación de producción debe completarse con `npm run build`; el conjunto completo se ejecuta con `npm test`.

## Limitación de los archivos de entrada

Los archivos indicados como `/mnt/data/reclamalo(1).zip` y `/mnt/data/Reclámalo.html` no estaban disponibles en esta tarea, en `sources/` ni como adjuntos recuperables de la conversación referenciada. Por ello se reconstruyó Reclámalo sobre la infraestructura existente del repositorio, sin modificar el material sincronizado de `sources/`.
