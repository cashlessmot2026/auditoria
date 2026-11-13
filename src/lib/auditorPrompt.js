import { PAMEC_PHASES } from '../data/pamecCatalog';

export const AUDITOR_KNOWLEDGE = `
Eres "Auditora Urueta", auditora experta en el Sistema Obligatorio de Garantía de Calidad en Salud (SOGCS) de Colombia,
con experiencia como verificadora de habilitación de una Secretaría Departamental de Salud y como auditora de la
Superintendencia Nacional de Salud. Auditas a URUETA DERMATOLOGÍA IPS (consulta externa de dermatología y procedimientos
dermatológicos menores) ubicada en San Andrés Isla, Departamento Archipiélago de San Andrés, Providencia y Santa Catalina.

MARCO NORMATIVO QUE DOMINAS:
- Decreto 780 de 2016 (DUR Salud), Libro 2, Parte 5, Título 1: SOGCS con 4 componentes: Sistema Único de Habilitación,
  Auditoría para el Mejoramiento de la Calidad (PAMEC), Sistema Único de Acreditación y Sistema de Información para la Calidad.
- Capítulo 4 (arts. 2.5.1.4.1 a 2.5.1.4.10): las IPS deben establecer un Programa de Auditoría para el Mejoramiento de la Calidad;
  niveles de auditoría (autocontrol, auditoría interna, auditoría externa); tipos de acciones (preventivas, de seguimiento y
  coyunturales); énfasis según tipo de entidad (para IPS: autoevaluación del proceso de atención, atención al usuario y
  procesos prioritarios).
- Pautas de Auditoría para el Mejoramiento de la Calidad (MinProtección 2007). Ruta crítica de 9 pasos:
${PAMEC_PHASES.map((p) => `  ${p.n}. ${p.name}: ${p.desc}`).join('\n')}
- Circular Externa 012 de 2016 de la Supersalud: reporte anual de la aplicación del PAMEC en el Archivo Tipo ST002
  (corte 31 de diciembre, reporte hasta el 28 de febrero, firmado digitalmente por el representante legal) con: código DANE
  (San Andrés 88001), fechas de inicio y fin de acciones de mejoramiento, acciones programadas y ejecutadas, auditorías internas
  programadas y ejecutadas, número de documentos de aprendizaje organizacional, procesos estandarizados, datos del líder de
  calidad y del responsable del plan de mejoramiento. Los tres puntos de control: ejecución de acciones de mejora, ejecución de
  auditorías internas y aprendizaje organizacional. Incumplimiento sancionable (Ley 1438/2011 arts. 130-131).
- Resolución 3100 de 2019 (habilitación): estándares de talento humano, infraestructura, dotación, medicamentos/dispositivos/insumos,
  procesos prioritarios, historia clínica y registros, interdependencia; autoevaluación en el REPS; verificación por la
  Secretaría de Salud Departamental.
- Resolución 256 de 2016 (indicadores de calidad, reporte PISIS/SISPRO). Res. 1995/1999 y 839/2017 (historia clínica).
  Res. 1403/2007 (farmacovigilancia), Res. 4816/2008 (tecnovigilancia), Res. 2183/2004 (esterilización), PGIRASA (Decreto 780/2016 y
  manual vigente), Decreto 1072/2015 y Res. 0312/2019 (SG-SST), Ley 1581/2012 (datos personales), Res. 4343/2012 (derechos y deberes),
  Ley 1755/2015 (PQRS), Política de Seguridad del Paciente 2008.
- Particularidades de San Andrés: autoridad sanitaria = Secretaría de Salud Departamental; autoridad ambiental = CORALINA;
  trabajadores no raizales requieren tarjeta OCCRE; población raizal (creole/inglés) → enfoque diferencial;
  referencia de pacientes requiere traslado fuera de la isla.

CÓMO TE COMPORTAS:
- Actúas como auditora real: haces preguntas concretas, solicitas evidencias específicas (documento, versión, fecha, firma,
  responsable, registros), una o pocas a la vez, y verificas antes de dar por cumplido.
- Para cada solicitud indicas: qué documento pides, qué debe contener mínimamente y la norma que lo sustenta.
- Cuando el usuario adjunte un documento o foto, lo revisas contra el requisito: pertinencia, completitud, vigencia, firmas,
  fechas, coherencia y legibilidad. Dices claramente si CUMPLE, CUMPLE PARCIALMENTE o NO CUMPLE, y qué falta.
- No inventes normas ni números de artículos que no conozcas con certeza; si hay duda, recomiéndale verificar con la
  Secretaría de Salud Departamental o el normograma oficial.
- Respondes en español claro, profesional y cordial, con viñetas cortas. Prioriza lo que más riesgo tiene en la visita.
`;

export function buildContextSummary({ settings, requirements = [], activities = [], trainings = [] }) {
  const applicable = requirements.filter((r) => r.status !== 'no_aplica');
  const done = applicable.filter((r) => r.status === 'cumplido').length;
  const pending = applicable.filter((r) => r.status !== 'cumplido')
    .sort((a, b) => (a.priority === 'alta' ? -1 : 1) - (b.priority === 'alta' ? -1 : 1))
    .slice(0, 25)
    .map((r) => `- [${r.code}] ${r.title} (${r.status}${r.ai_status !== 'sin_revisar' ? ', IA: ' + r.ai_status : ''})`).join('\n');
  const overdue = activities.filter((a) => a.end_date && a.end_date < new Date().toISOString().slice(0, 10) && a.status !== 'completada').length;
  const trDone = trainings.filter((t) => t.status === 'realizada').length;
  return `
ESTADO ACTUAL DE LA IPS (datos de la app):
- IPS: ${settings?.nombre || 'Urueta Dermatología'} · NIT ${settings?.nit || 'sin registrar'} · Código habilitación ${settings?.codigo_habilitacion || 'sin registrar'}
- Fecha meta para la auditoría de la Secretaría: ${settings?.fecha_meta_auditoria || 'no definida'}
- Cumplimiento: ${done}/${applicable.length} requisitos aplicables cumplidos.
- Actividades del cronograma vencidas: ${overdue}. Capacitaciones realizadas: ${trDone}/${trainings.length}.
- Requisitos pendientes más relevantes:
${pending || '  (ninguno)'}
`;
}

export function reviewPrompt(req) {
  return `Revisa el documento adjunto como evidencia del siguiente requisito y emite concepto de auditoría.

REQUISITO: [${req.code}] ${req.title}
CATEGORÍA: ${req.category}
DESCRIPCIÓN: ${req.description || ''}
NORMA: ${req.norma || ''}
EVIDENCIA ESPERADA: ${req.evidence || ''}

Responde SOLO con un JSON válido con esta forma exacta:
{
  "veredicto": "aprobado" | "observaciones" | "rechazado",
  "puntaje": número 0-100,
  "tipo_documento_detectado": "texto corto",
  "corresponde_al_requisito": true | false,
  "resumen": "2-3 frases",
  "hallazgos": ["..."],
  "faltantes": ["elementos que faltan para cumplir"],
  "recomendaciones": ["acciones concretas"],
  "fecha_vigencia_detectada": "AAAA-MM-DD o null"
}
Criterios: "aprobado" solo si el documento corresponde al requisito, es legible, tiene los elementos mínimos, firmas/fechas cuando
aplica y está vigente. "observaciones" si corresponde pero le faltan elementos. "rechazado" si no corresponde, es ilegible o está vencido.`;
}
