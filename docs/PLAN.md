# Plataforma Escolar San Cayetano School: plan de producto (v0.3)

> Plan para una plataforma web que se use en el celular y en la computadora, para administrar
> los niveles de **San Cayetano School (Grecia, Costa Rica)** y la comunicación con las familias.

## 0. Contexto de la escuela

| Dato | Valor |
|---|---|
| Nombre | San Cayetano School (SCS) |
| Ubicación | Santa Gertrudis Norte, Grecia, Alajuela, Costa Rica |
| Estado | Escuela nueva: "¡Muy pronto en Grecia!", **matrícula 2026 abierta** |
| Lema | "Una nueva forma de aprender, crecer y descubrir" |
| Canales actuales | Facebook (~1K seguidores) y Messenger |
| Identidad visual | Verde oscuro (aro del logo); letras S naranja, C verde y S azul (`assets/logo-scs.webp`) |

**Oportunidad:** como la escuela apenas empieza, puede arrancar con la plataforma desde el
primer día, sin migrar datos ni romper hábitos (grupos de WhatsApp, papeles, hojas de Excel).

**Supuestos por confirmar:** empieza con preescolar (Materno/Interactivo II y Transición) y crecerá
hacia primaria (I y II ciclo); es privada y se rige por los programas del **MEP**; es probable que sea
bilingüe ("School").

---

## 1. Investigación: qué ofrecen las plataformas existentes

| Plataforma | Enfoque | Lo que hace bien | Lo que tomamos |
|---|---|---|---|
| **Brightwheel** | Preescolar y guarderías | Reporte diario (comida, siesta, actividades), asistencia con entrada y salida, fotos y video, mensajería central, cobros | Reporte diario, control de recogida, muro de fotos, cobros |
| **ClassDojo** | Primaria | Muy fácil de usar, mensajería entre padres y maestros con traducción, historias de clase | Simplicidad, historias del grupo, avisos |
| **Seesaw** | Portafolio de aprendizaje | La familia ve las evidencias del trabajo del alumno | Portafolio (fase 2) |
| **PowerSchool** | Sistema de información estudiantil grande | Matrícula, calificaciones, portal para familias, reportes | Expediente, calificaciones, boletas |
| **Xplor, Hola Classroom, Phidias, Geducar** (Latinoamérica y España) | Gestión escolar y comunicación | Portal para padres, pagos, tareas, chat, calendario | Portal único para padres, calendario, pagos |

**Lo que tienen casi todas, y por eso es lo básico:**
1. Comunicación central entre la escuela y las familias, con notificaciones.
2. Expediente de alumnos y familias por nivel, grado y grupo.
3. Asistencia.
4. Calendario.
5. Pagos (matrícula y mensualidades) y estados de cuenta.
6. Portal o app para padres.
7. Seguimiento académico.

**Lo que distingue a las de preescolar:** reporte diario, fotos del día y control de quién recoge al niño.

---

## 2. Usuarios y roles

| Rol | Puede hacer |
|---|---|
| **Dirección / Administración** | Todo: configurar el curso lectivo, niveles, grupos, usuarios y cobros; enviar avisos a toda la escuela; ver reportes |
| **Secretaría / Tesorería** | Matrícula, expedientes, registro de pagos (SINPE, transferencia, efectivo), estados de cuenta |
| **Docente** | Sus grupos: asistencia, reporte diario, fotos, avisos al grupo, mensajes con padres, evaluaciones |
| **Docente de materia especial** (inglés, música, educación física) | Ver y evaluar a los alumnos de varios grupos en su materia |
| **Padre, madre o encargado legal** | Ver a sus hijos (uno o varios, aunque estén en niveles distintos), avisos, chat con la docente, calendario, pagos, informes, autorizados para recoger |

Principio clave: **cada familia ve solo a sus hijos** y cada docente solo a sus grupos.

---

## 3. Alcance del MVP (primera versión para ofrecer a la escuela)

### M1. Estructura escolar (adaptada al MEP)
- **Curso lectivo** de febrero a diciembre (ej. 2026), con vacaciones de medio año y feriados nacionales.
- Niveles y grados configurables, por ejemplo:
  - **Preescolar:** Materno Infantil (Interactivo II) y Ciclo de Transición.
  - **Primaria:** I ciclo (1.° a 3.°) y II ciclo (4.° a 6.°).
