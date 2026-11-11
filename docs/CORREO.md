# Correos de la plataforma: dominio propio + Resend

La plataforma ya envía estos correos en cuanto se conecta Resend:

| Correo | Cuándo | Quién lo recibe |
|---|---|---|
| Invitación | La escuela toca «Invitar» | La persona invitada |
| Cambiar contraseña | «Olvidé mi contraseña» | Quien lo pide |
| Aviso nuevo / autorización | Se publica un aviso | Familias destinatarias (pueden apagarlo en su perfil) |
| Recibo de pago | Secretaría aplica un pago | Encargados del alumno (pueden apagarlo en su perfil) |
| Solicitud de matrícula recibida | Alguien llena el formulario público | Quien la envió |

Sin `RESEND_API_KEY` no se envía nada y todo lo demás funciona igual.

## 1. Comprar el dominio

- Ejemplos: `sancayetano.cr` (en NIC Costa Rica, nic.cr) o `sancayetanoschool.com` (en cualquier registrador: Namecheap, Cloudflare, GoDaddy…).
- Lo ideal es que quede **a nombre de la escuela**.

## 2. Conectar el dominio a Resend

1. Cree una cuenta en **resend.com** (el plan gratuito permite 3 000 correos al mes y 100 al día; si la escuela crece, el plan pagado es de unos USD 20 al mes; confirme precios actuales en su sitio).
2. **Domains → Add Domain** → escriba un subdominio para enviar, por ejemplo `avisos.sancayetano.cr`. Así el correo del dominio principal queda libre para otros usos.
3. Resend muestra **3 o 4 registros DNS** (MX, SPF de tipo TXT y DKIM de tipo TXT). Cópielos tal cual en el panel DNS del registrador donde compró el dominio.
4. Espere a que Resend marque el dominio como **Verified** (de minutos a unas horas).
5. Recomendado: agregue también un registro **DMARC** (`_dmarc`, TXT, `v=DMARC1; p=none;`), mejora la entrega en Gmail.

## 3. Crear la clave y configurar Railway

1. En Resend: **API Keys → Create API Key** (permiso *Sending access*, solo para ese dominio).
2. En Railway → servicio **Escuela** → **Variables**:

| Variable | Valor de ejemplo |
|---|---|
| `RESEND_API_KEY` | `re_...` (la clave de Resend) |
| `MAIL_FROM` | `San Cayetano School <avisos@avisos.sancayetano.cr>` |
| `MAIL_REPLY_TO` | `scayetanoschool@gmail.com` (adonde llegan las respuestas) |
| `APP_URL` | `https://plataforma.sancayetano.cr` (solo si también usa el dominio para la plataforma) |

3. Toque **Deploy**.

## 4. (Opcional) La plataforma en el dominio propio

En Railway → **Settings → Networking → Custom Domain** → `plataforma.sancayetano.cr`, y cree en el DNS el registro CNAME que Railway indique. Después ponga `APP_URL` con esa dirección para que los enlaces de los correos usen el dominio de la escuela.

## Cómo probar

Entre como Dirección, abra la ficha de un alumno cuyo encargado tenga **su propio correo** y toque «Invitar»: debe llegar el correo de invitación. Si no llega, revise **Logs** en Railway: la plataforma escribe `[correo] Resend respondió …` con el motivo.
