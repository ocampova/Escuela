# Pulso

**Coach metabólico** en español, como app web para el teléfono: una guía completa para progresar en tres objetivos, **bajar de peso, mejorar la resistencia a la insulina y bajar la presión arterial**. Combina una ruta de 12 semanas, hábitos diarios, un motor de recomendaciones basado en tus datos reales, alimentación tica con lista de compras, y seguimiento clínico. Pensada para Costa Rica y para varias personas: cada una tiene su cuenta, su perfil y sus objetivos.

## El coach

- **Objetivos:** al empezar elegís uno o más (peso, insulina, presión). Las recomendaciones se ajustan a esa elección.
- **Ruta de 12 semanas, un cambio a la vez:**
  1. Punto de partida (mediciones de base)
  2. El plato
  3. Lo que tomás
  4. Caminar después de comer
  5. Menos sal
  6. 150 minutos por semana
  7. Fuerza
  8. Fibra y proteína
  9. Sueño
  10. Estrés y presión
  11. Comer fuera y fines de semana
  12. Revisión y siguiente etapa

  Cada semana explica por qué y cómo, y trae una fuente oficial. Avanzás cuando te sentís listo: no hay fechas límite.
- **Checklist diario:** los hábitos de cada semana se suman a un checklist que se marca con un toque.
- **Hoy:** muestra el foco de la semana, el checklist, «Tu próximo paso» (hasta 3 acciones priorizadas) y «Lo que muestran tus datos».
- **Recomendaciones, todas a partir de registros reales:**
  - semana de presión: 2 lecturas en la mañana y 2 en la noche durante 7 días;
  - recordatorio de pesarse una vez por semana;
  - exámenes de glucosa o HbA1c faltantes o con más de 6 meses;
  - minutos de actividad frente a la meta de 150 y días de fuerza frente a la meta de 2;
  - sueño de menos de 7 horas;
  - tendencia de peso: avisa si es demasiado rápida (más de 1 kg por semana) o si se estancó;
  - promedio de presión de 7 días con 6 o más lecturas, comparado con el inicio;
  - cambios en la HbA1c.
- **Revisión semanal:** compara los últimos 7 días con los 7 anteriores. Muestra logros, el hábito que más costó y permite avanzar de etapa o quedarse en la misma.
- **Progreso › General:** una tarjeta por objetivo (peso con el hito, presión inicial y actual, HbA1c y glucosa) y la lectura del coach.
- **Actividad física:** minutos, tipo (caminar, fuerza, cardio u otra), intensidad y si fue después de comer.

Las observaciones describen datos y sugieren conversar con el médico; nunca diagnostican ni cambian medicamentos.

## Alimentación y seguimiento

> Pulso es una herramienta de organización y registro. No diagnostica, no prescribe calorías y no cambia medicamentos.

## Cómo ejecutarla

Requiere **Node.js 22.5 o superior** y no usa dependencias de npm: el servidor usa `node:http`, `node:sqlite` y `node:crypto`.

```bash
cd pulso
npm start                      # http://localhost:3000
PORT=8080 npm start            # otro puerto
PULSO_DB=/ruta/pulso.db npm start
PULSO_SECURE_COOKIES=1 npm start   # detrás de HTTPS
npm test                       # 38 pruebas de lógica, coach y API
npm run e2e                    # flujo completo en un teléfono emulado (requiere Playwright y Chromium)
```

Los datos se guardan en `pulso/data/pulso.db` (SQLite). Esa carpeta está excluida de git.

### Qué incluye

**Hoy.** Las tres comidas del día con su horario, el botón para marcarlas como hechas, accesos rápidos para registrar presión, peso y hábitos, el último registro de cada uno y el primer hito. También hay un acceso fijo a «Tengo síntomas ahora».

**Alimentación.** Menú de 7 días con 3 comidas y **16 recetas** ticas: gallo pinto, casado, olla de carne, arroz con pollo, picadillos, pescado al horno, crema de ayote, entre otras. Cada receta trae:
- ingredientes por persona, con el estado del peso indicado (crudo, cocido, seco o escurrido) y medidas caseras;
- pasos de preparación y tiempo aproximado;
- alternativas para quien tenga alergias;
- consejos para cocinar por tandas y para conservar los alimentos.

Una comida se puede cambiar desde una hoja inferior, que solo ofrece recetas compatibles con las alergias del perfil. La vista también muestra la guía del plato (½ verduras, ¼ proteína, ¼ almidón) y un plan de preparación para el fin de semana armado a partir del menú.

**Compras** (dentro de «Comer»). La lista se genera desde el menú y se recalcula sola cada vez que cambia una receta.
- Agrupa los ingredientes por categoría, en el orden en que se recorre una feria.
- Multiplica las cantidades por el número de adultos.
- Convierte los pesos cocidos a peso de compra (arroz y frijoles en seco, pollo en crudo) y explica la conversión en «¿Cómo se calculó?».
- Redondea hacia arriba.
- Permite marcar productos como comprados, compartir la lista, descargarla en .txt e imprimirla.
- No muestra precios.

**Progreso.** Peso, con el hito y su avance; cintura; sueño y hábitos. Cada gráfico es un SVG con tooltip táctil, promedios, número de mediciones y rango de fechas. Cuando no hay datos, el espacio vacío invita a registrar.

