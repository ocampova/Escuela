# Plataforma Escolar — Plan de producto (v0.1)

> Documento de planeación para una plataforma web (responsiva, funciona en celular y computadora)
> que administre los distintos niveles de la escuela y la comunicación con los padres.
>
> **Supuestos** (por confirmar con la escuela): escuela privada en México, empieza con
> preescolar (kinder) y puede crecer a primaria; personal administrativo pequeño; las familias
> hoy se comunican por WhatsApp y Facebook.

---

## 1. Investigación: qué ofrecen las plataformas existentes

| Plataforma | Enfoque | Lo que hace bien | Lo que tomamos |
|---|---|---|---|
| **Brightwheel** | Preescolar / guarderías | Reporte diario (comida, siesta, actividades), asistencia con check-in/out, fotos y video, mensajería centralizada, cobros | Reporte diario, check-in de recogida, muro de fotos, cobranza |
| **ClassDojo** | Primaria | Muy fácil de usar, mensajería padre‑maestro con traducción, historias de clase, retroalimentación de conducta | Simplicidad, historias del grupo, avisos |
| **Seesaw** | Portafolio de aprendizaje | Evidencias de trabajos del alumno visibles para la familia | Portafolio/evidencias (fase 2) |
| **PowerSchool** | SIS (sistema de información estudiantil) grande | Inscripción, calificaciones, portal de familias, reportes | Expediente del alumno, calificaciones, boletas |
| **Xplor, Hola Classroom, Phidias, Geducar, Growappy** (LatAm/España) | Gestión escolar + comunicación | Portal de padres, pagos, tareas, chat, calendario | Portal único para padres, calendario, pagos |
| **Sistemas mexicanos (p. ej. OpenEduCat MX)** | Cumplimiento SEP | CURP, escala 0–10, boletas en formato oficial | Campos CURP, ciclo escolar SEP, boleta (primaria) |

**Patrones comunes** (lo que *todas* tienen y por lo tanto es "lo básico"):
1. Comunicación centralizada escuela ↔ familias (avisos + mensajes) con notificaciones.
2. Expediente de alumnos y familias, organizado por nivel/grado/grupo.
3. Asistencia.
4. Calendario de eventos.
5. Pagos/colegiaturas y estados de cuenta.
6. Portal/app para padres.
7. Seguimiento académico (en preescolar: reportes cualitativos; en primaria: calificaciones).

**Diferenciadores para preescolar:** reporte diario, fotos del día, control de quién recoge al niño.

---

## 2. Usuarios y roles

| Rol | Puede hacer |
|---|---|
| **Administrador / Dirección** | Todo: configurar ciclo escolar, niveles, grupos, usuarios, colegiaturas, enviar avisos a toda la escuela, ver reportes |
| **Control escolar / Caja** | Inscripciones, expedientes, registro de pagos, estados de cuenta |
| **Maestra(o)** | Sus grupos: asistencia, reporte diario, fotos, avisos al grupo, mensajes con padres, evaluaciones |
| **Padre / Madre / Tutor** | Ver a sus hijos (uno o varios, incluso en distintos niveles), recibir avisos, chatear con la maestra, ver calendario, pagos, reportes; autorizar personas para recoger |

Principio clave: **cada padre solo ve información de sus propios hijos**; cada maestra solo la de sus grupos.

---

## 3. Alcance del MVP (versión 1 para ofrecer a la escuela)

### M1. Estructura escolar
- Ciclo escolar (ej. 2027‑2028), niveles (Preescolar, Primaria…), grados (1°, 2°, 3° de kinder) y grupos (A, B).
- Asignación de maestras a grupos.

### M2. Alumnos y familias
- Expediente: nombre, CURP, fecha de nacimiento, foto, grupo, alergias / condiciones médicas, tipo de sangre, contactos de emergencia.
- Familias: un tutor puede tener varios hijos; un alumno puede tener varios tutores.
- **Personas autorizadas para recoger** (con foto e identificación).
- Documentos digitales (acta de nacimiento, cartilla de vacunación, comprobante de domicilio).

### M3. Comunicación (el corazón de la plataforma)
- **Avisos/circulares** segmentados: toda la escuela, un nivel, un grupo o familias específicas. Con adjuntos (PDF, imágenes).
- **Confirmación de lectura** ("enterado") y estadística de quién lo leyó.
- **Mensajería** padre ↔ maestra / dirección (1 a 1), con horario de atención configurable.
- **Notificaciones push** (PWA) y correo electrónico como respaldo.
- **Encuestas / autorizaciones rápidas** (ej. permiso para excursión: Sí/No).

### M4. Vida diaria (preescolar)
- **Asistencia** por grupo en un toque (presente / falta / retardo / justificada). Los padres pueden avisar una falta desde la app.
- **Reporte diario** opcional: cómo comió, siesta, ánimo, baño, nota de la maestra.
- **Muro del grupo**: fotos y videos de actividades (visible solo para familias del grupo).
- **Registro de entrega/recogida**: quién recogió y a qué hora.

### M5. Calendario
- Eventos escolares, días festivos / suspensiones SEP, juntas, festivales; por escuela, nivel o grupo.
- Recordatorios automáticos.