- Secciones o grupos (ej. Transición A); asignar docentes guías y de materias especiales.
- **Periodos de evaluación configurables** (por defecto los del MEP para el año; se confirman con la escuela).

### M2. Alumnos y familias
- Expediente: nombre, **cédula** (o DIMEX o pasaporte si es extranjero), fecha de nacimiento, foto,
  sección, nacionalidad, alergias, condiciones médicas, tipo de sangre, póliza o seguro,
  contactos de emergencia, adecuaciones o apoyos educativos.
- Familias: un encargado puede tener varios hijos y un alumno varios encargados (padre, madre, encargado legal).
- **Personas autorizadas para recoger**, con foto y cédula.
- Documentos digitales: constancia de nacimiento, carné de vacunas, informes previos, consentimientos firmados.

### M3. Comunicación (lo central)
- **Avisos y circulares** para toda la escuela, un nivel, una sección o familias específicas, con PDF e imágenes.
- **Confirmación de lectura** ("enterado") y reporte de quién no lo ha leído.
- **Mensajería** de padres con la docente o la dirección, uno a uno, con horario de atención configurable.
- **Notificaciones push** (PWA) y correo de respaldo; WhatsApp en fase 2.
- **Autorizaciones y encuestas rápidas** (ej. permiso para gira educativa: Sí/No).
- **Bilingüe**: interfaz en español e inglés.

### M4. Vida diaria (preescolar)
- **Asistencia** por sección en un toque (presente, ausencia, tardía, justificada). Los padres pueden justificar desde la app.
- **Reporte diario** opcional: alimentación, descanso, ánimo, higiene, nota de la docente.
- **Muro de la sección**: fotos y videos de actividades, visibles solo para las familias de esa sección.
- **Registro de entrega y recogida**: quién recogió al niño y a qué hora.

### M5. Calendario
- Eventos, actos cívicos, feriados nacionales, reuniones de padres y festivales; por escuela, nivel o sección.
- Recordatorios automáticos.

### M6. Pagos y estado de cuenta (matrícula y mensualidades)

> **Actualización (folletos 2027):** los pagos se hacen por depósito o transferencia a una cuenta del **BCR** y las familias deben **reportarlos en la plataforma** con fecha y nombre del estudiante (ya implementado: «Reportar pago»). Queda por confirmar si la integración con el Banco Popular sigue en pie.
>
> **Dato de la directora:** la escuela está integrando el cobro con una **plataforma del Banco Popular**.
> Todavía no se sabe qué servicio es. Puede ser recaudación por convenio (el padre paga en Popular en Línea
> o en ventanilla con la cédula del alumno), débito automático o domiciliación, o cobro por SINPE.
> **La plataforma no reemplaza al banco: lo complementa.** El banco cobra; la plataforma lleva la
> cuenta de cada familia y se la muestra a los padres.

- Moneda **colones (CRC)**, con opción de dólares (USD).
- Conceptos: matrícula, mensualidad (normalmente de febrero a diciembre), materiales, uniformes, giras, actividades.
- Cargos mensuales automáticos, descuento por hermanos, becas, recargo por pago tardío.
- **Estado de cuenta para padres**: cargos, pagos, saldo pendiente, fecha de vencimiento e historial,
  por alumno y consolidado por familia. Con botón o instrucciones para pagar en el canal del Banco Popular.
- **Cómo llegan los pagos a la plataforma** (de lo más simple a lo más automático; el diseño soporta los tres):
  1. **Importar el reporte del banco** (Excel o CSV diario o semanal del Banco Popular): la plataforma lee
     cada pago, lo asocia al alumno por cédula o número de referencia y lo aplica a sus cargos. Lo que no
     coincida queda en una bandeja para revisarlo a mano.
  2. **Exportar los cobros pendientes al banco**: si el convenio requiere que la escuela le cargue al banco
     los montos por cobrar, la plataforma genera ese archivo en el formato que pida el banco.
  3. **Integración automática (API o webservice)**, si el Banco Popular la ofrece: el banco consulta el saldo
     en línea y avisa cada pago al instante.
