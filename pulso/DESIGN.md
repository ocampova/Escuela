---
name: Pulso
description: Coach metabólico en español para bajar de peso, mejorar la resistencia a la insulina y la presión arterial.
colors:
  green-950: "#0F2E22"
  green-900: "#163C2E"
  green-800: "#1E4D3B"
  green-700: "#2A634C"
  green-200: "#CFE2D6"
  green-100: "#E5EFE8"
  green-50: "#F1F6F2"
  bg: "#F2F5F1"
  surface: "#FFFFFF"
  surface-2: "#E8EEE8"
  ink: "#1C2420"
  ink-2: "#48534D"
  ink-3: "#5F6A64"
  line: "#DAE2DB"
  line-2: "#C3CEC5"
  desayuno: "#F7E8D4"
  desayuno-ink: "#7C4E12"
  almuerzo: "#E1EDD9"
  almuerzo-ink: "#35612A"
  cena: "#E5E3F2"
  cena-ink: "#4A4680"
  alert-bg: "#FCE8E5"
  alert-ink: "#85251A"
  alert-strong: "#B3261E"
  alert-hover: "#941F18"
  alert-line: "#F1BDB5"
  trail-done-dark: "#8FC0A2"
  trail-ink-dark: "#B9D6C4"
  warn-bg: "#FBF0D8"
  warn-ink: "#6E4500"
  info-bg: "#E8EFF5"
  info-ink: "#24435E"
  chart-sys: "#1F7A55"
  chart-dia: "#8A63C8"
typography:
  h1:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  h2:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  h3:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.25
  reading:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.15
  control:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1
  small:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
  chart-axis:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
rounded:
  control: "8px"
  tile: "10px"
  card: "12px"
  focus: "14px"
  pill: "999px"
spacing:
  gutter: "16px"
  stack: "12px"
  section: "28px"
  target: "44px"
components:
  button-primary:
    backgroundColor: "{colors.green-900}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.green-800}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.alert-strong}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "18px"
  focus-card:
    backgroundColor: "{colors.green-900}"
    textColor: "{colors.green-100}"
    rounded: "{rounded.focus}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "52px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
---

# Design System: Pulso

## Overview

**Creative North Star: «El sendero acompañado».** Pulso is a path you walk one step at a time with someone beside you. The interface conveys calm, visible progress and no rush. The 12-milestone trail is its signature element, and everything else stays sober so the path and the data carry the weight.

Components are **sober and clinical**: straight edges, neutral tones, and green reserved for what matters (the main action, progress, the trail). This is an Operate product used every day on a phone with one hand. Legibility and trust come before expression.

Anti-references: cream backgrounds with a decorative serif (the generic look of AI-made "wellness" apps); celebration confetti or banners at clinical moments; gauges and rings that grade the person.

## Colors

### Primary
- **Bosque profundo** `green-900 #163C2E`: primary action, the focus card, the current milestone. `green-950` for headings; `green-700/800` for progress and filled states.

### Neutral
- **Papel clínico** `bg #F2F5F1`: light background with a slight green tint, not cream. `surface #FFFFFF` for cards and inputs, `surface-2` for metrics and segmented controls.
- **Tinta** `ink #1C2420` for text and secondary buttons. `ink-2 #48534D` for secondary text (8:1 on white).

### Meals (owner request)
- Desayuno: durazno `#F7E8D4` with ink `#7C4E12`.
- Almuerzo: salvia `#E1EDD9` with ink `#35612A`.
- Cena: lavanda `#E5E3F2` with ink `#4A4680`.

These colors identify meals only. They never mean state.

### Status (always with an icon and text)
- Urgent: `alert-strong #B3261E`, used for the emergency banner and the 911 button.
- Attention: `alert-bg/alert-ink`.
- Caution: `warn-bg/warn-ink`.
- Information: `info-bg/info-ink`.

### Charts (validated with the dataviz validator, light mode)
- `chart-sys #1F7A55` (solid line) and `chart-dia #8A63C8` (dashed line). They pass the lightness, chroma, CVD (protan, deutan, tritan) and contrast checks.
- 130/80 reference lines in `#9AA59E`, dotted.

### Named Rules
- **Green is earned.** Only the main action, progress and the trail use green. Secondary buttons, links and icon buttons are ink-colored.
- **Red only for urgency.** Red never decorates and never shows up for a reading that has no alert.