**Salud.**
- Presión arterial: sistólica, diastólica, pulso, brazo y síntomas.
- Promedios de 7 y 30 días, gráfico y categoría según la AHA, presentada como referencia y no como diagnóstico.
- Laboratorios (glucosa, HbA1c, insulina, perfil de lípidos u otros): se conserva la unidad del informe y el contexto de la muestra (en ayunas, 2 horas después de comer o en cualquier momento) y su origen.
- Guía para medir la presión en casa y enlaces a NIDDK, AHA, American Stroke Association, NHLBI y FoodSafety.gov.

**Seguridad clínica.**
- Si se indican síntomas de alarma presentes *ahora* (dolor de pecho, falta de aire, desmayo, síntomas neurológicos, entre otros), aparece un aviso de urgencia con el botón para llamar al 911, sea cual sea la cifra de presión.
- Una lectura de 180/120 o más muestra los pasos a seguir: descansar unos 5 minutos y volver a medir; si sigue alta sin síntomas, contactar al médico el mismo día; si hay síntomas, llamar al 911.
- Los síntomas ya pasados, o anotados en una medición de hace más de una hora, quedan como registro histórico y no disparan la alerta de urgencia.

**Perfil y datos.**
- La bienvenida tiene 4 pasos: datos personales, alergias y preferencias, hogar y horarios, primer hito. Estatura, actividad, diagnósticos y medicamentos son opcionales y nunca se inventan.
- El primer hito propuesto es 5% del peso inicial. Se puede editar entre 1% y 15% y no tiene fecha.
- Exportación de las mediciones en CSV, con protección contra fórmulas en hojas de cálculo.
- Respaldo completo en JSON. Para restaurar, primero se valida el archivo y se muestra una vista previa.
- Resumen imprimible para llevar a la consulta.
- Opción para eliminar la cuenta junto con todos sus datos.

## Seguridad y datos

- Contraseñas guardadas con scrypt. Las sesiones usan un token aleatorio, del que solo se guarda el hash, en una cookie `HttpOnly; SameSite=Lax`. El inicio de sesión tiene límite de intentos.
- Cada consulta filtra por `user_id`. Las pruebas verifican que una cuenta no pueda leer, editar ni borrar los registros de otra.
- Protección CSRF: toda escritura exige el encabezado `X-Pulso: 1` y un `Origin` igual al del servidor.
- CSP estricta para scripts (`script-src 'self'`). Sin recursos externos: la fuente (Atkinson Hyperlegible Next, diseñada para baja visión) y los íconos (Lucide, licencia ISC) se sirven desde la propia app; el sprite de íconos se incrusta en la página para que no desaparezca sin conexión.
- **Sin sobrescrituras entre ventanas.** El perfil y las mediciones llevan versión, y un cambio sobre una versión vieja devuelve 409: la app avisa y carga la versión actual. Los cambios del menú y de la lista de compras se envían como operaciones que el servidor aplica sobre el estado más reciente, así dos ventanas no se pisan. Las demás pestañas se enteran por `BroadcastChannel` y al volver a la pestaña.
- Validación de fechas (incluidas fechas imposibles y futuras), rangos, unidades por tipo de examen y archivos importados (tipo, tamaño máximo de 2 MB y estructura).

## Limitaciones conocidas

- Los textos clínicos y los enlaces oficiales se redactaron a partir de las guías de NIDDK, AHA y NHLBI, pero **no se pudieron verificar en línea** desde el entorno de desarrollo, que no tenía acceso a esos sitios. Conviene que una persona profesional los revise antes de usar la app con más personas.
- No hay recuperación de contraseña por correo (no hay un servicio de correo configurado).
- No hay modo sin conexión: si falla la red, la app avisa que el cambio no se guardó y conserva lo escrito, pero no lo envía después de forma automática.
- La alerta de urgencia por síntomas se basa en lo que la persona marca. No reemplaza llamar al 911.
- Las cantidades de las recetas son orientativas (método del plato). No hay cálculo de calorías ni de macronutrientes.
- `node:sqlite` todavía es experimental en Node 22. Para varios servidores habría que pasar a PostgreSQL.

## Skills de diseño

`pulso/.claude/skills/` incluye los mismos skills de diseño del repositorio principal: impeccable, frontend-design, design-taste-frontend y emilkowalski-motion. Sus orígenes están en `skills-lock.json`. Así siguen disponibles si Pulso se mueve a un repositorio propio.

## Diseño

- `PRODUCT.md`: usuario, propósito, restricciones clínicas y principios de producto (impeccable `init`).
- `DESIGN.md` y `.impeccable/design.json`: sistema visual «El sendero acompañado». Incluye tokens, tipografía, componentes y el camino de 12 hitos (impeccable `document`).
- Comprobar el CSS contra el sistema documentado: `./.claude/skills/impeccable/scripts/impeccable detect --json public`.

## Producción (Railway)

- URL: https://pulso-web-production-be5a4738.up.railway.app
- Proyecto `pulso` › servicio `pulso-web`. Despliega solo cuando cambia algo dentro de `pulso/` en la rama `claude/pensive-goldberg-sst7em` (directorio raíz `/pulso`, Node 22, builder Railpack).
- Disco persistente `pulso-datos` (5 GB) montado en `/data`. La base de datos está en `/data/pulso.db`.
- Variables: `PULSO_DB=/data/pulso.db`, `PULSO_SECURE_COOKIES=1`, `PULSO_TRUST_PROXY=1`, `NODE_ENV=production`.
- Chequeo de salud: `/api/health`.
- Respaldos: activalos en Railway › pulso-web › volumen › Backups (diarios). Además, cada persona puede descargar su respaldo JSON desde Perfil.
