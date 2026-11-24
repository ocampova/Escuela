# Pulso

Mobile web app en español para resolver **qué comer, cuánto, cómo prepararlo y qué comprar**, y para llevar el seguimiento de peso, presión arterial y salud metabólica. Pensada para Costa Rica. Sirve para varias personas: cada una tiene su cuenta, su perfil y sus objetivos.

> Pulso es una herramienta de organización y registro. No diagnostica, no prescribe calorías y no cambia medicamentos.

## Cómo ejecutarla

Requiere **Node.js 22.5 o superior** y no usa dependencias de npm: el servidor usa `node:http`, `node:sqlite` y `node:crypto`.

```bash
cd pulso
npm start                      # http://localhost:3000
PORT=8080 npm start            # otro puerto
PULSO_DB=/ruta/pulso.db npm start
PULSO_SECURE_COOKIES=1 npm start   # detrás de HTTPS
npm test                       # 25 pruebas de lógica y API
npm run e2e                    # flujo completo en un teléfono emulado (requiere Playwright y Chromium)
```

Los datos se guardan en `pulso/data/pulso.db` (SQLite). Esa carpeta está excluida de git.

## Qué incluye

**Hoy.** Las tres comidas del día con su horario, el botón para marcarlas como hechas, accesos rápidos para registrar presión, peso y hábitos, el último registro de cada uno y el primer hito. También hay un acceso fijo a «Tengo síntomas ahora».

**Alimentación.** Menú de 7 días con 3 comidas y **16 recetas** ticas: gallo pinto, casado, olla de carne, arroz con pollo, picadillos, pescado al horno, crema de ayote, entre otras. Cada receta trae:
- ingredientes por persona, con el estado del peso indicado (crudo, cocido, seco o escurrido) y medidas caseras;
- pasos de preparación y tiempo aproximado;
- alternativas para quien tenga alergias;
- consejos para cocinar por tandas y para conservar los alimentos.

Una comida se puede cambiar desde una hoja inferior, que solo ofrece recetas compatibles con las alergias del perfil. La vista también muestra la guía del plato (½ verduras, ¼ proteína, ¼ almidón) y un plan de preparación para el fin de semana armado a partir del menú.

**Compras.** La lista se genera desde el menú y se recalcula sola cada vez que cambia una receta.
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
- CSP estricta para scripts (`script-src 'self'`). Sin recursos externos: las fuentes (Fraunces y Atkinson Hyperlegible Next) y los íconos (Lucide, licencia ISC) se sirven desde la propia app.
- **Sin sobrescrituras entre ventanas.** El perfil y las mediciones llevan versión, y un cambio sobre una versión vieja devuelve 409: la app avisa y carga la versión actual. Los cambios del menú y de la lista de compras se envían como operaciones que el servidor aplica sobre el estado más reciente, así dos ventanas no se pisan. Las demás pestañas se enteran por `BroadcastChannel` y al volver a la pestaña.
- Validación de fechas (incluidas fechas imposibles y futuras), rangos, unidades por tipo de examen y archivos importados (tipo, tamaño máximo de 2 MB y estructura).

## Limitaciones conocidas

- Los textos clínicos y los enlaces oficiales se redactaron a partir de las guías de NIDDK, AHA y NHLBI, pero **no se pudieron verificar en línea** desde el entorno de desarrollo, que no tenía acceso a esos sitios. Conviene que una persona profesional los revise antes de usar la app con más personas.
- No hay recuperación de contraseña por correo (no hay un servicio de correo configurado).
- No hay modo sin conexión: si falla la red, la app avisa que el cambio no se guardó y conserva lo escrito, pero no lo envía después de forma automática.
- La alerta de urgencia por síntomas se basa en lo que la persona marca. No reemplaza llamar al 911.
- Las cantidades de las recetas son orientativas (método del plato). No hay cálculo de calorías ni de macronutrientes.
- `node:sqlite` todavía es experimental en Node 22. Para varios servidores habría que pasar a PostgreSQL.
