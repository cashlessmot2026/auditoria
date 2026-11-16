// =====================================================================
//  FORMATOS DESCARGABLES (PDF y Excel) para el PAMEC y la habilitación
//  Cada formato indica los requisitos del checklist que soporta (reqs)
//  y la norma o documento oficial en que se basa (norma / fuente).
//
//  Tipos de sección:
//   info   : campos a diligenciar (etiqueta + espacio)
//   table  : tabla con columnas, filas vacías y/o filas precargadas;
//            "formula" (solo Excel) calcula columnas automáticamente
//   check  : lista de chequeo con criterios precargados
//   text   : recuadro de texto libre
//   para   : párrafo fijo (instrucciones, declaraciones)
//   sign   : firmas
//  Usar solo caracteres latinos básicos (sin flechas, rayas largas ni comillas curvas)
// =====================================================================

export const FORMAT_GROUPS = [
  'Gobierno del PAMEC',
  'Ruta crítica PAMEC',
  'Reporte y SIC',
  'Habilitación',
  'Talento humano',
  'Infraestructura y dotación',
  'Medicamentos y dispositivos',
  'Procesos prioritarios',
  'Seguridad del paciente',
  'Historia clínica',
  'Atención al usuario',
  'Gestión ambiental',
  'SG-SST',
  'Capacitación',
  'Documentos legales'
];

const SRC_GUIAS = 'MinProtección Social (2007). Guías básicas para la implementación de las Pautas de Auditoría para el Mejoramiento de la Calidad de la Atención en Salud.';
const SRC_PAUTAS = 'MinProtección Social (2007). Pautas de Auditoría para el Mejoramiento de la Calidad de la Atención en Salud.';