- **Pagos fuera del banco**: SINPE Móvil, transferencia o efectivo; el padre sube el comprobante y Tesorería lo confirma.
- **Recordatorios automáticos** antes del vencimiento y de saldo vencido; reporte de morosidad para la dirección.
- Recibo digital de cada pago aplicado.
- *Fase 2:* factura electrónica de Hacienda (TRIBU-CR) generada automáticamente.

### M7. Seguimiento académico (básico)
- **Preescolar**: informe descriptivo o cualitativo del desarrollo por periodo, según el programa del MEP.
- **Primaria** (cuando abra): calificaciones de 1 a 100 por asignatura y periodo, con los componentes de evaluación
  configurables según el Reglamento de Evaluación de los Aprendizajes del MEP (trabajo cotidiano, tareas,
  pruebas, etc.); **informe al hogar en PDF**.

### M8. Panel de la dirección
- Resumen: asistencia del día, avisos sin leer, morosidad, próximos eventos, cupos de matrícula.
- Exportar a Excel o PDF (útil para reportes al MEP).

### M9. Matrícula en línea *(muy valiosa ahora que la escuela abre)*
- Formulario público de preinscripción para nuevas familias, con documentos adjuntos.
- Lista de interesados con estados (contactado, visita, aceptado, matriculado), que pasan a ser alumnos sin volver a digitar.

### Fuera del MVP (fase 2 en adelante)
Pago con tarjeta en línea · Factura electrónica · Portafolio de evidencias · Tareas · Transporte · Enfermería ·
App nativa en las tiendas · Integración con WhatsApp Business · Traducción automática de mensajes.

---

## 4. Requisitos no funcionales
- **Primero el celular**: pensada para el teléfono de los padres, con un panel cómodo en computadora para la escuela.
- **PWA**: se instala desde el navegador y manda notificaciones; al inicio no hace falta publicarla en App Store ni Google Play.
- **Privacidad de menores**: cumplir la **Ley 8968** (Protección de la Persona frente al Tratamiento de sus
  Datos Personales) y los lineamientos de la **PRODHAB**. Consentimiento informado de los padres,
  consentimiento específico para fotos, fotos visibles solo para la sección y datos de salud tratados como sensibles.
- **Seguridad**: acceso con contraseña o enlace mágico por correo, permisos por rol, bitácora de acciones, respaldos diarios.
- **Varias escuelas (multi-tenant)** desde el diseño, para poder ofrecerla a otras escuelas después.
- Español e inglés; zona horaria America/Costa_Rica; formato de cédula costarricense.
- Imagen de la escuela: logo y colores de SCS.

---

## 5. Arquitectura técnica propuesta

| Capa | Propuesta | Por qué |
|---|---|---|
| Frontend y backend | **Next.js (React, TypeScript)** | Un solo código para web y celular (PWA), rápido de desarrollar |
| Interfaz | Tailwind CSS y shadcn/ui | Componentes accesibles y responsivos; colores SCS |
| Base de datos | **PostgreSQL** (Supabase) | Relacional y sólida; seguridad por fila (RLS) para separar datos por familia y escuela |
| Autenticación | Supabase Auth | Correo, enlace mágico y código de un solo uso |
| Archivos (fotos y documentos) | Supabase Storage con URLs firmadas | Las fotos de los niños nunca quedan públicas |
| Notificaciones | Web Push y correo (Resend) | Sin costo por mensaje |
| Idiomas | next-intl | Español e inglés |
| Despliegue | Vercel y Supabase | Costo bajo al inicio y fácil de escalar |

### Modelo de datos inicial (simplificado)

