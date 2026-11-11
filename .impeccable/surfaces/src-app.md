---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface: SCS platform app shell (familia + escuela)

Scope: authenticated app. Mode: Operate. Two shells: families on phone (/familia), staff on desktop (/escuela).
Audience/job: parents read and acknowledge notices, check calendar and balance; staff run attendance, notices, students, fees.
Constraints: Spanish, colones, MEP structure, children's privacy. Fictional demo data, labeled as such.
Unresolved: bilingual scope; Banco Popular file format (phase 5).

## Direction contract
THESIS: The category standard played straight (user chose the canon, references Brightwheel and ClassDojo): calm white surfaces, one SCS green accent, familiar cards and lists. Refuses decoration, dashboards of hero metrics, and chat-app clutter.
OWN-WORLD: Cool green-tinted canvas (#f5f7f6) with white cards on top (category standard: the field must separate cards without borders; tint taken from the SCS ring green); SCS forest green for primary actions, selection and the staff sidebar; logo letter colours (orange, green, blue) as the 4px SCS stripe under every header and as bold section/child identity (solid avatars, active section tab, child band); red/amber only for overdue and unread. One sans (Inter), rounded 12px cards, soft offset shadows.
STORY: A parent opens the app and sees, in order: what needs their attention (unacknowledged notices, amount due), then today, then the week. Staff see who has not read, who is absent, who owes.
FIRST VIEWPORT: Familia: top bar with logo and child switcher; "Pendiente" block (notices to acknowledge with an Enterado button, balance due); then próximos eventos; bottom tab bar (Inicio, Avisos, Calendario, Cuenta). Escuela: green left sidebar; main area with today's attendance by section, notices with read rate, overdue balances.
FORM: Canon (standing exit), Brightwheel/ClassDojo craft bar. seed:bc4c30ae6f90afde
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
