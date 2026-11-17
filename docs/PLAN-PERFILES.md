# Revisión de funcionalidad, permisos y privacidad por perfil

Revisión del 17 de noviembre de 2026, sobre el código actual. Abarca:
- **Permisos:** las 50 páginas, las 11 descargas de archivos y las 21 colecciones de acciones del servidor.
- **Privacidad:** se compara con la Ley 8968.
- **Funcionalidad:** se evalúa con el criterio de qué necesita cada perfil para hacer su trabajo.

## 1. Permisos: qué está bien

- **Sesión y perfil en cada página y acción.** Todas verifican la sesión y el perfil en el servidor. El menú oculto no es la única barrera: escribir la dirección no da acceso.
- **Datos limitados a la escuela y a lo propio.** Cada consulta filtra por la escuela del usuario. La familia solo ve a sus hijos (ficha, recibos, boletas, fotos, avisos y autorizaciones), y la docente solo sus secciones (alumnos, asistencia, notas, fotos, mensajes, reportes).
- **Archivos privados:** imágenes de avisos, fotos, comprobantes de pago, documentos de matrícula y boletas. Cada uno valida quién lo pide.
- **Contraseñas y sesión:**
  - Contraseñas con bcrypt.
  - Enlaces de invitación y de cambio de contraseña de un solo uso y con vencimiento (se guardan cifrados).
  - Cookie de sesión `httpOnly`, `sameSite` y `secure`.
  - Una cuenta desactivada pierde el acceso de inmediato.
- **Tarea automática de recordatorios de cobro:** protegida con su propia clave.

## 2. Permisos y privacidad: qué hay que corregir

| # | Hallazgo | Riesgo | Propuesta |
|---|---|---|---|
| P1 | **No hay límite de intentos al entrar.** Se pueden probar contraseñas sin freno. | Alto | Bloquear por 15 minutos tras 5 intentos fallidos por correo y por IP. |
| P2 | **El formulario público de matrícula** solo tiene una trampa simple para robots. Alguien podría llenar la base con solicitudes y archivos. | Medio | Límite por IP (por ejemplo, 5 por hora), tamaño total por solicitud y aviso a Secretaría si llegan muchas seguidas. |
| P3 | **Datos de demostración en producción.** Con `SEED_DEMO=true` se muestran las cuentas de prueba en la entrada y existen cuentas con la contraseña `demo1234`. | Alto al lanzar | Lista de lanzamiento: base nueva, sin `SEED_DEMO` y cuentas reales. Además, un aviso visible en el panel si el modo demostración sigue activo en producción. |
| P4 | **Derechos de la Ley 8968 (acceso, rectificación, supresión).** No hay forma de entregarle a una familia sus datos ni de borrar los de una familia que se fue. | Medio, legal | Dirección: "Exportar datos de la familia" (PDF o Excel) y "Eliminar datos" para alumnos retirados, conservando solo lo contable que exige la ley. |
| P5 | **Documentos de matrícula** (copias de cédula, constancias) se guardan sin plazo, aunque la solicitud se rechace. | Medio | Borrarlos automáticamente 6 meses después de rechazada o archivada la solicitud. Al matricular, pasan al expediente. |
| P6 | **Las notificaciones muestran datos en la pantalla bloqueada** ("Mateo fue marcado ausente", el inicio de un mensaje). | Bajo a medio | Opción en el perfil: "Notificaciones discretas", que muestran solo "Tiene un aviso nuevo de la escuela". |
| P7 | **Sesiones de 30 días también para el personal**, que puede usar computadoras compartidas. | Medio | Personal: 12 horas de inactividad. Familias: 30 días. Botón "Cerrar sesión en todos los dispositivos". |
| P8 | **Secretaría ve las notas médicas y las boletas.** No es necesario para su trabajo. | Bajo | Secretaría: ve alergias (emergencias), pero no las notas médicas ni las notas académicas. Las boletas solo se las imprime Dirección. Requiere validar con la directora. |
| P9 | **No queda registro de quién cambió notas, pagos o datos de un alumno.** | Medio | Bitácora: quién, qué y cuándo, para notas, pagos aplicados o anulados, retiros y cambios de expediente. Visible para Dirección. |
| P10 | **Fotos:** la autorización depende de que la docente revise. Las familias pueden descargar y reenviar las fotos. | Medio | Marcar en cada foto los niños que aparecen (opcional) y ocultar a la familia las fotos de niños sin autorización. Advertencia más visible al descargar. |

## 3. Funcionalidad por perfil

### Dirección

**Le sobra (hoy está en su menú):**
- **Asistencia del día y Vida diaria** (reporte diario y fotos). Es trabajo operativo de la docente.
  - Propuesta: quitarlos de su menú y de "La escuela hoy".
  - Si tiene que cubrir a una docente, entra desde la ficha de la sección.
  - El aviso "secciones sin lista" se reemplaza por un indicador semanal de cumplimiento del equipo.
- **El detalle de notas por materia.** Le interesa el avance del cierre del periodo y publicar las boletas, no llenar notas.