```
School ─┬─ SchoolYear (curso lectivo) ─ Term (periodo)
        ├─ Level ─ Grade ─ Section ─┬─ SectionTeacher ─ User(teacher)
        │                            └─ Enrollment ─ Student
        ├─ User (role: admin|staff|teacher|guardian)
        ├─ Student ─┬─ StudentGuardian ─ User(guardian)
        │           ├─ AuthorizedPickup
        │           ├─ MedicalInfo / Document / Consent
        │           ├─ Attendance (date, status)
        │           ├─ DailyReport
        │           └─ Evaluation (term, subject/area, score|descriptor, notes)
        ├─ Applicant (preinscripción) ─ ApplicantDocument
        ├─ Announcement ─ AnnouncementAudience / AnnouncementRead
        ├─ Conversation ─ Message
        ├─ Post (muro) ─ Media
        ├─ Event (calendario, audiencia)
        ├─ FeeConcept ─ Charge (student, month, amount, currency, due_date, status)
        │                  └─ PaymentAllocation ─ Payment (method: bank_popular|sinpe|transfer|cash,
        │                                                  bank_reference, receipt, source: import|api|manual)
        └─ BankImport (archivo del banco) ─ BankImportLine (matched|unmatched)
```

---

## 6. Plan de trabajo por fases

La escuela abre con el curso lectivo 2026 (febrero), así que conviene tener al menos **comunicación y
expedientes listos para el inicio de clases** y mostrar la propuesta durante el periodo de matrícula.

| Fase | Contenido | Duración estimada* |
|---|---|---|
| **0. Validación** | Reunión con la dirección: confirmar necesidades, niveles, cupos, forma de cobro e idioma | 1 semana |
| **1. Prototipo para mostrar** ✅ | Hecho: app Next.js + PostgreSQL con vista de familias (inicio, avisos con Enterado, calendario, estado de cuenta, ficha del hijo) y de escuela (panel, asistencia, avisos con seguimiento, alumnos, calendario, cobros) | 1–2 semanas |
| **2. Base** ✅ | Hecho: configuración (niveles, secciones, personal), alumnos y familias editables, importación desde Excel, invitaciones y contraseñas, matrícula en línea con documentos | 2–3 semanas |
| **3. Comunicación** | Avisos con confirmación, mensajería, notificaciones, calendario | 2–3 semanas |
| **4. Vida diaria** | Asistencia, reporte diario, muro de fotos, recogida | 2 semanas |
| **5. Pagos** | Mensualidades, cargos, estado de cuenta, importación del reporte del Banco Popular, comprobantes SINPE | 2–3 semanas |
| **6. Piloto** | Una sección de preescolar la usa a diario; se ajusta con lo que digan | 4 semanas |
| **7. Académico y fase 2** | Informes al hogar, calificaciones de primaria, factura electrónica | Según prioridades |

\*Estimado trabajando a tiempo parcial con ayuda de Claude.

---

## 7. Preguntas para la escuela (antes de construir)
1. ¿Qué niveles abren en 2026 (Materno, Transición, primaria)? ¿Cuántas secciones y cupos?
2. ¿Es bilingüe? ¿En qué idioma prefieren comunicarse con las familias?
3. ¿Cómo piensan comunicarse con los padres (WhatsApp, Messenger, cuaderno)? ¿Qué les preocupa más?
4. **Banco Popular:** ¿qué servicio contrataron exactamente (recaudación por convenio, débito automático, SINPE)?
   ¿Con qué dato identifica el banco al alumno (cédula, código)? ¿El banco entrega un reporte de pagos
   (formato y frecuencia) o tiene API? ¿La escuela debe enviarle al banco los montos por cobrar?
   ¿Cobran en colones o dólares? ¿Emiten factura electrónica?
5. ¿Habrá descuentos por hermanos, becas o recargos?
6. ¿Qué datos médicos y de recogida necesitan de cada alumno?
7. ¿Quieren reporte diario en preescolar o solo avisos?
8. ¿Qué formato de informe al hogar usarán?
9. ¿Quién la administraría en el día a día?
10. ¿Cuál es su política de fotos y redes sociales con los niños?

---

## 8. Siguiente paso sugerido
Construir un **prototipo navegable** con la imagen de San Cayetano School (logo y colores) y datos de ejemplo:
vista de padre en el celular (avisos, chat, calendario, estado de cuenta) y vista de la escuela en
computadora (secciones, alumnos, enviar aviso, asistencia). Sirve para mostrarlo a la dirección y validarlo
antes de construir el resto.
