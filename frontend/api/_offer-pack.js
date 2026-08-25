const clean = value => String(value ?? '').trim();
const present = value => value !== null && value !== undefined && clean(value) !== '';

export function deterministicOfferPack(licitacion = {}, perfil = {}) {
  const facts = [
    ['Expediente', licitacion.expediente],
    ['Órgano de contratación', licitacion.organismo],
    ['Presupuesto publicado', present(licitacion.presupuesto) ? `${Number(licitacion.presupuesto).toLocaleString('es-ES')} €` : null],
    ['Fecha límite', licitacion.fecha_limite],
    ['Hora límite', licitacion.hora_limite],
    ['CPV', licitacion.cpv],
    ['Fuente', licitacion.fuente_datos || (licitacion.url_origen ? 'Fuente oficial enlazada' : null)],
  ].filter(([, value]) => present(value)).map(([label, value]) => ({ label, value: clean(value), evidence: 'dato publicado' }));

  const checklist = [
    { area: 'Plazo', task: 'Confirmar fecha, hora y zona horaria en la plataforma oficial', status: licitacion.fecha_limite ? 'verificar' : 'pendiente', evidence: licitacion.fecha_limite || null },
    { area: 'Administrativa', task: 'Revisar DEUC/declaraciones, poderes, ROLECE y prohibiciones de contratar', status: 'pendiente', evidence: null },
    { area: 'Económica', task: 'Extraer solvencia económica, presupuesto, impuestos y posible baja anormal', status: present(licitacion.presupuesto) ? 'verificar' : 'pendiente', evidence: present(licitacion.presupuesto) ? `${licitacion.presupuesto} € publicados` : null },
    { area: 'Técnica', task: 'Extraer solvencia técnica, clasificación, certificaciones y referencias exigidas', status: 'pendiente', evidence: null },
    { area: 'Oferta', task: 'Identificar criterios evaluables, fórmulas, límites de páginas y contenido de cada sobre', status: 'pendiente', evidence: null },
    { area: 'Garantías', task: 'Comprobar garantía provisional, definitiva y complementaria', status: 'pendiente', evidence: null },
    { area: 'Firma', task: 'Validar formato, firma electrónica y canal oficial de presentación', status: 'pendiente', evidence: null },
  ];

  const blockers = [];
  if (licitacion.fecha_limite && new Date(licitacion.fecha_limite).valueOf() < Date.now()) blockers.push('La fecha límite publicada parece vencida; confirmar antes de trabajar en la oferta.');
  if (present(licitacion.presupuesto) && present(perfil.contrato_maximo) && Number(licitacion.presupuesto) > Number(perfil.contrato_maximo) * 2) blockers.push('El importe supera ampliamente el mayor contrato indicado por la empresa.');

  return {
    version: 1,
    title: `Dossier de preparación — ${clean(licitacion.titulo) || 'Licitación'}`,
    generated_at: new Date().toISOString(),
    source_url: licitacion.url_origen || null,
    document_url: licitacion.url_pliegos || null,
    facts,
    blockers,
    checklist,
    folder_structure: ['00_Fuente_oficial', '01_Documentacion_administrativa', '02_Solvencia', '03_Oferta_tecnica', '04_Oferta_economica', '05_Anexos_y_firmas', '99_Justificantes_presentacion'],
    draft_sections: ['Portada e identificación del expediente', 'Resumen de la solución propuesta', 'Metodología y plan de trabajo', 'Equipo y experiencia', 'Cronograma', 'Calidad, seguridad y gestión de riesgos', 'Oferta económica según modelo oficial'],
    limitations: 'Este dossier organiza la preparación con los datos publicados disponibles. Los requisitos marcados como pendientes deben extraerse y verificarse en PCAP/PPT antes de firmar o presentar.',
  };
}
