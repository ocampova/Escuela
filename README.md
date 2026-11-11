# Escuela: plataforma de gestión escolar para San Cayetano School (Grecia, Costa Rica)

A web platform that works on both phone and computer, for managing the school's levels and its communication with families.

- Product plan, research and roadmap: [docs/PLAN.md](docs/PLAN.md)
- Product context: [PRODUCT.md](PRODUCT.md) · Design system: [DESIGN.md](DESIGN.md)

## Phase 1 (prototype)

**Families (phone):** home with what needs attention (notices to confirm, balance due), notices with an "Enterado" (acknowledged) button, calendar, account statement, and a child profile (attendance, health, people authorized to pick up).

**School (computer, also works on phone):** dashboard (today's attendance, notice confirmations, overdue fees), one-tap attendance, notices with tracking of who has not confirmed, students, calendar, and fees (payment recording, monthly fee generation).

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
| Docente, Transición A | schaves@demo.scs.cr |

All names, ID numbers and amounts in the seed are **fictional**.

## Deploy on Railway

1. Create a project with a **PostgreSQL** service and a service from this repository.
2. Variables on the app service: `DATABASE_URL` (reference to Postgres) and `AUTH_SECRET` (32+ random characters).
3. Railway runs `npm run build`; `npm start` applies migrations (`prisma migrate deploy`) and starts the server.
4. Optional, to load demo data: `npx prisma db seed` from the Railway shell.
