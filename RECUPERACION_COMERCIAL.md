# Lícita AI: recuperación del producto y prueba comercial

Fecha: 5 de octubre de 2026. Base revisada: b39bfd8.

## Decisión

Conservar dominio y código; cambiar de promesa y de foco. La hipótesis es una mesa de preparación documental para pymes y asesorías que ya manejan pliegos. No depender de familiares, contactos, venta telefónica ni nuevas compras. No afirmar que hay un negocio rentable: aún no hay evidencia de ventas ni acceso a métricas de conversión en esta revisión.

No merece la pena construir ahora un buscador generalista o cambiar a un sector ajeno por aprovechar el dominio. La diferenciación por «IA que resume pliegos» es débil: las webs de LICAI, Pliggo, LicitaIA y Licitados anuncian funciones similares. Son ofertas publicadas, no prueba de sus ventas ni de que nuestros clientes pagarían.

Fuentes públicas consultadas: https://licai.es/ ; https://pliggo.es/ ; https://licitaia.org/ ; https://licitados.com/analisis-de-pliegos .

## Hechos encontrados

- El lector de PDFs actual utiliza reglas de palabras clave; no una interpretación integral mediante un modelo de IA.
- El dossier contiene checklist e índice orientativos, no una oferta lista para presentar.
- La promoción gratuita anterior solo estaba activa en /prueba-gratis, aunque su texto aparecía en el HTML de la portada. No era una oferta global.
- La portada en navegador mostró cero oportunidades activas. Sin acceso al pipeline no podemos afirmar por qué.
- La función de cobro depende de PAYMENTS_ENABLED. No se ha comprobado su valor real ni realizado ningún cargo.
- Las rutas de alertas fueron eliminadas del repositorio y el formulario está oculto; no se reactivan sin una integración completa.
- El código de tracking devolvía éxito incluso si la base de datos rechazaba el evento.
- Un PDF sin texto podía producir un resultado aparentemente correcto; las advertencias de lectura parcial no se presentaban suficientemente en la descarga.

## Cambios preparados

1. Portada centrada en preparar y revisar documentación; descripción explícita de las limitaciones de la beta.
2. Dossier de trabajo gratuito en toda la beta, sin fingir compra o reserva.
3. Matriz CSV con pendientes, referencias, responsable y fecha interna.
4. Rechazo de PDF sin texto; advertencias de 80 páginas y límite de pasajes; límite de archivo de 3 MB para limitar también la petición codificada.
5. Regeneración del dossier al sustituir un PDF en la ficha, evitando descargar análisis anteriores.
6. La captura de interés comercial solo confirma éxito si el servidor guarda el evento.
7. Precio de 49 € presentado como hipótesis de servicio profesional, no como servicio listo ni popularidad demostrada.
8. Ejemplo y páginas informativas coherentes con la beta.

No se han enviado correos, comprado servicios, activado cobros ni publicado estos cambios.

## Experimento propuesto, sin presupuesto nuevo

Precio de referencia: 49 € por expediente profesional, sujeto a validar alcance, impuestos, coste y calidad. La beta gratuita no justifica por sí sola cobrar ese importe.

- Entrada: página de análisis de pliegos y checklist existentes, enlaces con UTM; solicitud de indexación solo cuando haya acceso a Search Console. No se infiere ausencia de indexación por una búsqueda sin resultados.
- Activación: PDF válido → lectura → dossier o matriz descargados.
- Evidencia de demanda: pregunta explícita de interés por 49 €, con necesidad seleccionada y alternativa «no pagaría». No confundir clics anónimos con clientes, reservas o facturación.
- Captación externa: preparar colaboraciones con comunidades de contratación y asesorías; publicar o contactar únicamente con autorización concreta y respetando las normas del destino. SEO solo puede tardar y no garantiza tráfico.
- Primer punto de revisión propuesto: 100 sesiones relevantes y al menos 20 lecturas correctas. Si no llegan visitas, no hay evidencia para descartar el producto: falla o falta distribución.
- Si hay uso pero ninguna señal de valor, detener ampliaciones y revisar propuesta. Tres expresiones de interés de empresas distintas permitirían explorar un piloto, pero no demostrarían rentabilidad.
- Solo activar una oferta de pago tras validar entregable contra pliegos reales, entrega recuperable tras el pago, titular y documentación comercial, y costes por pedido. No automatizar decisiones jurídicas ni inventar requisitos.

Los umbrales anteriores son reglas de gestión propuestas, no estimaciones de conversión ni estándares del mercado.

## Rentabilidad: aún desconocida

Medir ingreso neto menos procesamiento, pagos, almacenamiento, devoluciones y soporte. Diez expedientes a 49 € son 490 € cobrados antes de impuestos y costes, no 490 € de beneficio. Sin CAC, tasa de compra y coste de soporte no se puede pronosticar rentabilidad. No se cambia de producto solo por una promesa de ingresos.

## Verificación y publicación

26 pruebas locales superadas, incluidas lectura de un PDF de texto, rechazo de uno vacío, límite de 81 páginas y persistencia fallida. Build de producción correcto. Las pruebas de Stripe son simuladas: no acreditan cobros reales. No se ha revisado visualmente la nueva versión desplegada.

La revisión automática bloqueó `git push --dry-run`: exige autorización explícita para comunicar/publicar en KBzcreations/licita-ai. No se intentó eludirla. Publicación pendiente, con revisión de cambios y autorización específica como siguiente paso.