**Le falta y es muy importante:**
1. **Re-matrícula 2027 de los alumnos actuales.** Qué familias ya confirmaron y pagaron la matrícula del próximo año, y cuáles no han respondido. En una escuela privada pequeña es el número que define el año.
2. **Cupos por sección y grado.** Cuántos lugares quedan para 2027, combinando la re-matrícula y las solicitudes nuevas.
3. **Alertas de alumnos en riesgo:**
   - 3 o más ausencias en dos semanas;
   - morosidad de más de 60 días;
   - notas bajo 65 en el periodo;
   - una familia que no lee avisos.
   Una sola lista, con el motivo de cada alerta.
4. **Cumplimiento del equipo (semanal):** porcentaje de días con lista, reportes diarios enviados, mensajes respondidos en menos de un día y avance de notas antes del cierre. Reemplaza mirar quién pasó lista cada día.
5. **Finanzas del curso:** proyección de ingresos del mes y del año, y cobro por nivel.
6. **Bitácora de cambios** (ver P9) y **datos de la familia** (ver P4).

### Secretaría

**Le sobra:**
- Vista académica (boletas) y notas médicas (ver P8).
- "Nuevo aviso" como botón principal: en una escuela pequeña los avisos suelen salir de Dirección. Lo mantendría, pero no como acción principal.

**Le falta y es muy importante:**
1. **Constancias en un clic:** de matrícula, de estudios y de pagos al día. Es una de las solicitudes más frecuentes de las familias (para trabajo, CCSS o becas).
2. **Cierre de caja del día:** pagos recibidos hoy por forma de pago (efectivo, SINPE, transferencia, depósito), con recibos para cuadrar.
3. **Re-matrícula operativa:** generar el cobro de matrícula 2027 a los alumnos actuales, ver quién pagó y enviar recordatorios.
4. **Lista de verificación de expedientes:** documentos que faltan por alumno (cédula, vacunas, póliza estudiantil).
5. **Contactos de emergencia** en la ficha (hoy solo hay encargados y autorizados para recoger).
6. **Factura electrónica** (TRIBU-CR), más adelante.

### Docente

**Le sobra:**
- **Reportes:** solo descarga la asistencia mensual. Lo dejaría dentro de Asistencia, no como menú propio.
- **Calendario como menú propio:** puede quedar como consulta dentro de "Mi día" (la semana).

**Le falta y es muy importante:**
1. **Ver los avisos generales de la escuela.** Hoy solo ve los de sus secciones o los que ella escribió. Si Dirección envía un aviso a toda la escuela, la docente no lo ve, y las familias le preguntan a ella. Es un error de alcance y conviene corregirlo primero.
2. **Ficha rápida del alumno** desde asistencia o mensajes: alergias, adecuación, autorizados para recoger y teléfono del encargado, a un toque.
3. **Observaciones de seguimiento** (anecdotario): notas privadas de conducta o logros durante el periodo. Alimentan el informe al hogar y las reuniones con la familia.
4. **Avisos rápidos a su sección** desde "Mi día", con plantillas ("Mañana traer…", "Recordatorio de tarea").

### Familia

**Le sobra:**
- Nada importante. "Información de la escuela" y la suscripción al calendario son secundarias, pero ya están en un segundo nivel.

**Le falta y es muy importante:**
1. **Pagar en línea** (SINPE Móvil con referencia o la plataforma del Banco Popular), además de reportar el comprobante.
2. **Actualizar sus datos:** teléfono, contacto de emergencia, alergias nuevas. Llegan como solicitud a Secretaría, que la aprueba.
3. **Pedir una constancia** desde la plataforma.
4. **Confirmar la re-matrícula 2027** desde el celular, con el cobro de matrícula incluido.

## 4. Plan por fases

| Fase | Contenido | Tamaño |
|---|---|---|
| **1. Seguridad antes de lanzar** | P1 límite de intentos, P3 lista de lanzamiento sin demostración, P7 sesiones del personal, P2 límite del formulario público | Pequeño |
| **2. Perfiles ajustados** | Quitar Asistencia y Vida diaria del menú de Dirección. Docentes ven los avisos generales. Reportes de la docente dentro de Asistencia. P8 Secretaría sin notas médicas ni boletas | Pequeño |
| **3. Lo que define el año** | Re-matrícula 2027 (Dirección, Secretaría y familias), cupos por sección, alumnos en riesgo, cumplimiento del equipo en el panel de Dirección | Mediano |
| **4. Oficina** | Constancias, cierre de caja, contactos de emergencia, lista de documentos del expediente, solicitudes de cambio de datos de las familias | Mediano |
| **5. Privacidad y trazabilidad** | Bitácora (P9), exportar y eliminar datos (P4), borrado de documentos de matrícula (P5), notificaciones discretas (P6), fotos con niños marcados (P10) | Mediano |
| **6. Más adelante** | Pago en línea (Banco Popular o SINPE), factura electrónica, reportes con los formatos del MEP, anecdotario docente | Grande o depende de terceros |

## 5. Para decidir con la directora

1. ¿Secretaría necesita ver notas médicas o boletas? (P8)
2. ¿Quién envía los avisos a toda la escuela: solo Dirección, o también Secretaría?
3. ¿Cuántos cupos hay por sección para 2027?
4. ¿Qué constancias piden más las familias y quién las firma?
5. ¿Cuánto tiempo deben conservarse los documentos de solicitudes rechazadas?
