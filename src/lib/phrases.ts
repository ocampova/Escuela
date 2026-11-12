/**
 * Frases sugeridas para el informe al hogar de preescolar, por ámbito.
 * Usan {nombre} para el nombre del niño o la niña. La docente las toca para agregarlas
 * al comentario y luego las ajusta a su gusto.
 */
export const PHRASES: Record<string, string[]> = {
  Socioafectiva: [
    "{nombre} se relaciona con respeto con sus compañeros y comparte los materiales.",
    "Expresa sus emociones con palabras y busca apoyo cuando lo necesita.",
    "Sigue las normas del aula y espera su turno.",
    "Está aprendiendo a resolver los conflictos conversando.",
    "Se integra con entusiasmo a los juegos grupales.",
  ],
  Psicomotriz: [
    "{nombre} recorta siguiendo líneas rectas y curvas.",
    "Toma el lápiz con pinza y controla mejor el trazo.",
    "Corre, salta y mantiene el equilibrio con seguridad.",
    "Está fortaleciendo la motora fina: recomendamos juegos con plastilina y pinzas en casa.",
    "Se viste y guarda sus cosas con autonomía.",
  ],
  Cognitiva: [
    "{nombre} clasifica objetos por color, forma y tamaño.",
    "Cuenta con seguridad y relaciona número y cantidad.",
    "Reconoce secuencias y patrones sencillos.",
    "Muestra curiosidad y hace preguntas para entender lo que observa.",
    "Está en proceso de reconocer los números: practicar contando objetos en casa le ayudará.",
  ],
  "Comunicación y lenguaje": [
    "{nombre} narra sus experiencias en orden y con claridad.",
    "Reconoce las letras de su nombre y algunas palabras.",
    "Disfruta escuchar cuentos y comenta lo que entendió.",
    "Amplía su vocabulario y se expresa con oraciones completas.",
    "Leer cuentos juntos cada noche fortalecerá su lenguaje.",
  ],
};

/** Frases generales para el mensaje a la familia. */
export const GENERAL_PHRASES = [
  "Ha sido un periodo de mucho crecimiento para {nombre}.",
  "Agradecemos el acompañamiento de la familia en este proceso.",
  "En casa, pueden apoyar conversando sobre lo que hizo en el día y leyendo cuentos juntos.",
  "Seguiremos trabajando juntos para fortalecer sus logros.",
];

/** Frases para las observaciones de la boleta de primaria. */
export const OBSERVATION_PHRASES = [
  "{nombre} muestra buena disposición y cumple con sus trabajos.",
  "Participa activamente en clase y colabora con sus compañeros.",
  "Recomendamos reforzar la lectura diaria en casa durante 15 minutos.",
  "Debe mejorar la entrega puntual de tareas.",
  "Felicitamos su esfuerzo y el avance logrado en el periodo.",
];

export const phrasesFor = (area: string) => PHRASES[area] ?? GENERAL_PHRASES;