### M6. Pagos y colegiaturas
- Conceptos: inscripción, colegiatura mensual, materiales, uniformes, eventos.
- Cargos automáticos por mes, descuentos/becas, recargos por pago tardío.
- Estado de cuenta para padres; registro de pagos en caja (efectivo / transferencia).
- Recordatorios de pago. *(Pago en línea con tarjeta/OXXO/SPEI vía Stripe, Mercado Pago u Openpay en fase 2.)*

### M7. Seguimiento académico (básico)
- Preescolar: evaluaciones cualitativas por campo formativo (Nueva Escuela Mexicana) y observaciones por periodo.
- Primaria (cuando aplique): calificaciones 0–10 por materia y periodo, boleta en PDF.

### M8. Panel de dirección
- Resumen: asistencia del día, avisos no leídos, adeudos, próximos eventos.
- Exportar a Excel/PDF.

### Fuera del MVP (fase 2+)
Pagos en línea · Admisiones/preinscripción en línea · Portafolio de evidencias · Facturación CFDI · Tareas · Transporte · Enfermería · App nativa en tiendas · Traducción automática · Integración con WhatsApp Business.

---

## 4. Requisitos no funcionales
- **Móvil primero**: diseñada para el celular de los padres; panel cómodo en computadora para la escuela.
- **PWA** (instalable desde el navegador, con notificaciones), sin pasar por App Store al inicio.
- **Privacidad de menores**: aviso de privacidad conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares; consentimiento para fotos; fotos solo visibles para el grupo; datos médicos como datos sensibles.
- **Seguridad**: inicio de sesión con contraseña o enlace mágico por correo/SMS, permisos por rol, bitácora de acciones, respaldos diarios.
- **Multi‑escuela (multi‑tenant)** desde el diseño, para poder ofrecerla a otras escuelas después.
- Español como idioma principal; zona horaria de México.

---

## 5. Arquitectura técnica propuesta

| Capa | Propuesta | Por qué |
|---|---|---|
| Frontend + backend | **Next.js (React, TypeScript)** | Una sola base de código para web y móvil (PWA), SSR, rápido de desarrollar |
| UI | Tailwind CSS + shadcn/ui | Componentes accesibles, responsivos |
| Base de datos | **PostgreSQL** (Supabase o Neon) | Relacional, sólida; Row Level Security para aislar datos por familia/escuela |
| Autenticación | Supabase Auth (o Auth.js) | Correo, enlace mágico, OTP |
| Archivos (fotos, documentos) | Supabase Storage / S3 con URLs firmadas | Fotos privadas, no públicas |
| Notificaciones | Web Push + correo (Resend) | Sin costo por mensaje |
| Despliegue | Vercel + Supabase | Costo bajo al inicio, escala fácil |

### Modelo de datos inicial (simplificado)

```
School ─┬─ SchoolYear ─ Level ─ Grade ─ Group ─┬─ GroupTeacher ─ User(teacher)
        │                                      └─ Enrollment ─ Student
        ├─ User (role: admin|staff|teacher|guardian)
        ├─ Student ─┬─ StudentGuardian ─ User(guardian)
        │           ├─ AuthorizedPickup
        │           ├─ MedicalInfo / Document
        │           ├─ Attendance (date, status)
        │           ├─ DailyReport
        │           └─ Evaluation (period, field/subject, value, notes)
        ├─ Announcement ─ AnnouncementAudience / AnnouncementRead
        ├─ Conversation ─ Message
        ├─ Post (muro) ─ Media
        ├─ Event (calendario, audiencia)
        └─ FeeConcept ─ Charge (student, month, amount) ─ Payment
```

---

## 6. Plan de trabajo por fases

| Fase | Contenido | Duración estimada* |
|---|---|---|
| **0. Validación** | Reunión con dirección; confirmar necesidades, niveles, cuántos alumnos, cómo cobran hoy | 1–2 semanas |
| **1. Base** | Proyecto, autenticación, roles, estructura escolar, alumnos y familias | 2–3 semanas |
| **2. Comunicación** | Avisos con confirmación, mensajería, notificaciones push, calendario | 3 semanas |
| **3. Vida diaria** | Asistencia, reporte diario, muro de fotos, recogida | 2–3 semanas |
| **4. Pagos** | Colegiaturas, cargos, registro de pagos, estados de cuenta | 2–3 semanas |
| **5. Piloto** | Un grupo de kinder usándola; ajustes con retroalimentación | 4 semanas |
| **6. Académico + fase 2** | Evaluaciones, boletas, pagos en línea | según prioridades |

\*Estimado trabajando a tiempo parcial con ayuda de Claude.

---

## 7. Preguntas para la escuela (antes de construir)
1. ¿Qué niveles tienen hoy y cuáles planean abrir? ¿Cuántos alumnos y grupos?
2. ¿Cómo se comunican hoy con los padres (WhatsApp, cuaderno, circulares impresas)? ¿Qué les duele más?
3. ¿Cómo cobran colegiaturas? ¿Emiten factura? ¿Tienen recargos o becas?
4. ¿Qué información médica y de recogida necesitan del alumno?
5. ¿Quieren reporte diario para kinder, o solo avisos?
6. ¿Qué formato de evaluación usan en preescolar?
7. ¿Quién la administraría en el día a día?
8. ¿Política de fotos de los niños?

---

## 8. Siguiente paso sugerido
Construir un **prototipo navegable** (Fase 1 + avisos) con datos de ejemplo para mostrarlo a la dirección
y validar antes de invertir en las demás fases.
