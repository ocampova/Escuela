# Escuela: plataforma de gestión escolar para San Cayetano School (Grecia, Costa Rica)

A web platform that works on both phone and computer, for managing the school's levels and its communication with families.

- Product plan, research and roadmap: [docs/PLAN.md](docs/PLAN.md)
- Product context: [PRODUCT.md](PRODUCT.md) · Design system: [DESIGN.md](DESIGN.md)

## Phase 1 (prototype)

**Families (phone):** home with what needs attention (notices to confirm, balance due), notices with an "Enterado" (acknowledged) button, calendar, account statement, and a child profile (attendance, health, people authorized to pick up).

**School (computer, also works on phone):** dashboard (today's attendance, notice confirmations, overdue fees), one-tap attendance, notices with tracking of who has not confirmed, students, calendar, and fees (payment recording, monthly fee generation).

## Phase 2 (the school runs it on its own)

- **Configuración:** school year, levels, grades and sections (colour and homeroom teacher), and staff accounts (create, invite, deactivate).
- **Students and families:** create and edit records, add guardians (siblings are linked automatically by email), people authorized for pickup, and **import from Excel/CSV** with a preview and per-row errors.
- **Invitations and passwords:** single-use activation link (14 days). It can be copied, sent by WhatsApp, or emailed if Resend is configured. "Olvidé mi contraseña" (forgot password) link valid for 2 hours.
- **Online enrollment:** a public form at `/matricula` with documents (PDF/photos), and an inbox with statuses (new, contacted, visit scheduled, accepted). "Matricular" creates the student and the guardian account.

## Phase 3 (communication)

- **Messages:** each family writes to its child's **homeroom teacher** or to the **office** (Dirección and Secretaría), one thread per child. Unread badges, automatic updates every few seconds, and an office-hours message configurable in Configuración › Personal. Teachers see only their sections; Secretaría sees the office threads; Dirección sees everything. The school can start a conversation from a student's profile ("Escribir").
- **Notices with images:** a notice can be just an image (for example a circular made in Canva), up to 6 images, with an automatic title if none is given. Images are private: only the families the notice is addressed to, and the school staff, can see them.
- **WhatsApp + platform:** the school keeps its WhatsApp groups as its fast channel. When a notice is published, **"Compartir en el grupo"** opens WhatsApp with the summary and a link. The parent taps it, reads the notice and confirms with "Enterado", and the school sees who is missing. A **"Recordar en el grupo"** button shares a reminder with the number of families who have not confirmed yet. The in-platform chat can be turned off in Configuración › Personal if the school prefers to keep using WhatsApp for conversations.
- **Push notifications (PWA):** "Activar notificaciones" button on the home screen. Notifications are sent for new notices, messages, absences and late arrivals, payments reviewed, new payment reports and new enrollment requests. On iPhone the app must first be added to the home screen (iOS 16.4+).
- Setup: generate the keys once with `npm run vapid` and put them in `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. Without keys, the app works the same way, just without push.

## Basics block (consent, absences, permissions, receipts, profile, emails)

- **Privacy notice (Ley 8968)** at `/privacidad`. On first login the family accepts it and decides, per child, whether to **authorize photos**. The school sees that decision on each student's profile.
- **Absence notices:** the family reports "No va hoy, cita médica" (or "Llegará tarde"). The teacher receives a notification and sees the notice when taking attendance, with the status already preselected. Past absences already recorded become excused.
- **Permissions:** a notice can ask "¿Autoriza…? Sí / No" for each student, with an optional deadline. The school sees who authorized, who did not and who is missing, and can send a reminder in the WhatsApp group.
- **Receipts and statement:** each payment has a receipt number. Families and the office can open, print or save as PDF both the receipt and the full statement.
- **Parent profile:** email, phone, password, email preferences and photo authorization.
- **Emails (Resend):** invitations, password reset, notices and permissions, receipts and enrollment confirmations, with a template carrying the SCS identity. Setup guide in [docs/CORREO.md](docs/CORREO.md).

## Reports and reminders

- **Reports (Excel):** monthly attendance per section (one column per school day, P/T/A/J and % attendance, one sheet per section; teachers only for their own sections), student list with guardians and health data, balances and overdue amounts, and payments for the month with receipt number. Under School › Reportes.
- **Payment reminders:** notification and email 3 days before the due date and on days 1, 8, 15 and 30 of delay, one message per family, never repeated on the same day. Manual "Enviar ahora" button and on/off switch in Cobros. Daily schedule: [docs/RECORDATORIOS.md](docs/RECORDATORIOS.md).

## Daily life (preescolar) and calendar

- **Daily report:** for each child the teacher records mood, snack, participation, bathroom and a note, plus a "Hoy trabajamos" line (what the class did today) shared by the whole section. "Llenar todos con lo habitual" (fill everyone with the usual) fills the form in one tap. "Enviar a las familias" sends a notification to each family. The report appears on the home screen and on the child's profile.
- **Private photos per section:** albums that only the families of that section can see, logged in with their own account. Photos are resized on the phone before upload (JPEG, 1600 px). If a child in the section has no photo authorization, the teacher sees their names and confirms before publishing. "Avisar en el grupo" (tell the group) shares only the link in WhatsApp, never the photos.
- **Pickup:** for each child the teacher picks who is collecting them from the guardians and the authorized list (with ID number). If it is someone else, the platform asks how this was confirmed with the family. The family receives a notification with the time and the person.
- **Calendar on the phone:** a private link (ICS) for Google Calendar, iPhone or Outlook with the events that apply to each family. It updates automatically and can be regenerated if it was shared by mistake.

## Academics

- **Configuration (Configuración › Académico):** terms (trimesters or semesters), subjects per level, and the grade components with their percentages (they must add up to 100%). Each level is either numeric (primaria) or descriptive (preescolar). The percentages in the seed are an example. The school sets them according to the current MEP Reglamento de Evaluación de los Aprendizajes.
- **Primaria grades:** 0 to 100 per component and subject. The term grade is calculated automatically (65 is the passing mark). While components are still missing, the grade shows in grey as "acumulado" (accumulated so far). Each student also has an observations field per term.
- **Preescolar home report (informe al hogar):** for each area, an achievement level (Logrado, En proceso, Necesita apoyo) and a comment, plus a general message to the family. There is a "Siguiente alumno" button to move through the whole section quickly.
- **Report cards:** printable or saveable as PDF, with that term's attendance and signature lines. The teacher sees a preview first and publishes per section and term. Families receive a notification and see the report card on their child's profile.
- **Homework:** per section and subject with a due date. Families receive a notification, and homework appears on the home screen (next few days), on the child's profile and under `/familia/tareas`.

## Real school data (2027 brochures)

- Levels: **Preescolar** (Kinder, Preparatoria) and **Primaria** I and II Ciclo (1st to 6th grade, bilingual), each with its own schedule, phones and campus address.
- Prices by level: monthly fee ₡148,000 (preescolar) or ₡192,000 (primaria); annual enrollment ₡150,000 (₡120,000 in August and September); materials ₡40,000 or ₡50,000; Tecnikids robotics US$85. All of them can be edited in Configuración › Pagos y precios.
- **"Reportar pago" (report a payment):** the family uploads the deposit or transfer receipt with the date and the student; Secretaría approves it (the payment is applied) or rejects it with a reason.
- The bank account is configured in the platform (Configuración › Pagos). **It is not saved in the code**, because the repository is public. The seed uses a demo account.

Roles: Dirección (ADMIN), Secretaría (STAFF), Docente (TEACHER, sees only their sections) and Familia (GUARDIAN, sees only their own children).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma · sessions with a signed cookie (jose) · installable PWA.

## Run locally

```bash
cp .env.example .env      # adjust DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate dev
npm run db:seed           # fictional demo data
npm run dev
```

Demo accounts (password `demo1234`):

| Role | Email |
|---|---|
| Family (2 children) | familia@demo.scs.cr |
| Dirección | directora@demo.scs.cr |
| Secretaría | secretaria@demo.scs.cr |
| Docente, Preparatoria A | schaves@demo.scs.cr |

All names, ID numbers and amounts in the seed are **fictional**.

## Deploy on Railway

The project includes `railway.json`. On startup, `npm start` applies the migrations, loads the demo data if `SEED_DEMO=true` and the database is **empty**, and starts the server. The push notification keys are generated by themselves on the first startup and saved in the database.

1. In Railway: **New Project → Deploy from GitHub repo →** `ocampova/Escuela` (branch `claude/school-management-platform-lj5nvi`).
2. In the same project: **+ New → Database → PostgreSQL**.
3. In the app service, under **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `AUTH_SECRET` = `${{secret(48)}}` (Railway generates it)
   - `SEED_DEMO` = `true` (demo data and buttons for the demo accounts; remove it when the school starts using it for real, with a fresh database)
4. **Settings → Networking → Generate Domain**. Railway passes that domain to the app (`RAILWAY_PUBLIC_DOMAIN`) for the invitation links.
5. Optional: `RESEND_API_KEY` and `MAIL_FROM` (emails), and `APP_URL` if you use your own domain.

Demo accounts: see the table above (password `demo1234`).