## Typography

A single family: **Atkinson Hyperlegible Next** (400/600/700), self-hosted. It was designed for low vision, and the slashed zero avoids confusing 0 with O in readings.

### Hierarchy
- h1: 2rem/700, −0.03em. One per screen.
- h2: 1.3rem/700, −0.02em. Sections.
- h3 / `h2.h3`: 1.1rem/700. Card titles.
- Body: 17px/1.5. Never below 16 px for primary content.
- Numbers and readings: 1.3–1.6rem/700 (`reading`).
- Buttons and controls: 1rem/700. Secondary text: 0.94rem.
- Labels, badges and nav: 0.875rem/700. **14 px is the absolute minimum for HTML text.** The only exception is the chart axes (13 px inside the SVG), which always come with a list or table holding the same data.

### Named Rules
- **Numbers carry the weight.** Readings (133/85, 106,6 kg) are 700 and 1.2–1.6rem, with tabular figures.
- No all-caps labels above headings.

## Layout

- Mobile first, 360–430 px, 16 px side gutter. Tablet up to 760 px. Desktop ≥960 px: a 224 px side rail and content up to 1040 px.
- One-handed reach: fixed 5-item bottom nav (Hoy · Ruta · Comer · Progreso · Salud). Main actions sit in a sticky `thumb-bar` or at the end of the flow.
- Hoy order: focus card with the trail → BP button → today's checklist → one next step → link to the data → meals → registrations.
- More space above a section (28 px) than inside it (12 px).

## Elevation & Depth

Flat. Each surface declares a border **or** a shadow, never both. The only shadow (`0 1px 2px / 0 4px 14px rgba(22,60,46,.06)`) goes on the `thumb-bar`, which floats above content. Toasts use a deeper shadow because they cover the interface.

## Shapes

Straight with a soft corner: controls and inputs 8 px, tiles 10 px, cards 12 px, focus card 14 px. Pills only for chips and tags. Milestones and checks are circles.

## Components

### Buttons
Sober and clinical: 48 px tall (44 px for `sm`), 8 px radius, 700 text. One primary (green) per area. Secondaries are white with an ink border. Ghost buttons are ink-colored. Danger is red, used only for deleting an account.

### Chips
Pills 44 px tall for single or multiple choice. When selected, `green-900` with white text.

### Cards / Containers
White with a 1 px `line` border and 12 px radius. Cards are never nested. Lists (`.list`) group rows with dividers inside one container.

### Inputs / Fields
52 px, 8 px radius, 17 px text (avoids zoom on iOS), unit shown inside the field (`kg`, `mmHg`), numeric keyboard through `inputmode`. Errors appear under the field with an icon and say how to fix the problem.

### Navigation
Bottom bar with an icon and a 14 px label. The active item gets a pill-shaped background and a top bar. On desktop it becomes a side rail.

### Signature: the 12-milestone trail
Two rows of 6 stops joined by a path (1→6 to the right, curving down, 7→12 back to the left).
- Each stop is a 40 px circle with its theme's icon. Completed stops are filled, the current one is 48 px with a ring, and upcoming ones are outlined.
- The completed stretch is a 4 px solid line; the rest is dotted.
- Each stop links to the guide for its week.
- It has two variants: on the dark focus card in Hoy and on white on the Ruta screen.
- Its only motion: when you advance a stage, the new stretch draws in (1.1 s) and the current stop arrives. This is disabled under `prefers-reduced-motion`.

### Clinical banners
- Emergency: solid red, with the 911 button in white with red text.
- ≥180/120: `alert-bg`, with numbered steps.
- They appear right next to the data that triggers them, and a success toast is never shown alongside them.

## Do's and Don'ts

### Do:
- Do show the same number with the same window (today + 6 days) on every screen, along with the count of readings.
- Do put the safety message right next to the data that triggers it.
- Do use the trail as the only decorative element on the coach screens.
- Do keep 44 px targets and 14 px minimum text, with a visible focus ring.

### Don't:
- Don't use cream backgrounds or a display serif.
- Don't color a series or a state with the meal colors.
- Don't show percentages that blame the person before there are 3 days of data.
- Don't add hero metrics, rings that grade the person, or confetti.
- Don't use green on secondary buttons or links.
