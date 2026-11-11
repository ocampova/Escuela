# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router, TypeScript) + PostgreSQL (Prisma), deployed on Railway. Installable as a PWA. Confirmed by the user.

## Users
- **Families (padres, madres, encargados legales)** of San Cayetano School, on their phones, between work and pickup. Job: know what is happening with their child today, never miss a notice, know what they owe.
- **School staff**: dirección, secretaría/tesorería, and docentes. Directors and secretaries mostly at a computer; teachers on a phone or tablet in the classroom. Job: run the day (attendance, notices, pickups) and the month (fees, calendar) without WhatsApp groups and paper.

## Product Purpose
A single place for San Cayetano School to manage its levels (preescolar first, primaria later) and communicate with families. Success: the school starts its first school year (2026) using it from day one; families read and acknowledge every notice; staff stop relying on chat groups and spreadsheets.

## Positioning
Built for one specific new private school in Grecia, Costa Rica, from its opening day: MEP structure (curso lectivo Feb–Dec, Materno/Transición/I–II ciclo), colones, SINPE and Banco Popular collection, Ley 8968 privacy. Not a generic international SIS translated into Spanish.

## Operating Context
- Costa Rica, Spanish first (English second; the school is likely bilingual).
- Fees are collected through a Banco Popular platform the school is integrating; this product keeps the account statement and reconciles bank reports. Also SINPE Móvil/transfer receipts.
- Children's photos and health data are sensitive (Ley 8968, PRODHAB). Photos visible only to the child's section.
- Detailed plan: `docs/PLAN.md`.

## Capabilities and Constraints
Phase 1: roles and login, school structure (curso lectivo, niveles, grados, secciones), students and families, notices with read acknowledgment, calendar, attendance, account statement (charges/payments). Later: messaging, daily report, photo wall, pickups, bank import, evaluations, online pre-enrollment.
Undecided: exact Banco Popular service and file format; evaluation periods; bilingual scope.

## Brand Commitments
- Name: San Cayetano School (SCS), Grecia, Costa Rica.
- Logo: `assets/logo-scs.webp` (circular badge, dark green ring; "SCS" letters in orange, green and blue).
- Tagline in use: "Una nueva forma de aprender, crecer y descubrir".

## Evidence on Hand
Logo and the Facebook page cover ("Matrícula 2026 abierta"). No real student, family, or fee data yet; demo data must be clearly fictional.

## Product Principles
1. Families first on mobile: the most common action (read a notice, check balance) takes one tap from home.
2. Nothing important gets lost: every notice is acknowledged and the school can see who has not read it.
3. Children's privacy by default.
4. Fit the Costa Rican school as it really works (MEP, colones, SINPE, Banco Popular).
5. Simple enough for a small staff to run without training.

## Accessibility & Inclusion
Parents of every age and tech comfort level; large tap targets, legible text, WCAG AA contrast, works on low-end Android phones.
