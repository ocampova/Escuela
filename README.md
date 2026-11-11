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

1. Create a project with a **PostgreSQL** service and a service from this repository.
2. Variables on the app service: `DATABASE_URL` (reference to Postgres) and `AUTH_SECRET` (32+ random characters). Optional: `RESEND_API_KEY` and `MAIL_FROM` to send emails; `APP_URL` if you use your own domain.
3. Railway runs `npm run build`; `npm start` applies migrations (`prisma migrate deploy`) and starts the server.
4. Optional, to load demo data: `npx prisma db seed` from the Railway shell.
