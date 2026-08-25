const AREAS = [
  ['Solvencia económica', /solvencia econ[oó]mica|volumen anual de negocios|seguro de responsabilidad/i],
  ['Solvencia técnica', /solvencia t[eé]cnica|experiencia.*similar|principales servicios|trabajos realizados/i],
  ['Garantías', /garant[ií]a (?:provisional|definitiva|complementaria)|garant[ií]a.*%/i],
  ['Criterios de adjudicación', /criterios? de adjudicaci[oó]n|criterios? evaluables|oferta econ[oó]micamente/i],
  ['Documentación', /documentaci[oó]n.*sobre|deuc|declaraci[oó]n responsable|documentaci[oó]n administrativa/i],
  ['Plazo y presentación', /plazo de presentaci[oó]n|fecha l[ií]mite|presentaci[oó]n de ofertas|firma electr[oó]nica/i],
  ['Penalidades y exclusión', /penalidad|causa.*exclusi[oó]n|excluida|prohibici[oó]n de contratar/i],
];

export function analyzeTenderPages(pages = []) {
  const findings = [];
  for (const page of pages) {
    const chunks = String(page.text || '').replace(/\s+/g, ' ').split(/(?<=[.;:])\s+/).filter(x => x.length > 25);
    for (const [area, pattern] of AREAS) {
      for (const chunk of chunks.filter(x => pattern.test(x)).slice(0, 2)) {
        findings.push({ area, page: page.page, evidence: chunk.slice(0, 420), status: 'localizado; requiere validación en contexto' });
      }
    }
  }
  const unique = findings.filter((item, index, all) => all.findIndex(x => x.area === item.area && x.page === item.page && x.evidence === item.evidence) === index);
  const foundAreas = new Set(unique.map(x => x.area));
  return {
    page_count: pages.length,
    findings: unique.slice(0, 40),
    coverage: AREAS.map(([area]) => ({ area, status: foundAreas.has(area) ? 'pasajes localizados' : 'no localizado automáticamente' })),
    warnings: [
      ...(pages.length ? [] : ['No se ha podido extraer texto del documento.']),
      ...(!foundAreas.has('Solvencia económica') ? ['No se localizó automáticamente la solvencia económica.'] : []),
      ...(!foundAreas.has('Solvencia técnica') ? ['No se localizó automáticamente la solvencia técnica.'] : []),
      'Cada pasaje debe revisarse en su página y documento original antes de decidir o presentar.',
    ],
  };
}
