# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary (confirmed): the owner, Allan.** 41 years old, lives in Costa Rica, starting weight 109 kg. Uses Pulso on his phone every day: blood pressure readings at home in the morning and at night, ticking daily habits, deciding what to eat and what to buy. For now, the only real user.
- The product supports other accounts with their own profile and goals, but other users are **not a priority right now**. There is no professional, family or public audience to design for.

## Product Purpose
A **metabolic coach** that guides one person to make progress on three goals: lose weight, improve insulin resistance, and lower blood pressure. It combines a 12-week route (one change at a time), a daily checklist, recommendations computed from the person's own records, Costa Rican food with a shopping list, and clinical tracking (BP, weight, waist, lab results, sleep, activity).
Success: Allan keeps using it day after day, completes the route stages, and arrives at his medical appointments with reliable data (7-day averages, trends, labs).

## Positioning
Not a calorie counter and not a generic plan. It is a step-by-step route grounded in official guidance (NIDDK, AHA, NHLBI), with everyday Costa Rican food (gallo pinto, casado, olla de carne). The coach only describes **real data** the person entered. It never diagnoses and never touches medication.

## Operating Context
- Phone at 360–430 px, used with one hand (often the cuff is on the other arm), at home in the morning and at night, at meals, and at the feria or supermarket.
- Weekly ritual: the review, then deciding whether to move to the next stage.
- Relationship with the healthcare team (confirmed): **he brings the printable summary to the appointment.** The doctor does not use the app, and Pulso does not share data with third parties.
- Emergencies in Costa Rica: **911**.

## Capabilities and Constraints
- Stack: Node 22.5+ with no dependencies (`node:http`, `node:sqlite`), vanilla JS SPA in `public/`, tests in `test/`.
- Hosting: **delegated** to the assistant. Recommendation: Railway (already used by the repo's other app) with a persistent volume for the SQLite database and `PULSO_SECURE_COOKIES=1`. Not deployed yet.
- Clinical safety (non-negotiable):
  - Current alarm symptoms → urgent guidance and 911, whatever the reading.
  - 180/120 or higher → retest and seek care according to symptoms.
  - Current symptoms are kept distinct from historical ones.
- Never diagnose, never change or recommend medication, and never promise results ("reset your metabolism", "cure insulin resistance").
- No individual calorie prescription. Portions are guidance only (plate method).
- Meal times are not a fasting instruction.
- Avoiding dairy and gluten is a **personal preference** of this profile, not a general recommendation.
- Data: authentication, separation between users, CSV export, backup/restore, printable summary, no overwrites between windows.
- Undecided:
  - sharing data with professionals (not wanted for now);
  - password recovery by email;
  - offline mode.

## Brand Commitments
- Name: **Pulso**.
- Voice: Costa Rican Spanish with voseo, close, plain, **never blaming** ("Lo que no marques no es una falla"). Specific actions on buttons.
- Binding requests from the owner: warm and professional feel, **deep green**, light backgrounds, **soft colors to tell meals apart**, consistent iconography, generous spacing, no visual saturation. Main text ≥ 16 px, comfortable touch targets.

## Evidence on Hand
- 16 recipes, an ingredient catalog with cooked/raw conversions, and the 12-week route with sources: `public/js/data.js`, `public/js/coach.js`.
- There are no testimonials, clinical results or professional endorsements. **Do not invent them.**
- Every number shown comes from the user's records. The preview screenshots use sample data that is labeled as such.

## Product Principles
1. **One change at a time.** Every screen answers "what do I do today?" before "how am I doing?".
2. **Real data or nothing.** No estimates presented as measurements, no trend without enough data, and the same number on every screen.
3. **Safety before engagement.** Alarm moments are designed first and never celebrated.
4. **Accompany without blaming.** Progress is shown as information for adjusting, not as a grade.
5. **For the appointment, not instead of it.** Pulso prepares the conversation with the doctor; it does not replace it.

## Accessibility & Inclusion
- Text ≥ 16 px for main content (14 px minimum for secondary labels), 44 px targets, AA contrast, visible keyboard focus, `prefers-reduced-motion` respected.
- The typeface (Atkinson Hyperlegible Next) was chosen for low vision. Charts have a list or table alternative and series that can be told apart with color vision deficiency (validated).