const CHECK = ['Cumple', 'No cumple', 'N/A'];
const YESNO = ['Sí', 'No'];
const SCALE5 = ['1', '2', '3', '4', '5'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const c = (h, w = 1, list) => ({ h, w, list });           // columna (w = ancho relativo, list = lista desplegable en Excel)
const info = (fields, cols = 2) => ({ type: 'info', fields, cols });
const table = (columns, opts = {}) => ({ type: 'table', columns, rows: 12, ...opts });
const check = (title, items, extra = 'Observaciones / evidencia') => ({ type: 'check', title, items, extra });
const text = (label, lines = 4) => ({ type: 'text', label, lines });
const para = (body) => ({ type: 'para', body });
const sign = (roles) => ({ type: 'sign', roles });

export const FORMATS = [
  // ===================== GOBIERNO DEL PAMEC =====================
  {
    id: 'F-GOB-01', group: 'Gobierno del PAMEC', title: 'Acta de adopción del Programa de Auditoría (PAMEC)',
    reqs: ['GOB-01', 'GOB-03', 'GOB-04'], norma: 'Decreto 780/2016, arts. 2.5.1.4.1 a 2.5.1.4.10', fuente: SRC_PAUTAS,
    objetivo: 'Dejar constancia de la adopción formal del PAMEC por la gerencia, su vigencia, niveles de auditoría y tipos de acciones.',
    sections: [
      info(['Acta No.', 'Fecha', 'Lugar', 'Hora inicio / fin', 'Vigencia del PAMEC', 'Versión del documento PAMEC']),
      table([c('Asistente', 2), c('Cargo', 2), c('Firma', 1.5)], { title: 'Asistentes', rows: 5 }),
      check('Contenido mínimo del PAMEC aprobado', [
        'Objetivo general y objetivos específicos del programa',
        'Alcance (servicios y procesos incluidos)',
        'Metodología: ruta crítica de 9 pasos (autoevaluación a aprendizaje organizacional)',
        'Niveles de auditoría: autocontrol, auditoría interna y auditoría externa',
        'Tipos de acciones: preventivas, de seguimiento y coyunturales',
        'Responsable del programa (líder de calidad) y equipo de mejoramiento',
        'Cronograma anual de actividades y de auditorías internas',
        'Mecanismo de reporte del archivo ST002 a la Supersalud'
      ], 'Observación'),
      text('Decisiones y compromisos', 5),
      sign(['Representante legal / Gerente', 'Líder de calidad (responsable del PAMEC)'])
    ]
  },
  {
    id: 'F-GOB-02', group: 'Gobierno del PAMEC', title: 'Designación del responsable del PAMEC (líder de calidad)',
    reqs: ['GOB-02'], norma: 'Decreto 780/2016 art. 2.5.1.4.3; CE 012/2016 Supersalud (ST002)', fuente: SRC_PAUTAS,
    objetivo: 'Designar formalmente a la persona responsable del PAMEC y del seguimiento a los planes de mejoramiento.',
    sections: [
      info(['Fecha', 'Nombre del designado', 'Documento de identidad', 'Cargo', 'Profesión', 'Correo electrónico', 'Teléfono', 'Fecha de inicio de funciones']),
      check('Funciones asignadas', [
        'Coordinar la formulación, ejecución y evaluación del PAMEC',
        'Liderar la autoevaluación y la priorización de procesos a mejorar',
        'Programar y realizar auditorías internas',
        'Hacer seguimiento a los planes de mejoramiento e indicadores',
        'Presentar informes a la gerencia y al comité de calidad',
        'Consolidar y reportar el archivo ST002 a la Supersalud',
        'Promover la cultura de seguridad del paciente y el aprendizaje organizacional'
      ], 'Observación'),
      sign(['Representante legal', 'Designado (aceptación)'])
    ]
  },
  {
    id: 'F-GOB-03', group: 'Gobierno del PAMEC', title: 'Programa anual de auditoría',
    reqs: ['GOB-03', 'RC-07'], norma: 'Decreto 780/2016 art. 2.5.1.4.4 (niveles de auditoría)', fuente: SRC_GUIAS + ' Formato para formular el programa de auditoría.',
    objetivo: 'Programar las auditorías internas del año: procesos, objetivos, criterios, fechas, equipo y recursos.',
    landscape: true,
    sections: [
      info(['Vigencia', 'Elaborado por', 'Aprobado por', 'Fecha de aprobación'], 4),
      table([c('Proceso por auditar', 2), c('Objetivo y alcance', 2.5), c('Criterios de auditoría', 2), c('Fecha inicia'), c('Fecha finaliza'), c('Equipo', 1.5), c('Lugar'), c('Duración'), c('Recursos'), c('Observaciones', 1.5)], { rows: 10 })
    ]
  },
  {
    id: 'F-GOB-04', group: 'Gobierno del PAMEC', title: 'Plan de auditoría (procedimiento de auditoría)',
    reqs: ['GOB-03', 'RC-07'], norma: 'Decreto 780/2016 art. 2.5.1.4.4', fuente: SRC_GUIAS + ' Formato para planear el procedimiento de auditoría.',
    objetivo: 'Planear cada auditoría: qué se hará, cómo, quién, cuándo y dónde.',
    landscape: true,
    sections: [
      info(['Proceso objeto de mejora', 'Criterios', 'Objetivo', 'Alcance', 'Lugar', 'Auditor líder'], 2),
      table([c('Qué (actividades)', 2.5), c('Cómo (técnicas de apoyo)', 2), c('Quién (equipo auditor)', 1.5), c('Cuándo (inicio - terminación)', 1.5), c('Dónde (área o proceso)', 1.5), c('Observaciones', 2)], { rows: 8 })
    ]
  },
  {
    id: 'F-GOB-05', group: 'Gobierno del PAMEC', title: 'Acta de reunión de comité',
    reqs: ['GOB-05', 'HC-02'], norma: 'Decreto 780/2016; Res. 1995/1999 (comité de historias clínicas)', fuente: SRC_GUIAS + ' Anexo 5: formato para documentación de reuniones de comités.',
    objetivo: 'Documentar las reuniones de los comités (calidad y seguridad del paciente, historias clínicas, etc.).',
    sections: [
      info(['Comité', 'Reunión No.', 'Fecha', 'Lugar', 'Hora inicio', 'Hora fin']),
      table([c('Asistente', 2), c('Cargo', 2), c('Firma', 1.5)], { title: 'Asistentes', rows: 6 }),
      text('Temas a tratar (orden del día)', 4),
      text('Resumen de los temas tratados, decisiones y conclusiones', 7),
      table([c('Compromiso', 3), c('Responsable', 1.5), c('Fecha límite'), c('Estado')], { title: 'Compromisos', rows: 6 }),
      text('Puntos a considerar en futuras reuniones', 2),
      info(['Próxima reunión: fecha', 'Próxima reunión: temas']),
      sign(['Presidente del comité', 'Secretario(a)'])
    ]
  },
  {
    id: 'F-GOB-06', group: 'Gobierno del PAMEC', title: 'Plan de trabajo del comité',
    reqs: ['GOB-05'], norma: 'Decreto 780/2016', fuente: SRC_GUIAS + ' Anexo 2: formato para elaborar el plan de trabajo del comité.',
    objetivo: 'Planear las actividades anuales del comité alineadas con los objetivos institucionales.',
    landscape: true,
    sections: [
      info(['Comité', 'Objetivo de la institución al que contribuye', 'Meta de la institución', 'Objetivo específico del comité', 'Meta del comité', 'Indicador de seguimiento']),
      table([c('Qué (actividades)', 2.5), c('Quién (responsable)', 1.5), c('Cuándo (fecha de terminación)', 1.2), c('Dónde (lugar)', 1.2), c('Por qué (propósito)', 2), c('Cómo (pautas)', 2)], { rows: 10 })
    ]
  },
  {
    id: 'F-GOB-07', group: 'Gobierno del PAMEC', title: 'Listado maestro de documentos',
    reqs: ['GOB-08'], norma: 'Res. 3100/2019 (procesos prioritarios: documentación); buenas prácticas de control documental', fuente: 'Formato institucional sugerido.',
    objetivo: 'Controlar los documentos vigentes del sistema de calidad: código, versión, fecha y ubicación.',
    landscape: true,
    sections: [
      table([c('Código'), c('Nombre del documento', 3), c('Tipo', 1, ['Manual', 'Procedimiento', 'Protocolo', 'Guía', 'Formato', 'Instructivo', 'Política', 'Plan', 'Programa']), c('Proceso', 1.5), c('Versión', 0.7), c('Fecha de aprobación'), c('Responsable', 1.5), c('Ubicación / medio', 1.5), c('Estado', 1, ['Vigente', 'En revisión', 'Obsoleto'])], { rows: 25 })
    ]
  },
  {
    id: 'F-GOB-08', group: 'Gobierno del PAMEC', title: 'Caracterización de proceso',
    reqs: ['GOB-07'], norma: 'Enfoque por procesos (SOGC); Res. 3100/2019', fuente: 'Formato institucional sugerido (modelo PHVA / SIPOC).',
    objetivo: 'Describir cada proceso: objetivo, proveedores, entradas, actividades, salidas, clientes, recursos, indicadores y riesgos.',
    landscape: true,
    sections: [
      info(['Proceso', 'Tipo de proceso (estratégico, misional, apoyo, evaluación)', 'Líder del proceso', 'Objetivo', 'Alcance (desde - hasta)', 'Versión / fecha']),
      table([c('Proveedor', 1.5), c('Entradas', 1.8), c('Ciclo PHVA', 0.8, ['Planear', 'Hacer', 'Verificar', 'Actuar']), c('Actividades', 3), c('Salidas', 1.8), c('Cliente', 1.5)], { rows: 8 }),
      info(['Recursos (humanos, físicos, tecnológicos)', 'Indicadores', 'Riesgos', 'Documentos asociados', 'Normatividad aplicable', 'Registros'])
    ]
  },

  // ===================== RUTA CRÍTICA PAMEC =====================
  {
    id: 'F-RC-01', group: 'Ruta crítica PAMEC', title: 'Paso 1. Autoevaluación de la calidad',
    reqs: ['RC-01'], norma: 'Decreto 780/2016 art. 2.5.1.4.3; Res. 5095/2018 (estándares de acreditación, referente)', fuente: SRC_GUIAS,
    objetivo: 'Diagnosticar la calidad frente a los estándares, identificando fortalezas y oportunidades de mejora por grupo de estándares.',
    landscape: true,
    sections: [
      para('Califique cada grupo de estándares de 1 a 5 en ENFOQUE (¿está definido y documentado?), IMPLEMENTACIÓN (¿se aplica en toda la IPS y llega al usuario?) y RESULTADOS (¿se mide y mejora?). 1 = no existe, 3 = parcial, 5 = sistemático y con resultados. Ajuste los grupos al referente que adopte (acreditación o habilitación).'),
      table([c('Grupo de estándares', 2.2), c('Fortalezas', 2.5), c('Oportunidades de mejora', 2.8), c('Enfoque', 0.8, SCALE5), c('Implementación', 0.9, SCALE5), c('Resultados', 0.8, SCALE5), c('Promedio', 0.8)], {
        prefill: [
          ['Derechos de los pacientes'], ['Seguridad del paciente'], ['Acceso y registro e ingreso'], ['Evaluación de necesidades al ingreso'],
          ['Planeación y ejecución de la atención'], ['Evaluación de la atención'], ['Salida y seguimiento'], ['Referencia y contrarreferencia'],
          ['Direccionamiento'], ['Gerencia'], ['Gerencia del talento humano'], ['Gerencia del ambiente físico'],
          ['Gestión de tecnología'], ['Gerencia de la información'], ['Mejoramiento de la calidad']
        ],
        rows: 15, formula: { 6: (r) => `IFERROR(AVERAGE(D${r}:F${r}),"")` }
      }),
      info(['Equipo autoevaluador', 'Fecha de la autoevaluación'])
    ]
  },
  {
    id: 'F-RC-02', group: 'Ruta crítica PAMEC', title: 'Paso 2. Selección de procesos a mejorar',
    reqs: ['RC-02'], norma: 'Decreto 780/2016; Pautas de Auditoría 2007', fuente: SRC_GUIAS,
    objetivo: 'Consolidar las oportunidades de mejora de todas las fuentes y seleccionar los procesos que entrarán al PAMEC.',
    landscape: true,
    sections: [
      table([c('No.', 0.5), c('Fuente', 1.5, ['Autoevaluación', 'PQRSF', 'Eventos adversos', 'Indicadores', 'Auditoría interna', 'Auditoría externa / visita', 'Comités']), c('Oportunidad de mejora / problema', 3.5), c('Proceso relacionado', 1.8), c('¿Se selecciona?', 0.9, YESNO), c('Justificación', 2.5)], { rows: 18 })
    ]
  },
  {
    id: 'F-RC-03', group: 'Ruta crítica PAMEC', title: 'Paso 3. Matriz de priorización (riesgo, costo, volumen)',
    reqs: ['RC-03'], norma: 'Pautas de Auditoría 2007 (priorización)', fuente: SRC_GUIAS + ' Gráficas 1 a 3: calificación de la matriz de priorización (los valores se multiplican).',
    objetivo: 'Priorizar los procesos u oportunidades de mejora seleccionados para iniciar su mejoramiento.',
    landscape: true,
    sections: [
      para('Califique 1, 3 o 5 (bajo, medio, alto impacto). RIESGO: exposición del usuario o de la IPS si no se mejora. COSTO: impacto económico de no mejorar. VOLUMEN: cobertura o cantidad de usuarios afectados. Total = Riesgo x Costo x Volumen. Ordene de mayor a menor y seleccione según la capacidad de la IPS.'),
      table([c('No.', 0.5), c('Proceso / oportunidad de mejora', 4), c('Riesgo', 0.9, ['1', '3', '5']), c('Costo', 0.9, ['1', '3', '5']), c('Volumen', 0.9, ['1', '3', '5']), c('Total', 0.9), c('Orden de prioridad', 1), c('Observaciones', 2)], {
        rows: 15, formula: { 5: (r) => `IF(COUNT(C${r}:E${r})=3,C${r}*D${r}*E${r},"")`, 6: (r, a, b) => `IF(F${r}="","",RANK(F${r},$F$${a}:$F$${b}))` }
      }),
      info(['Participantes', 'Fecha'])
    ]
  },
  {
    id: 'F-RC-04', group: 'Ruta crítica PAMEC', title: 'Paso 4. Ficha técnica del indicador (calidad esperada)',
    reqs: ['RC-04', 'SIC-02'], norma: 'Res. 256/2016 (indicadores de calidad); Decreto 780/2016', fuente: SRC_GUIAS + ' Hoja de vida o ficha técnica del indicador.',
    objetivo: 'Definir para cada proceso priorizado el indicador, su fórmula, fuente y meta (calidad esperada).',
    sections: [
      info(['Nombre del indicador', 'Código', 'Proceso priorizado', 'Dominio / dimensión de calidad', 'Objetivo del indicador', 'Tipo (estructura, proceso, resultado)', 'Definición operacional', 'Numerador', 'Denominador', 'Unidad de medida', 'Fuente del numerador', 'Fuente del denominador', 'Periodicidad de medición', 'Periodicidad de análisis', 'Meta (calidad esperada)', 'Línea de base', 'Responsable de la medición', 'Responsable del análisis', 'Usuarios de la información', 'Criterios de exclusión'], 2),
      text('Interpretación y acciones según resultado', 3),
      sign(['Elaboró', 'Aprobó'])
    ]
  },
  {
    id: 'F-RC-05', group: 'Ruta crítica PAMEC', title: 'Paso 5. Medición inicial (línea de base y brecha)',
    reqs: ['RC-05'], norma: 'Decreto 780/2016; Pautas de Auditoría 2007', fuente: SRC_GUIAS,
    objetivo: 'Medir el desempeño actual y calcular la brecha frente a la calidad esperada.',
    landscape: true,
    sections: [
      table([c('Proceso', 1.8), c('Indicador', 2.5), c('Periodo medido', 1.1), c('Numerador', 0.9), c('Denominador', 0.9), c('Resultado (%)', 0.9), c('Meta (%)', 0.8), c('Brecha (puntos)', 0.9), c('Análisis', 2.5)], {
        rows: 12, formula: { 5: (r) => `IF(E${r}>0,ROUND(D${r}/E${r}*100,1),"")`, 7: (r) => `IF(AND(F${r}<>"",G${r}<>""),ROUND(G${r}-F${r},1),"")` }
      })
    ]
  },
  {
    id: 'F-RC-06A', group: 'Ruta crítica PAMEC', title: 'Análisis de causas (espina de pescado y 5 porqués)',
    reqs: ['RC-05', 'RC-06', 'SP-02'], norma: 'Pautas de Auditoría 2007 (herramientas de análisis)', fuente: SRC_GUIAS + ' Anexo 1: herramientas.',
    objetivo: 'Identificar las causas raíz de la brecha antes de formular el plan de mejoramiento.',
    sections: [
      info(['Problema / efecto analizado', 'Proceso', 'Fecha', 'Equipo de análisis']),
      table([c('Categoría', 1.3), c('Causas identificadas', 4), c('¿Causa raíz?', 0.9, YESNO)], {
        title: 'Diagrama de espina de pescado (6M)', rows: 6,
        prefill: [['Métodos / procedimientos'], ['Mano de obra (personas)'], ['Materiales e insumos'], ['Máquinas / equipos'], ['Medio ambiente / infraestructura'], ['Medición / información']]
      }),
      table([c('Pregunta', 1), c('Respuesta', 5)], { title: '5 porqués', prefill: [['¿Por qué 1?'], ['¿Por qué 2?'], ['¿Por qué 3?'], ['¿Por qué 4?'], ['¿Por qué 5?']], rows: 5 }),
      text('Causa raíz concluida', 3)
    ]
  },
  {
    id: 'F-RC-06', group: 'Ruta crítica PAMEC', title: 'Paso 6. Plan de mejoramiento (5W-1H)',
    reqs: ['RC-06', 'SIC-01'], norma: 'Decreto 780/2016; Pautas de Auditoría 2007', fuente: SRC_GUIAS + ' Figura 15: matriz 5W-1H para la formulación del plan de mejoramiento.',
    objetivo: 'Formular las acciones para cerrar la brecha: qué, por qué, cómo, quién, dónde y cuándo.',
    landscape: true,
    sections: [
      info(['Proceso priorizado', 'Indicador y meta', 'Brecha a cerrar', 'Responsable del plan'], 4),
      table([c('Causa raíz', 1.8), c('Qué (acción de mejora)', 2.4), c('Por qué (propósito)', 1.6), c('Cómo (medios y recursos)', 1.8), c('Quién', 1.2), c('Dónde', 1), c('Inicio', 0.9), c('Fin', 0.9), c('Tipo de acción', 1.1, ['Preventiva', 'De seguimiento', 'Coyuntural', 'Correctiva']), c('Estado', 1, ['Pendiente', 'En ejecución', 'Cumplida', 'Vencida'])], { rows: 12 })
    ]
  },
  {
    id: 'F-RC-07', group: 'Ruta crítica PAMEC', title: 'Paso 7. Seguimiento al plan de acción',
    reqs: ['RC-07'], norma: 'Decreto 780/2016; Pautas de Auditoría 2007', fuente: SRC_PAUTAS + ' Formato 1: formato para hacer seguimiento a los planes de acción.',
    objetivo: 'Verificar periódicamente la ejecución de las acciones y el avance del indicador.',
    landscape: true,
    sections: [
      info(['Nombre del proceso', 'Meta a lograr', 'Indicador de seguimiento', 'Periodo de seguimiento'], 4),
      table([c('Actividades planeadas para el periodo', 3), c('Actividades ejecutadas', 3), c('% avance', 0.8), c('Problemas que se presentaron', 2.5), c('Cambios en la meta', 1.8), c('Evidencia', 1.5)], { rows: 10 }),
      para('Anexe una gráfica de seguimiento para cada uno de los indicadores definidos.'),
      sign(['Responsable del proceso', 'Líder de calidad'])
    ]
  },
  {
    id: 'F-RC-07B', group: 'Ruta crítica PAMEC', title: 'Informe de auditoría interna',
    reqs: ['RC-07', 'GOB-03'], norma: 'Decreto 780/2016 art. 2.5.1.4.4 (auditoría interna)', fuente: SRC_GUIAS,
    objetivo: 'Registrar los hallazgos de cada auditoría interna y las acciones que se derivan.',
    landscape: true,
    sections: [
      info(['Proceso auditado', 'Fecha', 'Auditor(es)', 'Auditado(s)', 'Objetivo', 'Criterios de auditoría'], 3),
      table([c('No.', 0.5), c('Hallazgo', 3.5), c('Tipo', 1.3, ['Conformidad', 'No conformidad', 'Observación', 'Oportunidad de mejora']), c('Criterio / requisito', 2), c('Evidencia', 2), c('Acción propuesta', 2.2), c('Responsable', 1.2), c('Fecha compromiso', 1)], { rows: 10 }),
      text('Conclusiones de la auditoría', 3),
      sign(['Auditor', 'Responsable del proceso auditado'])
    ]
  },
  {
    id: 'F-RC-08', group: 'Ruta crítica PAMEC', title: 'Paso 8. Evaluación del mejoramiento',
    reqs: ['RC-08'], norma: 'Pautas de Auditoría 2007 (evaluación: monitorear al menos 6 meses)', fuente: SRC_PAUTAS,
    objetivo: 'Comparar el resultado actual con la línea de base y la meta para decidir si la mejora fue efectiva.',
    landscape: true,
    sections: [
      table([c('Proceso', 1.8), c('Indicador', 2.4), c('Línea de base (%)', 0.9), c('Meta (%)', 0.8), c('Resultado actual (%)', 0.9), c('% de brecha cerrada', 0.9), c('¿Se logró la meta?', 0.9, YESNO), c('Decisión', 1.5, ['Estandarizar', 'Ajustar plan', 'Reiniciar ciclo']), c('Análisis', 2.2)], {
        rows: 12, formula: { 5: (r) => `IF(AND(C${r}<>"",D${r}<>"",E${r}<>"",D${r}<>C${r}),ROUND((E${r}-C${r})/(D${r}-C${r})*100,1),"")` }
      })
    ]
  },
  {
    id: 'F-RC-09', group: 'Ruta crítica PAMEC', title: 'Paso 9. Aprendizaje organizacional y estandarización',
    reqs: ['RC-09'], norma: 'Pautas de Auditoría 2007 (aprendizaje organizacional)', fuente: SRC_PAUTAS,
    objetivo: 'Documentar las lecciones aprendidas, estandarizar los procesos mejorados y definir su control periódico.',
    landscape: true,
    sections: [
      table([c('Proceso mejorado', 1.8), c('Mejora lograda (resultado)', 2.2), c('Lección aprendida', 2.5), c('Estándar / documento creado o actualizado', 2.2), c('Fecha de divulgación', 1), c('Mecanismo de control periódico', 2), c('Responsable', 1.2)], { rows: 10 })
    ]
  },

  // ===================== REPORTE Y SIC =====================
  {
    id: 'F-SIC-01', group: 'Reporte y SIC', title: 'Consolidado para el reporte ST002 (Supersalud)',
    reqs: ['SIC-01', 'SIC-03'], norma: 'Circular Externa 012/2016 Supersalud (Circular Única); Decreto 780/2016', fuente: 'Estructura del archivo ST002 (verifique la versión vigente en el portal de la Supersalud antes de cargar).',
    objetivo: 'Consolidar con sus soportes los datos del PAMEC que se reportan anualmente a la Supersalud.',
    sections: [
      info(['Vigencia reportada', 'Código DANE municipio', 'Fecha de inicio del PAMEC', 'Fecha de terminación del PAMEC', 'No. de acciones de mejora programadas', 'No. de acciones de mejora ejecutadas', 'No. de auditorías internas programadas', 'No. de auditorías internas ejecutadas', 'No. de procesos con aprendizaje organizacional', 'Estándares / procesos mejorados', 'Nombre del líder de calidad', 'Correo del líder de calidad', 'Teléfono', 'Responsable del plan de mejoramiento', 'Fecha de cargue', 'Número de radicado / confirmación'], 2),
      table([c('Dato reportado', 2), c('Soporte (documento)', 3), c('Ubicación del soporte', 2)], { title: 'Soportes', rows: 6 }),
      sign(['Líder de calidad', 'Representante legal'])
    ]
  },
  {
    id: 'F-SIC-02', group: 'Reporte y SIC', title: 'Tablero mensual de indicadores de calidad',
    reqs: ['SIC-02', 'AU-03', 'RC-05'], norma: 'Res. 256/2016 (Sistema de Información para la Calidad)', fuente: 'Verifique los nombres, fichas y periodicidad oficiales en el anexo técnico de la Res. 256/2016 y sus actualizaciones.',
    objetivo: 'Registrar mes a mes los indicadores de calidad que aplican a la IPS y compararlos con la meta.',
    landscape: true,
    sections: [
      table([c('Indicador', 3.2), c('Meta', 0.8), ...MONTHS.map((m) => c(m, 0.55)), c('Promedio', 0.8)], {
        prefill: [
          ['Tiempo promedio de espera para la asignación de cita de dermatología (días)'],
          ['Proporción de satisfacción global de los usuarios (%)'],
          ['Proporción de usuarios que recomendaría su IPS a familiares y amigos (%)'],
          ['Proporción de eventos adversos gestionados (%)'],
          ['Proporción de PQRSF respondidas a tiempo (%)'],
          ['Adherencia a higiene de manos (%)'],
          ['Adherencia a guías de práctica clínica (%)'],
          ['Proporción de historias clínicas que cumplen la norma (%)']
        ],
        rows: 12, formula: { 14: (r) => `IFERROR(ROUND(AVERAGE(C${r}:N${r}),1),"")` }
      })
    ]
  },

  // ===================== HABILITACIÓN =====================
  {
    id: 'F-HAB-01', group: 'Habilitación', title: 'Autoevaluación de condiciones de habilitación - Consulta externa de dermatología',
    reqs: ['HAB-02', 'HAB-07', 'TH-01', 'INF-01', 'PP-01', 'HC-01'], norma: 'Res. 3100/2019 (Manual de inscripción y habilitación) y modificaciones (Res. 544/2023)', fuente: 'Lista de chequeo institucional construida a partir de los estándares de la Res. 3100/2019. Verifique cada criterio contra el texto vigente del manual.',
    objetivo: 'Verificar el cumplimiento de los 7 estándares de habilitación antes de la autoevaluación en el REPS y de la visita de la Secretaría de Salud.',
    sections: [
      info(['Servicio', 'Modalidad (intramural / extramural / telemedicina)', 'Fecha', 'Responsable']),
      check('1. Talento humano', [
        'Dermatólogo con título de especialista (convalidado si es del exterior)',
        'Inscripción en ReTHUS y tarjeta profesional vigente',
        'Certificado de soporte vital básico vigente del personal asistencial',
        'Personal de apoyo con certificación de su formación',
        'Hojas de vida con soportes verificados',
        'Tarjeta OCCRE o permiso de residencia (San Andrés)'
      ]),
      check('2. Infraestructura', [
        'Consultorio con área para entrevista y área para examen',
        'Lavamanos en el consultorio o sala de procedimientos',
        'Ventilación e iluminación adecuadas',
        'Pisos, paredes y techos de fácil limpieza',
        'Unidad sanitaria accesible',
        'Accesibilidad para personas con movilidad reducida',
        'Área o depósito para almacenamiento de residuos'
      ]),
      check('3. Dotación', [
        'Camilla, tensiómetro, fonendoscopio, termómetro y báscula',
        'Equipos para procedimientos dermatológicos (dermatoscopio, electrocauterio, etc.)',
        'Inventario y hojas de vida de equipos biomédicos',
        'Mantenimiento preventivo y calibración documentados',
        'Kit o carro para atención de emergencias completo y vigente'
      ]),
      check('4. Medicamentos, dispositivos médicos e insumos', [
        'Registro sanitario INVIMA vigente de medicamentos y dispositivos',
        'Control de fechas de vencimiento',
        'Control de temperatura y humedad del almacenamiento',
        'Programa de farmacovigilancia',
        'Programa de tecnovigilancia',
        'Programa de reactivovigilancia (si aplica)'
      ]),
      check('5. Procesos prioritarios', [
        'Guías de práctica clínica adoptadas para las patologías más frecuentes',
        'Protocolos de procedimientos dermatológicos',
        'Consentimiento informado',
        'Programa de seguridad del paciente y reporte de eventos adversos',
        'Protocolo de limpieza y desinfección',
        'Manual de bioseguridad',
        'Gestión de residuos (PGIRASA)'
      ]),
      check('6. Historia clínica y registros', [
        'Historia clínica única por paciente',
        'Registros completos, legibles, con fecha, hora y firma del profesional',
        'Custodia y confidencialidad de la historia clínica',
        'Consentimientos anexos a la historia clínica',
        'Registros de procedimientos realizados'
      ]),
      check('7. Interdependencia', [
        'Contratos o acuerdos para servicios de apoyo (laboratorio, patología, esterilización si es externa)',
        'Ruta de referencia para urgencias',
        'Contrato con gestor de residuos peligrosos'
      ]),
      sign(['Responsable de la autoevaluación', 'Representante legal'])
    ]
  },
  {
    id: 'F-HAB-02', group: 'Habilitación', title: 'Acta de preparación para la visita de verificación',
    reqs: ['HAB-07', 'HAB-03', 'HAB-01'], norma: 'Res. 3100/2019 (verificación de condiciones de habilitación)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Organizar los soportes que se presentarán a la Secretaría de Salud durante la visita.',
    landscape: true,
    sections: [
      info(['Fecha prevista de la visita', 'Responsable de atender la visita', 'Código de habilitación (REPS)', 'Distintivo de habilitación visible (Sí/No)'], 4),
      table([c('Estándar', 1.5), c('Soporte / documento', 3), c('¿Disponible?', 0.9, YESNO), c('Ubicación (física / digital)', 2), c('Responsable', 1.3), c('Observaciones', 2)], { rows: 15 })
    ]
  },

  // ===================== TALENTO HUMANO =====================
  {
    id: 'F-TH-01', group: 'Talento humano', title: 'Verificación de hojas de vida y soportes del personal',
    reqs: ['TH-01', 'TH-02', 'TH-03', 'TH-04', 'TH-05'], norma: 'Res. 3100/2019 (estándar de talento humano); Ley 1164/2007 (ReTHUS)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Comprobar que cada persona tiene completos y vigentes los soportes exigidos.',
    landscape: true,
    sections: [
      table([c('Nombre', 2), c('Cargo', 1.4), c('Título / diploma', 0.8, YESNO), c('Convalidación', 0.8, ['Sí', 'No', 'N/A']), c('ReTHUS', 0.7, YESNO), c('Tarjeta profesional', 0.8, ['Sí', 'No', 'N/A']), c('OCCRE', 0.7, YESNO), c('BLS (vence)', 0.9), c('Vacunación', 0.8, YESNO), c('Afiliación SGSS', 0.8, YESNO), c('Antecedentes', 0.8, YESNO), c('Fecha verificación', 0.9), c('Verificó', 1.1)], { rows: 12 })
    ]
  },
  {
    id: 'F-TH-02', group: 'Talento humano', title: 'Registro de inducción y reinducción',
    reqs: ['TH-07'], norma: 'Res. 3100/2019; Decreto 1072/2015 (SG-SST)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Dejar constancia de los temas de inducción o reinducción recibidos por cada trabajador.',
    sections: [
      info(['Nombre del trabajador', 'Cargo', 'Tipo (inducción / reinducción)', 'Fecha']),
      check('Temas', [
        'Plataforma estratégica, política de calidad y mapa de procesos',
        'PAMEC y funciones del trabajador en el programa',
        'Política y programa de seguridad del paciente; reporte de eventos adversos',
        'Higiene de manos y bioseguridad',
        'Gestión de residuos (PGIRASA)',
        'Derechos y deberes de los pacientes; humanización',
        'Manejo de historia clínica y confidencialidad',
        'SG-SST: peligros del cargo, uso de EPP y plan de emergencias',
        'Funciones y procedimientos del cargo'
      ], 'Firma del trabajador'),
      sign(['Trabajador', 'Responsable de la inducción'])
    ]
  },
  {
    id: 'F-TH-03', group: 'Talento humano', title: 'Control del esquema de vacunación del personal',
    reqs: ['TH-06'], norma: 'Res. 3100/2019; Decreto 1072/2015', fuente: 'Formato institucional sugerido. Confirme el esquema con su ARL y el lineamiento vigente del MinSalud.',
    objetivo: 'Controlar la vacunación del personal asistencial expuesto a riesgo biológico.',
    landscape: true,
    sections: [
      table([c('Nombre', 2), c('Cargo', 1.3), c('Hepatitis B dosis 1'), c('Hepatitis B dosis 2'), c('Hepatitis B dosis 3'), c('Anti-HBs (títulos)'), c('Tétanos / Td'), c('Influenza (año)'), c('Otras'), c('Observaciones', 1.5)], { rows: 12 })
    ]
  },

  // ===================== INFRAESTRUCTURA Y DOTACIÓN =====================
  {
    id: 'F-INF-01', group: 'Infraestructura y dotación', title: 'Hoja de vida de equipo biomédico',
    reqs: ['INF-02', 'INF-03'], norma: 'Res. 3100/2019 (dotación); Decreto 4725/2005 (dispositivos médicos)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Registrar la información técnica del equipo y el historial de mantenimientos y calibraciones.',
    sections: [
      info(['Nombre del equipo', 'Marca', 'Modelo', 'Serie', 'Registro sanitario INVIMA', 'Clasificación de riesgo (I, IIa, IIb, III)', 'Ubicación / servicio', 'Fecha de adquisición', 'Proveedor', 'Garantía hasta', 'Manual de usuario (Sí/No)', 'Frecuencia de mantenimiento', 'Requiere calibración (Sí/No)', 'Fuente de alimentación']),
      table([c('Fecha', 0.9), c('Tipo', 1, ['Preventivo', 'Correctivo', 'Calibración']), c('Descripción del trabajo', 3), c('Realizado por', 1.4), c('Próximo', 0.9), c('Firma', 1)], { title: 'Historial de mantenimiento y calibración', rows: 10 })
    ]
  },
  {
    id: 'F-INF-02', group: 'Infraestructura y dotación', title: 'Inventario de equipos biomédicos',
    reqs: ['INF-02'], norma: 'Res. 3100/2019 (dotación)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Listar todos los equipos biomédicos con su estado y vigencia de mantenimiento.',
    landscape: true,
    sections: [
      table([c('No.', 0.5), c('Equipo', 2), c('Marca', 1.1), c('Modelo', 1.1), c('Serie', 1.1), c('Registro INVIMA', 1.2), c('Riesgo', 0.7, ['I', 'IIa', 'IIb', 'III']), c('Ubicación', 1.2), c('Último mantenimiento', 1), c('Próximo mantenimiento', 1), c('Estado', 0.9, ['Bueno', 'Regular', 'Fuera de servicio'])], { rows: 18 })
    ]
  },
  {
    id: 'F-INF-03', group: 'Infraestructura y dotación', title: 'Cronograma de mantenimiento preventivo y calibración',
    reqs: ['INF-03'], norma: 'Res. 3100/2019 (dotación)', fuente: 'Formato institucional sugerido. Escriba P (programado) y E (ejecutado).',
    objetivo: 'Programar y controlar los mantenimientos preventivos y calibraciones del año.',
    landscape: true,
    sections: [
      table([c('Equipo', 2.2), c('Actividad', 1.4, ['Mantenimiento', 'Calibración', 'Ambos']), c('Proveedor', 1.3), ...MONTHS.map((m) => c(m, 0.45, ['P', 'E', 'P/E'])), c('Cumplimiento %', 0.8)], {
        rows: 14, formula: { 15: (r) => `IF(COUNTA(D${r}:O${r})=0,"",ROUND((COUNTIF(D${r}:O${r},"E")+COUNTIF(D${r}:O${r},"P/E"))/COUNTA(D${r}:O${r})*100,0))` }
      })
    ]
  },
  {
    id: 'F-INF-04', group: 'Infraestructura y dotación', title: 'Lista de chequeo del kit / carro de emergencias',
    reqs: ['INF-04'], norma: 'Res. 3100/2019 (dotación para atención de emergencias)', fuente: 'Formato institucional sugerido. Ajuste el contenido al protocolo de emergencias adoptado por la IPS.',
    objetivo: 'Verificar mensualmente que el kit de emergencias esté completo, vigente y funcional.',
    landscape: true,
    sections: [
      info(['Mes / año', 'Ubicación del kit', 'Responsable', 'Sello / precinto No.'], 4),
      table([c('Elemento', 3), c('Cantidad requerida', 0.9), c('Cantidad existente', 0.9), c('Lote', 1), c('Fecha de vencimiento', 1), c('Estado', 0.9, ['Completo', 'Faltante', 'Vencido']), c('Observaciones', 2)], {
        prefill: [
          ['Adrenalina (epinefrina) 1 mg/mL ampolla'], ['Antihistamínico inyectable'], ['Corticoide inyectable (hidrocortisona o equivalente)'],
          ['Solución salina 0,9 % 500 mL'], ['Equipo de venoclisis'], ['Catéteres intravenosos (varios calibres)'], ['Jeringas (varios tamaños)'],
          ['Resucitador manual (ambú) adulto con mascarilla'], ['Cánulas orofaríngeas'], ['Fuente de oxígeno portátil y cánula / mascarilla'],
          ['Desfibrilador externo automático (si aplica)'], ['Oxímetro de pulso'], ['Tensiómetro y fonendoscopio'], ['Glucómetro y tirillas'],
          ['Guantes, gasas, esparadrapo, torniquete'], ['Guardián de cortopunzantes']
        ], rows: 16
      }),
      sign(['Revisó', 'Vo. Bo. Líder de calidad'])
    ]
  },
  {
    id: 'F-INF-05', group: 'Infraestructura y dotación', title: 'Registro y evaluación de simulacro',
    reqs: ['INF-05', 'SST-01'], norma: 'Decreto 1072/2015 (plan de prevención, preparación y respuesta ante emergencias); Res. 0312/2019', fuente: 'Formato institucional sugerido.',
    objetivo: 'Documentar los simulacros del plan de emergencias y las acciones de mejora.',
    sections: [
      info(['Fecha', 'Hora inicio / fin', 'Tipo de emergencia simulada', 'Coordinador', 'Número de participantes', 'Tiempo total de evacuación']),
      check('Evaluación', [
        'La alarma fue oída por todos',
        'Se siguió la ruta de evacuación señalizada',
        'Se llegó al punto de encuentro',
        'Se evacuó y acompañó a los pacientes',
        'Los extintores estaban accesibles y vigentes',
        'El botiquín y kit de emergencias estaban disponibles',
        'Se hizo conteo del personal en el punto de encuentro'
      ], 'Observación'),
      text('Oportunidades de mejora', 4),
      sign(['Coordinador del simulacro', 'Responsable SG-SST'])
    ]
  },

  // ===================== MEDICAMENTOS Y DISPOSITIVOS =====================
  {
    id: 'F-MED-01', group: 'Medicamentos y dispositivos', title: 'Reporte de sospecha de evento adverso a medicamento',
    reqs: ['MED-01', 'SP-02'], norma: 'Res. 1403/2007; Programa Nacional de Farmacovigilancia INVIMA', fuente: 'Campos mínimos del formato FOREAM del INVIMA. El reporte oficial se hace en línea en el portal de farmacovigilancia del INVIMA; este formato es el registro interno.',
    objetivo: 'Captar en la IPS la sospecha de reacción adversa o problema relacionado con un medicamento.',
    sections: [
      info(['Fecha de notificación', 'Fecha de inicio del evento', 'Iniciales del paciente', 'Documento', 'Edad', 'Sexo', 'Peso (kg)', 'Diagnóstico principal']),
      table([c('Medicamento (nombre genérico y comercial)', 2.5), c('Dosis', 0.8), c('Vía', 0.8), c('Frecuencia', 0.8), c('Fecha inicio', 0.9), c('Fecha fin', 0.9), c('Lote', 0.9), c('Indicación', 1.3)], { title: 'Medicamentos sospechosos y concomitantes', rows: 4 }),
      text('Descripción del evento adverso', 4),
      info(['Desenlace (recuperado, en recuperación, secuelas, muerte, desconocido)', '¿Es serio? (Sí/No)', '¿Se suspendió el medicamento?', '¿Reapareció al reiniciar?', 'Reportante y profesión', 'Fecha de reporte al INVIMA / No.']),
      sign(['Reportante', 'Responsable de farmacovigilancia'])
    ]
  },
  {
    id: 'F-MED-02', group: 'Medicamentos y dispositivos', title: 'Reporte de evento o incidente adverso con dispositivo médico',
    reqs: ['MED-02', 'SP-02'], norma: 'Res. 4816/2008 (Programa Nacional de Tecnovigilancia)', fuente: 'Campos mínimos del formato FOREIA001 del INVIMA. Los eventos serios se reportan al INVIMA dentro de las 72 horas; los no serios, en el consolidado periódico. Confirme plazos y aplicativo vigentes en invima.gov.co.',
    objetivo: 'Registrar y gestionar los eventos e incidentes adversos asociados a dispositivos médicos.',
    sections: [
      info(['Fecha del evento', 'Fecha de notificación', 'Servicio', 'Iniciales del paciente', 'Edad', 'Sexo', 'Diagnóstico']),
      info(['Nombre del dispositivo', 'Nombre comercial', 'Registro sanitario INVIMA', 'Lote / serie', 'Fabricante / importador', 'Distribuidor', '¿Se usó más de una vez?', '¿Disponible para evaluación?']),
      text('Descripción del evento o incidente', 4),
      info(['Clasificación (evento / incidente; serio / no serio)', 'Desenlace', 'Gestión realizada', 'Fecha de reporte al INVIMA', 'Reportante', 'Cargo']),
      sign(['Reportante', 'Responsable de tecnovigilancia'])
    ]
  },
  {
    id: 'F-MED-03', group: 'Medicamentos y dispositivos', title: 'Reporte de incidente con reactivo de diagnóstico in vitro',
    reqs: ['MED-03'], norma: 'Res. 2013038979/2013 INVIMA (Programa Nacional de Reactivovigilancia)', fuente: 'Formato institucional sugerido con los datos mínimos del reporte. Aplica solo si la IPS usa reactivos de diagnóstico in vitro.',
    objetivo: 'Registrar los efectos indeseados o problemas de calidad de los reactivos de diagnóstico in vitro.',
    sections: [
      info(['Fecha', 'Reactivo', 'Registro sanitario INVIMA', 'Lote', 'Fecha de vencimiento', 'Fabricante / importador']),
      text('Descripción del incidente o problema de calidad', 4),
      info(['¿Afectó un resultado del paciente?', 'Acción tomada', 'Fecha de reporte al INVIMA', 'Reportante']),
      sign(['Reportante', 'Responsable de reactivovigilancia'])
    ]
  },
  {
    id: 'F-MED-04', group: 'Medicamentos y dispositivos', title: 'Control diario de temperatura y humedad',
    reqs: ['MED-04'], norma: 'Res. 1403/2007 (almacenamiento de medicamentos); Res. 3100/2019', fuente: 'Formato institucional sugerido. Use los rangos indicados por el fabricante (en general temperatura ambiente controlada y humedad relativa inferior al 70 %).',
    objetivo: 'Registrar dos veces al día las condiciones ambientales del área de almacenamiento.',
    landscape: true,
    sections: [
      info(['Mes / año', 'Área', 'Rango de temperatura aceptable', 'Rango de humedad aceptable', 'Equipo de medición (termohigrómetro)'], 3),
      table([c('Día', 0.5), c('Temp. AM (°C)', 0.9), c('Humedad AM (%)', 0.9), c('Hora AM', 0.7), c('Temp. PM (°C)', 0.9), c('Humedad PM (%)', 0.9), c('Hora PM', 0.7), c('Fuera de rango', 0.8, YESNO), c('Acción tomada', 2), c('Firma', 1)], {
        prefill: Array.from({ length: 31 }, (_, i) => [String(i + 1)]), rows: 31
      })
    ]
  },
  {
    id: 'F-MED-05', group: 'Medicamentos y dispositivos', title: 'Control de fechas de vencimiento (semaforización)',
    reqs: ['MED-04'], norma: 'Res. 1403/2007; Res. 3100/2019', fuente: 'Formato institucional sugerido. Semáforo: rojo menos de 6 meses, amarillo de 6 a 12 meses, verde más de 12 meses.',
    objetivo: 'Identificar oportunamente los medicamentos, dispositivos e insumos próximos a vencer.',
    landscape: true,
    sections: [
      table([c('Producto', 2.5), c('Presentación', 1.2), c('Registro INVIMA', 1.2), c('Lote', 1), c('Fecha de vencimiento', 1), c('Cantidad', 0.8), c('Meses para vencer', 0.8), c('Semáforo', 0.9), c('Ubicación', 1.2)], {
        rows: 25, formula: { 6: (r) => `IF(E${r}="","",ROUND((E${r}-TODAY())/30,1))`, 7: (r) => `IF(G${r}="","",IF(G${r}<6,"ROJO",IF(G${r}<=12,"AMARILLO","VERDE")))` }
      })
    ]
  },

  // ===================== PROCESOS PRIORITARIOS =====================
  {
    id: 'F-PP-01', group: 'Procesos prioritarios', title: 'Consentimiento informado para procedimiento dermatológico',
    reqs: ['PP-03'], norma: 'Ley 23/1981 (ética médica); Res. 1995/1999 (historia clínica); Ley 1751/2015; Res. 3100/2019', fuente: 'Formato institucional sugerido. Adapte riesgos y alternativas a cada procedimiento.',
    objetivo: 'Informar al paciente y obtener su autorización libre y voluntaria antes del procedimiento.',
    sections: [
      info(['Nombre del paciente', 'Documento', 'Edad', 'Historia clínica No.', 'Procedimiento', 'Profesional que realiza', 'Fecha', 'Lugar']),
      text('Descripción y propósito del procedimiento', 3),
      text('Beneficios esperados', 2),
      text('Riesgos frecuentes y riesgos graves (infección, sangrado, cicatriz, cambios de pigmentación, reacción alérgica, recidiva, etc.)', 4),
      text('Alternativas de tratamiento', 2),
      para('Declaro que he sido informado(a) en lenguaje claro sobre el procedimiento, sus beneficios, riesgos y alternativas; que pude hacer preguntas y fueron resueltas; y que autorizo de manera libre y voluntaria su realización. Sé que puedo revocar este consentimiento en cualquier momento antes del procedimiento. Autorizo también la toma de fotografías clínicas para mi historia clínica (marque): SÍ ___ NO ___'),
      sign(['Paciente (y huella)', 'Representante legal o acudiente (si aplica)', 'Profesional tratante (registro)', 'Testigo']),
      text('Revocatoria del consentimiento (fecha, motivo y firma)', 2)
    ]
  },
  {
    id: 'F-PP-02', group: 'Procesos prioritarios', title: 'Lista de verificación de procedimiento seguro',
    reqs: ['PP-02', 'SP-04', 'SP-05'], norma: 'Lineamientos de seguridad del paciente MinSalud; Lista de verificación de la OMS (adaptada a procedimientos ambulatorios menores)', fuente: 'Adaptación institucional de la lista de verificación de seguridad de la OMS.',
    objetivo: 'Verificar los puntos críticos de seguridad antes, durante y después de cada procedimiento.',
    sections: [
      info(['Paciente', 'Documento', 'Procedimiento', 'Sitio anatómico', 'Profesional', 'Fecha y hora']),
      check('Antes del procedimiento', [
        'Paciente identificado con nombre completo y documento',
        'Procedimiento y sitio confirmados con el paciente y marcados si aplica',
        'Consentimiento informado firmado',
        'Alergias consultadas y registradas',
        'Medicamentos anticoagulantes o condiciones de riesgo revisados',
        'Instrumental estéril verificado (indicador químico)',
        'Higiene de manos realizada'
      ], 'Observación'),
      check('Durante y después', [
        'Técnica aséptica mantenida',
        'Recuento de material e instrumental',
        'Muestra para patología rotulada correctamente (si aplica)',
        'Recomendaciones de cuidado entregadas por escrito',
        'Residuos y cortopunzantes desechados correctamente',
        'Procedimiento registrado en la historia clínica'
      ], 'Observación'),
      sign(['Profesional', 'Auxiliar'])
    ]
  },
  {
    id: 'F-PP-03', group: 'Procesos prioritarios', title: 'Evaluación de adherencia a guías y protocolos',
    reqs: ['PP-01', 'PP-02', 'CAP-02'], norma: 'Res. 3100/2019 (procesos prioritarios); Decreto 780/2016', fuente: 'Formato institucional sugerido.',
    objetivo: 'Medir si la atención registrada cumple los criterios de la guía o protocolo adoptado.',
    landscape: true,
    sections: [
      info(['Guía / protocolo evaluado', 'Periodo', 'Evaluador', 'Tamaño de la muestra'], 4),
      table([c('Historia clínica No.', 1.2), c('Criterio 1', 1), c('Criterio 2', 1), c('Criterio 3', 1), c('Criterio 4', 1), c('Criterio 5', 1), c('Criterios cumplidos', 1), c('% adherencia', 0.9), c('Observaciones', 2)], {
        rows: 20, formula: { 6: (r) => `COUNTIF(B${r}:F${r},"Sí")`, 7: (r) => `IF(COUNTA(B${r}:F${r})=0,"",ROUND(G${r}/COUNTA(B${r}:F${r})*100,0))` },
        lists: { 1: YESNO, 2: YESNO, 3: YESNO, 4: YESNO, 5: YESNO }
      }),
      para('Escriba en el encabezado de cada criterio el punto de la guía que se evalúa. Marque Sí / No por historia.')
    ]
  },
  {
    id: 'F-PP-04', group: 'Procesos prioritarios', title: 'Registro de limpieza y desinfección de áreas',
    reqs: ['PP-04', 'SP-05'], norma: 'Res. 3100/2019; Manual de bioseguridad institucional', fuente: 'Formato institucional sugerido.',
    objetivo: 'Documentar la limpieza rutinaria y terminal de consultorios y sala de procedimientos.',
    landscape: true,
    sections: [
      info(['Mes / año', 'Área'], 2),
      table([c('Fecha', 0.9), c('Hora', 0.7), c('Tipo', 1, ['Rutinaria', 'Terminal', 'Recurrente']), c('Superficies / elementos', 2.5), c('Desinfectante', 1.4), c('Concentración (ppm / %)', 1), c('Realizó', 1.2), c('Supervisó', 1.2)], { rows: 25 })
    ]
  },
  {
    id: 'F-PP-05', group: 'Procesos prioritarios', title: 'Registro de ciclos de esterilización',
    reqs: ['PP-04'], norma: 'Res. 2183/2004 (Manual de buenas prácticas de esterilización)', fuente: 'Formato institucional sugerido basado en el manual de buenas prácticas de esterilización.',
    objetivo: 'Garantizar la trazabilidad de cada ciclo de esterilización y sus indicadores.',
    landscape: true,
    sections: [
      info(['Equipo (autoclave)', 'Serie', 'Mes / año'], 3),
      table([c('Fecha', 0.8), c('Ciclo No.', 0.6), c('Contenido de la carga', 2.4), c('Temp. (°C)', 0.7), c('Presión', 0.7), c('Tiempo (min)', 0.7), c('Indicador químico', 0.9, ['Viró', 'No viró']), c('Indicador biológico', 0.9, ['Negativo', 'Positivo', 'No aplica']), c('Prueba Bowie-Dick', 0.9, ['Conforme', 'No conforme', 'No aplica']), c('Vence (fecha)', 0.8), c('Operador', 1)], { rows: 17 })
    ]
  },
  {
    id: 'F-PP-06', group: 'Procesos prioritarios', title: 'Registro de referencia y contrarreferencia',
    reqs: ['PP-06'], norma: 'Decreto 780/2016 (sistema de referencia y contrarreferencia); Res. 3100/2019', fuente: 'Formato institucional sugerido.',
    objetivo: 'Controlar las remisiones de pacientes y la recepción de la contrarreferencia.',
    landscape: true,
    sections: [
      table([c('Fecha', 0.8), c('Paciente', 1.8), c('Documento', 1), c('EPS', 1), c('Diagnóstico', 1.6), c('Motivo de remisión', 2), c('Institución destino', 1.6), c('Contrarreferencia recibida', 0.9, YESNO), c('Profesional', 1.2)], { rows: 20 })
    ]
  },

  // ===================== SEGURIDAD DEL PACIENTE =====================
  {
    id: 'F-SP-01', group: 'Seguridad del paciente', title: 'Reporte de evento adverso, incidente o atención insegura',
    reqs: ['SP-02', 'SP-01'], norma: 'Lineamientos para la implementación de la Política de Seguridad del Paciente (MinSalud, 2008); Res. 3100/2019', fuente: 'Formato institucional sugerido. El reporte es voluntario, confidencial y no punitivo.',
    objetivo: 'Reportar cualquier evento adverso, incidente o atención insegura para su análisis y gestión.',
    sections: [
      info(['Fecha del suceso', 'Hora', 'Servicio / lugar', 'Paciente (iniciales)', 'Documento / HC', 'Edad']),
      check('Tipo de suceso', ['Incidente (no causó daño)', 'Evento adverso prevenible', 'Evento adverso no prevenible', 'Atención insegura / falla detectada'], 'Marque X'),
      text('¿Qué pasó? (descripción objetiva)', 5),
      text('Acciones inmediatas realizadas', 3),
      info(['Daño al paciente (ninguno, leve, moderado, grave, muerte)', '¿Se informó al paciente/familia?', 'Reportante (opcional)', 'Cargo']),
      sign(['Reportante (opcional)', 'Recibe: referente de seguridad del paciente'])
    ]
  },
  {
    id: 'F-SP-02', group: 'Seguridad del paciente', title: 'Análisis de evento adverso (Protocolo de Londres)',
    reqs: ['SP-02'], norma: 'Lineamientos de Seguridad del Paciente MinSalud; Protocolo de Londres', fuente: 'Estructura basada en el Protocolo de Londres adoptado en las guías técnicas de buenas prácticas de seguridad del paciente del MinSalud.',
    objetivo: 'Identificar las acciones inseguras y los factores contributivos para definir barreras.',
    landscape: true,
    sections: [
      info(['Evento analizado', 'Fecha del evento', 'Fecha del análisis', 'Equipo de análisis'], 2),
      text('Cronología del evento (qué pasó y cuándo)', 4),
      table([c('Acción insegura', 2.5), c('Paciente', 1), c('Tarea y tecnología', 1), c('Individuo', 1), c('Equipo de trabajo', 1), c('Ambiente', 1), c('Organización y gerencia', 1.2), c('Contexto institucional', 1.2)], { title: 'Acciones inseguras y factores contributivos', rows: 5 }),
      table([c('Acción de mejora / barrera', 3), c('Responsable', 1.4), c('Fecha', 1), c('Seguimiento', 1.6)], { title: 'Plan de acción', rows: 5 }),
      sign(['Líder del análisis', 'Líder de calidad'])
    ]
  },
  {
    id: 'F-SP-03', group: 'Seguridad del paciente', title: 'Observación de higiene de manos (5 momentos OMS)',
    reqs: ['SP-03', 'SP-05'], norma: 'Guía de la OMS sobre higiene de manos en la atención de la salud; Lineamientos de Seguridad del Paciente MinSalud', fuente: 'Adaptación del formulario de observación de la estrategia multimodal de la OMS.',
    objetivo: 'Medir la adherencia del personal a la higiene de manos en los 5 momentos.',
    landscape: true,
    sections: [
      info(['Fecha', 'Servicio', 'Observador', 'Periodo de observación'], 4),
      para('Momentos: 1 antes del contacto con el paciente; 2 antes de una tarea aséptica; 3 después de exposición a fluidos; 4 después del contacto con el paciente; 5 después del contacto con el entorno. Acción: F = fricción con alcohol, L = lavado, N = no realizada.'),
      table([c('No.', 0.4), c('Profesional / cargo', 1.6), c('Momento', 0.8, ['1', '2', '3', '4', '5']), c('Acción', 0.8, ['F', 'L', 'N']), c('Uso de guantes', 0.8, YESNO), c('Observaciones', 2)], {
        rows: 25, formula: {}
      }),
      para('Adherencia = oportunidades con acción F o L / total de oportunidades observadas x 100.')
    ]
  },
  {
    id: 'F-SP-04', group: 'Seguridad del paciente', title: 'Ronda de seguridad del paciente',
    reqs: ['SP-01', 'SP-04', 'SP-05'], norma: 'Lineamientos de Seguridad del Paciente MinSalud; Res. 3100/2019', fuente: 'Formato institucional sugerido.',
    objetivo: 'Verificar en el terreno las prácticas seguras y detectar riesgos.',
    sections: [
      info(['Fecha', 'Servicio', 'Participantes', 'Hora']),
      check('Prácticas seguras verificadas', [
        'Identificación correcta del paciente (dos identificadores)',
        'Disponibilidad de alcohol glicerinado y lavamanos con jabón y toallas',
        'Medicamentos almacenados y rotulados correctamente',
        'Cortopunzantes en guardián a menos de 3/4 de su capacidad',
        'Kit de emergencias completo y vigente',
        'Equipos con mantenimiento al día',
        'Pisos secos y sin obstáculos (prevención de caídas)',
        'Consentimientos informados diligenciados',
        'Personal conoce cómo reportar eventos adversos'
      ], 'Observación'),
      text('Riesgos identificados y acciones', 4),
      sign(['Líder de la ronda', 'Responsable del servicio'])
    ]
  },
  {
    id: 'F-SP-05', group: 'Seguridad del paciente', title: 'Consolidado de eventos adversos e incidentes',
    reqs: ['SP-02', 'SIC-02'], norma: 'Lineamientos de Seguridad del Paciente MinSalud; Res. 256/2016', fuente: 'Formato institucional sugerido.',
    objetivo: 'Llevar el registro de todos los reportes, su clasificación, análisis y cierre.',
    landscape: true,
    sections: [
      table([c('No.', 0.4), c('Fecha', 0.8), c('Servicio', 1), c('Descripción breve', 2.6), c('Clasificación', 1.2, ['Incidente', 'EA prevenible', 'EA no prevenible', 'Atención insegura']), c('Severidad', 0.9, ['Leve', 'Moderado', 'Grave', 'Muerte']), c('¿Analizado?', 0.8, YESNO), c('Plan de acción', 2), c('Estado', 0.9, ['Abierto', 'En gestión', 'Cerrado'])], { rows: 20 })
    ]
  },

  // ===================== HISTORIA CLÍNICA =====================
  {
    id: 'F-HC-01', group: 'Historia clínica', title: 'Auditoría de calidad de la historia clínica',
    reqs: ['HC-01', 'HC-02'], norma: 'Res. 1995/1999 (manejo de la historia clínica); Res. 3100/2019', fuente: 'Lista de verificación institucional basada en los componentes de la Res. 1995/1999.',
    objetivo: 'Evaluar el diligenciamiento de las historias clínicas y calcular el porcentaje de cumplimiento.',
    landscape: true,
    sections: [
      info(['Periodo evaluado', 'Profesional evaluado', 'Auditor', 'Fecha'], 4),
      table([c('Criterio', 3.5), c('HC 1', 0.6), c('HC 2', 0.6), c('HC 3', 0.6), c('HC 4', 0.6), c('HC 5', 0.6), c('HC 6', 0.6), c('HC 7', 0.6), c('HC 8', 0.6), c('HC 9', 0.6), c('HC 10', 0.6), c('% cumplimiento', 0.9)], {
        prefill: [
          ['Identificación completa del usuario'], ['Fecha y hora de la atención'], ['Motivo de consulta'], ['Enfermedad actual'],
          ['Antecedentes (personales, familiares, alergias)'], ['Revisión por sistemas'], ['Examen físico (incluye descripción dermatológica)'],
          ['Diagnóstico con código CIE-10'], ['Plan de manejo y tratamiento'], ['Fórmula médica completa'], ['Consentimiento informado (si aplica)'],
          ['Registro de procedimientos'], ['Letra legible / sin tachones ni enmendaduras'], ['Firma y registro del profesional'], ['Orden de exámenes / remisiones registradas']
        ],
        rows: 15, lists: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, ['Sí', 'No', 'N/A']])),
        formula: { 11: (r) => `IF(COUNTIF(B${r}:K${r},"Sí")+COUNTIF(B${r}:K${r},"No")=0,"",ROUND(COUNTIF(B${r}:K${r},"Sí")/(COUNTIF(B${r}:K${r},"Sí")+COUNTIF(B${r}:K${r},"No"))*100,0))` }
      }),
      text('Conclusiones y retroalimentación al profesional', 3),
      sign(['Auditor', 'Profesional evaluado'])
    ]
  },
  {
    id: 'F-HC-02', group: 'Historia clínica', title: 'Autorización para el tratamiento de datos personales',
    reqs: ['HC-03'], norma: 'Ley 1581/2012 y Decreto 1377/2013 (compilado en el Decreto 1074/2015)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Obtener la autorización previa, expresa e informada del titular para tratar sus datos personales y sensibles.',
    sections: [
      info(['Nombre del titular', 'Documento', 'Teléfono', 'Correo electrónico']),
      para('Autorizo a la IPS, como responsable del tratamiento, para recolectar, almacenar, usar y circular mis datos personales, incluidos los datos sensibles relativos a mi salud, con la finalidad de prestar los servicios de salud, gestionar mi historia clínica, citas, facturación, reportes obligatorios a autoridades y aseguradores, y comunicaciones relacionadas con mi atención. Conozco que tengo derecho a conocer, actualizar, rectificar y suprimir mis datos, a revocar esta autorización y a presentar quejas ante la Superintendencia de Industria y Comercio, y que no estoy obligado(a) a autorizar el tratamiento de datos sensibles. La política de tratamiento de datos está disponible en la IPS.'),
      info(['Fecha', 'Lugar']),
      sign(['Titular o representante legal (y huella)'])
    ]
  },

  // ===================== ATENCIÓN AL USUARIO =====================
  {
    id: 'F-AU-01', group: 'Atención al usuario', title: 'Formato de peticiones, quejas, reclamos, sugerencias y felicitaciones (PQRSF)',
    reqs: ['AU-01'], norma: 'Ley 1755/2015 (derecho de petición); Ley 1751/2015; Res. 3100/2019', fuente: 'Formato institucional sugerido.',
    objetivo: 'Permitir que el usuario presente su manifestación por escrito.',
    sections: [
      info(['Fecha', 'Radicado No.', 'Nombre (opcional)', 'Documento', 'Teléfono', 'Correo electrónico']),
      check('Tipo de manifestación', ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación'], 'Marque X'),
      text('Descripción', 6),
      info(['¿Desea respuesta por escrito? (Sí/No)', 'Medio de respuesta preferido']),
      sign(['Usuario', 'Recibido por'])
    ]
  },
  {
    id: 'F-AU-02', group: 'Atención al usuario', title: 'Consolidado y seguimiento de PQRSF',
    reqs: ['AU-01', 'SIC-02'], norma: 'Ley 1755/2015 (término general de 15 días hábiles)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Controlar la oportunidad de respuesta y el análisis de las PQRSF.',
    landscape: true,
    sections: [
      table([c('Radicado', 0.8), c('Fecha recibido', 0.9), c('Tipo', 0.9, ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación']), c('Motivo', 2.2), c('Servicio', 1), c('Responsable', 1.1), c('Fecha respuesta', 0.9), c('Días hábiles', 0.7), c('¿A tiempo?', 0.7), c('Acción de mejora', 2)], {
        rows: 25, formula: { 7: (r) => `IF(OR(B${r}="",G${r}=""),"",NETWORKDAYS(B${r},G${r})-1)`, 8: (r) => `IF(H${r}="","",IF(H${r}<=15,"Sí","No"))` }
      })
    ]
  },
  {
    id: 'F-AU-03', group: 'Atención al usuario', title: 'Encuesta de satisfacción del usuario',
    reqs: ['AU-03', 'SIC-02'], norma: 'Res. 256/2016 (satisfacción global y recomendación de la IPS)', fuente: 'Incluye las dos preguntas base de los indicadores de experiencia de la atención de la Res. 256/2016.',
    objetivo: 'Medir la satisfacción y la experiencia de los usuarios con la atención.',
    sections: [
      info(['Fecha', 'Servicio', 'EPS / particular', 'Edad']),
      check('Califique (Muy buena, Buena, Regular, Mala, Muy mala)', [
        '¿Cómo calificaría su experiencia global respecto a los servicios de salud que ha recibido en esta IPS?',
        'Facilidad para conseguir la cita',
        'Puntualidad de la atención',
        'Trato del personal administrativo',
        'Trato y explicaciones del médico',
        'Limpieza y comodidad de las instalaciones',
        'Respeto por su privacidad'
      ], 'Calificación'),
      check('Recomendación', ['¿Recomendaría a sus familiares y amigos esta IPS? (Definitivamente sí, Probablemente sí, Probablemente no, Definitivamente no)'], 'Respuesta'),
      text('Comentarios o sugerencias', 3)
    ]
  },
  {
    id: 'F-AU-04', group: 'Atención al usuario', title: 'Acta de apertura del buzón de sugerencias',
    reqs: ['AU-01'], norma: 'Ley 1755/2015; Res. 3100/2019', fuente: 'Formato institucional sugerido.',
    objetivo: 'Dejar constancia de la apertura periódica del buzón y de las manifestaciones encontradas.',
    sections: [
      info(['Fecha', 'Hora', 'Número de formatos encontrados', 'Periodo']),
      table([c('No.', 0.5), c('Tipo', 1.2), c('Resumen', 4), c('Radicado asignado', 1.2)], { rows: 10 }),
      sign(['Abre el buzón', 'Testigo (usuario o asociación de usuarios)'])
    ]
  },

  // ===================== GESTIÓN AMBIENTAL =====================
  {
    id: 'F-AMB-01', group: 'Gestión ambiental', title: 'Registro diario de generación de residuos (RH1)',
    reqs: ['AMB-01', 'AMB-03'], norma: 'Decreto 780/2016 (gestión integral de residuos); Res. 591/2024 (mantiene en transición el Manual de la Res. 1164/2002)', fuente: 'Formulario RH1 del Manual de procedimientos para la gestión integral de residuos hospitalarios (Res. 1164/2002). Verifique el formato del nuevo manual cuando se expida.',
    objetivo: 'Pesar y registrar diariamente los residuos generados por tipo; base para el PGIRASA y el RUA/RESPEL.',
    landscape: true,
    sections: [
      info(['Mes / año', 'Responsable', 'Gestor externo de peligrosos', 'Tipo de generador'], 4),
      table([c('Día', 0.4), c('Aprovechables (kg)', 0.8), c('No aprovechables (kg)', 0.8), c('Orgánicos (kg)', 0.8), c('Biosanitarios (kg)', 0.8), c('Cortopunzantes (kg)', 0.8), c('Anatomopatológicos (kg)', 0.9), c('Químicos / fármacos (kg)', 0.8), c('Total peligrosos (kg)', 0.8), c('Total (kg)', 0.7), c('Firma', 0.9)], {
        prefill: Array.from({ length: 31 }, (_, i) => [String(i + 1)]), rows: 31,
        formula: { 8: (r) => `IF(COUNT(E${r}:H${r})=0,"",SUM(E${r}:H${r}))`, 9: (r) => `IF(COUNT(B${r}:H${r})=0,"",SUM(B${r}:H${r}))` },
        totals: true
      })
    ]
  },
  {
    id: 'F-AMB-02', group: 'Gestión ambiental', title: 'Inspección de la gestión interna de residuos',
    reqs: ['AMB-01', 'AMB-02', 'AMB-04'], norma: 'Decreto 780/2016; Res. 591/2024; Decreto 1076/2015 (RESPEL)', fuente: 'Lista de chequeo institucional.',
    objetivo: 'Verificar la segregación, ruta sanitaria, almacenamiento y entrega de residuos.',
    sections: [
      info(['Fecha', 'Responsable', 'Áreas inspeccionadas', 'Hora']),
      check('Criterios', [
        'Recipientes con el código de colores vigente y rotulados',
        'Bolsas del color y calibre adecuados',
        'Segregación correcta en la fuente (sin mezclas)',
        'Guardianes rotulados, con fecha y llenos máximo a 3/4',
        'Ruta sanitaria y horario definidos y señalizados',
        'Área de almacenamiento central exclusiva, ventilada, señalizada y con acceso restringido',
        'Elementos de protección personal para quien recolecta',
        'Manifiestos / actas de entrega del gestor externo archivados',
        'Certificados de tratamiento y disposición final',
        'Registro diario RH1 al día'
      ]),
      text('Hallazgos y acciones', 3),
      sign(['Inspeccionó', 'Responsable PGIRASA'])
    ]
  },

  // ===================== SG-SST =====================
  {
    id: 'F-SST-01', group: 'SG-SST', title: 'Autoevaluación de estándares mínimos SG-SST (hasta 10 trabajadores)',
    reqs: ['SST-01', 'SST-03', 'SST-04'], norma: 'Res. 0312/2019 (estándares mínimos, empresas de 10 o menos trabajadores, riesgo I, II o III); Decreto 1072/2015', fuente: 'Los 7 estándares mínimos del capítulo I de la Res. 0312/2019.',
    objetivo: 'Evaluar el cumplimiento de los estándares mínimos del SG-SST y definir el plan de mejora.',
    sections: [
      info(['Fecha', 'Número de trabajadores', 'Clase de riesgo', 'Responsable del SG-SST']),
      check('Estándares mínimos', [
        'Asignación de persona que diseña el SG-SST (con formación y licencia si aplica)',
        'Afiliación al Sistema de Seguridad Social Integral',
        'Capacitación en SST',
        'Plan anual de trabajo',
        'Evaluaciones médicas ocupacionales',
        'Identificación de peligros, evaluación y valoración de riesgos',
        'Medidas de prevención y control frente a peligros y riesgos identificados'
      ], 'Evidencia'),
      text('Plan de mejoramiento', 4),
      sign(['Responsable SG-SST', 'Representante legal'])
    ]
  },
  {
    id: 'F-SST-02', group: 'SG-SST', title: 'Matriz de identificación de peligros y valoración de riesgos (GTC 45)',
    reqs: ['SST-02'], norma: 'Decreto 1072/2015; Res. 0312/2019; Guía Técnica Colombiana GTC 45', fuente: 'Metodología GTC 45: NP = ND x NE; NR = NP x NC.',
    objetivo: 'Identificar los peligros de cada actividad, valorar el riesgo y definir controles.',
    landscape: true,
    sections: [
      para('ND (deficiencia): 10, 6, 2 o 0. NE (exposición): 4, 3, 2 o 1. NC (consecuencia): 100, 60, 25 o 10. Interpretación del NR: I (4000-600) no aceptable; II (500-150) no aceptable o aceptable con control específico; III (120-40) aceptable; IV (20) aceptable.'),
      table([c('Proceso / actividad', 1.6), c('Rutinaria', 0.6, YESNO), c('Peligro (descripción)', 1.6), c('Clasificación', 1.1, ['Biológico', 'Físico', 'Químico', 'Psicosocial', 'Biomecánico', 'Condiciones de seguridad', 'Fenómenos naturales']), c('Efectos posibles', 1.3), c('Controles existentes', 1.3), c('ND', 0.4, ['10', '6', '2', '0']), c('NE', 0.4, ['4', '3', '2', '1']), c('NP', 0.5), c('NC', 0.5, ['100', '60', '25', '10']), c('NR', 0.6), c('Nivel', 0.5), c('Medidas de intervención', 1.8)], {
        rows: 15,
        formula: { 8: (r) => `IF(COUNT(G${r}:H${r})=2,G${r}*H${r},"")`, 10: (r) => `IF(AND(I${r}<>"",J${r}<>""),I${r}*J${r},"")`, 11: (r) => `IF(K${r}="","",IF(K${r}>=600,"I",IF(K${r}>=150,"II",IF(K${r}>=40,"III","IV"))))` }
      })
    ]
  },
  {
    id: 'F-SST-03', group: 'SG-SST', title: 'Registro de entrega de elementos de protección personal',
    reqs: ['SST-01', 'PP-05'], norma: 'Decreto 1072/2015', fuente: 'Formato institucional sugerido.',
    objetivo: 'Dejar constancia de la entrega y capacitación en el uso de los EPP.',
    landscape: true,
    sections: [
      table([c('Fecha', 0.9), c('Trabajador', 2), c('Cargo', 1.3), c('Elemento entregado', 2), c('Cantidad', 0.7), c('Capacitado en su uso', 0.9, YESNO), c('Firma del trabajador', 1.5)], { rows: 20 })
    ]
  },

  // ===================== CAPACITACIÓN =====================
  {
    id: 'F-CAP-01', group: 'Capacitación', title: 'Plan institucional de capacitación (PIC)',
    reqs: ['CAP-01'], norma: 'Res. 3100/2019; Decreto 1072/2015', fuente: 'Formato institucional sugerido.',
    objetivo: 'Programar las capacitaciones del año con su población objetivo y responsables.',
    landscape: true,
    sections: [
      table([c('Tema', 2.5), c('Objetivo', 2), c('Población', 1.2), c('Facilitador', 1.2), c('Mes', 0.7, MONTHS), c('Horas', 0.5), c('Modalidad', 0.9, ['Presencial', 'Virtual', 'Mixta']), c('Norma relacionada', 1.3), c('Estado', 0.9, ['Programada', 'Realizada', 'Reprogramada', 'Cancelada'])], { rows: 15 })
    ]
  },
  {
    id: 'F-CAP-02', group: 'Capacitación', title: 'Listado de asistencia a capacitación',
    reqs: ['CAP-01', 'TH-07'], norma: 'Res. 3100/2019', fuente: 'Formato institucional sugerido.',
    objetivo: 'Registrar la asistencia a cada actividad de capacitación.',
    sections: [
      info(['Tema', 'Fecha', 'Facilitador', 'Duración (horas)', 'Lugar / modalidad', 'Código del PIC']),
      table([c('No.', 0.4), c('Nombre', 2.4), c('Documento', 1.2), c('Cargo', 1.4), c('Firma', 1.6)], { rows: 20 })
    ]
  },
  {
    id: 'F-CAP-03', group: 'Capacitación', title: 'Evaluación de conocimientos antes y después de la capacitación',
    reqs: ['CAP-02'], norma: 'Res. 3100/2019 (evaluación de la adherencia)', fuente: 'Formato institucional sugerido.',
    objetivo: 'Medir el aprendizaje y la efectividad de cada capacitación.',
    landscape: true,
    sections: [
      info(['Tema', 'Fecha', 'Facilitador', 'Nota mínima aprobatoria'], 2),
      table([c('Nombre', 2.4), c('Cargo', 1.3), c('Nota pre-test (0-100)', 1), c('Nota post-test (0-100)', 1), c('Mejora (puntos)', 0.9), c('¿Aprobó? (70 o más)', 0.9), c('Observaciones', 2)], {
        rows: 20, formula: { 4: (r) => `IF(COUNT(C${r}:D${r})=2,D${r}-C${r},"")`, 5: (r) => `IF(D${r}="","",IF(D${r}>=70,"Sí","No"))` }
      })
    ]
  },

  // ===================== DOCUMENTOS LEGALES =====================
  {
    id: 'F-LEG-01', group: 'Documentos legales', title: 'Control de documentos legales, pólizas y certificados',
    reqs: ['LEG-01', 'LEG-02', 'LEG-03', 'LEG-04', 'LEG-05', 'AMB-04', 'HAB-01'], norma: 'Res. 3100/2019 (capacidad técnico-administrativa); normas sectoriales de cada certificado', fuente: 'Formato institucional sugerido. La columna de días se calcula sola en Excel.',
    objetivo: 'Controlar la vigencia de los documentos legales para renovarlos a tiempo.',
    landscape: true,
    sections: [
      table([c('Documento', 2.4), c('Número', 1), c('Entidad que expide', 1.6), c('Fecha de expedición', 1), c('Fecha de vencimiento', 1), c('Días para vencer', 0.8), c('Alerta', 0.8), c('Responsable', 1.2), c('Ubicación', 1.2)], {
        prefill: [
          ['Certificado de existencia y representación legal (Cámara de Comercio)'], ['RUT'], ['Inscripción REPS / distintivo de habilitación'],
          ['Póliza de responsabilidad civil profesional'], ['Certificado de uso del suelo'], ['Certificado de inspección de bomberos'],
          ['Concepto sanitario'], ['Contrato con gestor externo de residuos peligrosos'], ['Registro como generador de RESPEL'],
          ['Contratos con EPS / aseguradores'], ['Contrato de mantenimiento de equipos biomédicos']
        ],
        rows: 15, formula: { 5: (r) => `IF(E${r}="","",E${r}-TODAY())`, 6: (r) => `IF(F${r}="","",IF(F${r}<0,"VENCIDO",IF(F${r}<=60,"RENOVAR","VIGENTE")))` }
      })
    ]
  }
];

export const formatsForRequirement = (code) => FORMATS.filter((f) => f.reqs.includes(code));
