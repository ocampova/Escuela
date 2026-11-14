---
name: San Cayetano School
description: Plataforma escolar de SCS para familias y personal, al estándar de las mejores apps escolares.
colors:
  brand: "#12463a"
  brand-hover: "#0d382e"
  brand-soft: "#e7f0ec"
  brand-ink: "#0f3d32"
  ink: "#16231e"
  ink-2: "#44554d"
  ink-3: "#5f6f68"
  line: "#e2e8e5"
  line-strong: "#cbd5d0"
  canvas: "#f5f7f6"
  surface: "#ffffff"
  scs-orange: "#d9581f"
  scs-orange-strong: "#c24e1a"
  scs-green-strong: "#2e7a27"
  scs-blue-strong: "#1a6fa3"
  scs-orange-soft: "#fdeee6"
  scs-orange-ink: "#8f3510"
  scs-green: "#3b8f31"
  scs-green-soft: "#eaf5e7"
  scs-green-ink: "#245a1d"
  scs-blue: "#1f7fb8"
  scs-blue-soft: "#e5f2fa"
  scs-blue-ink: "#134d70"
  danger: "#b42318"
  danger-soft: "#fdecea"
  warn: "#a15c07"
  warn-soft: "#fef4e2"
  ok: "#1d7044"
  ok-soft: "#e6f4ec"
typography:
  display:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title-lg:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  title:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  micro:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
  micro-xs:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
rounded:
  focus: "6px"
  control: "8px"
  card: "12px"
  sheet: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  chip-section-orange:
    backgroundColor: "{colors.scs-orange-soft}"
    textColor: "{colors.scs-orange-ink}"
    rounded: "{rounded.pill}"
    height: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  avatar-section-orange:
    backgroundColor: "{colors.scs-orange-strong}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  staff-rail:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    width: "256px"
---

# Design System: San Cayetano School

## Overview

**Creative North Star: "El cuaderno bien llevado"** (the well-kept school notebook): calm, ordered, nothing lost.

The category standard played straight, at the craft level of Brightwheel and ClassDojo. The user chose that canon over custom worlds. Families on a phone and staff at a computer must know where everything is before they notice any style. Identity lives in precise details: the green of the logo's ring, the logo's letter colours marking sections, and the "Enterado" confirmation.

**Key Characteristics:**
- Cool, green-tinted canvas with white cards that need no borders.
- One accent (SCS forest green) for primary actions, selection, headers and the staff rail.
- **The SCS stripe:** the logo's three letters (orange, green, blue) as a 4px three-segment stripe under every header and at the top of the staff rail. It is the platform's signature.
- The logo's orange, green and blue mark section and child identity boldly: solid avatars, the active section tab and the child-profile band take the section's strong colour.
- Red and amber appear only where something needs action (overdue, absent, late, not confirmed).
- One sans (Inter), a tight scale and tabular numerals for money and counts.

## Colors

### Primary
- **Bosque SCS** (`brand`, #12463a): the green of the logo's ring. Used for primary buttons, current selection, the staff sidebar and the family balance header.

### Secondary
- **Letras SCS** (`scs-orange`, `scs-green`, `scs-blue`): the SCS stripe and chip dots.
- **Letras fuertes** (`scs-*-strong`: #c24e1a, #2e7a27, #1a6fa3): solid fills carrying white text (≥4.5:1). Used for child avatars, the active section tab and the child-profile band.
- **Letras suaves** (`-soft` grounds with `-ink` text): section chips. Event-type tiles reuse these tints too; that use is accepted drift, not a rule.

### Neutral
- **Lienzo** (`canvas`, #f5f7f6): the page field, tinted from the ring green so white cards separate without borders.
- **Superficie** (`surface`): cards, bars, inputs.
- **Tinta** (`ink`, `ink-2`, `ink-3`): text in three steps. `ink-3` is the lowest step that still clears AA on white.

### Named Rules
**The One Accent Rule.** Green is the only action colour. Letter colours never mean "click here".
**The Identity Not Action Rule.** Section colours say "whose" (which child, which section). They never mean "do this"; actions stay green.
**The Earned Alarm Rule.** Red and amber appear only where they carry a state a person must act on.

## Typography

**Font:** Lexend (via next/font), with a system-ui fallback. It was chosen because it was designed to make reading easier, and parents of every age read notices and statements here. It replaced Inter when the frontend-design skill was applied.

### Hierarchy
- **Display** (600, 1.75rem on phone, 2.25rem from tablet up): only the greeting in the green band, the one memorable element.
- **Headline** (600, 1.5rem): page titles.
- **Title** (600, 15px): section headings above cards.
- **Body** (400, 15px, 1.6): notices and descriptions, capped at 65ch.
- **Label** (500, 14px): buttons, table cells, list primaries.
- **Title large** (600, 17px): a child's name on their home card.
- **Caption** (500, 12px): chips, metadata, table headers.
- **Micro** (500, 11px; 600, 10px): tab bar labels, badge counts and the month in date tiles only.

### Named Rules
**The Tabular Money Rule.** Every amount and count uses `tabular-nums`. Colones are written ₡185 000.

## Layout

- **Family:** a single column, max-width 36rem. A green header with the SCS stripe and a fixed 4-tab bottom bar that respects the safe area. The home screen opens on a green band (greeting plus a children carousel of white cards); the child profile opens on a band in that child's section colour. The things that need action come right after.
- **Family from tablet up (md+):** the menu moves to the green header as horizontal tabs and the bottom bar disappears. The content opens up to 72rem. The home screen splits into two columns (needs attention + recent on the left, upcoming on the right, sticky), the account into summary + per-child statements, and Información and the child profile into two columns. Reading pages (notices, calendar, messages) stay at 48rem. Green bands span the full window width (`.full-bleed`).
- **Staff:** a fixed 256px green rail at lg and up. Below lg it becomes a green header with horizontally scrolling nav. Content max-width is 72rem; dashboards use a 3:2 grid at xl.
- Grid children carry `min-w-0`. Wide tables scroll inside their card and never scroll the page.
- Spacing: 32px between sections, 12px between cards, 16px of card padding.

## Elevation & Depth

Two levels of card, and the hierarchy matters: **raised** (`shadow-card`) for what asks for action (balance, notices to confirm), **flat** (1px `line` outline, no shadow) for lists you only consult (upcoming events, recent notices). Not everything is a floating card.

Cards float on the canvas with a soft two-layer shadow tinted with brand green (`shadow-card`), raised to `shadow-pop` on hover. There are no borders on cards; dividers inside cards are 1px `line`.

## Shapes

Controls have an 8px radius, cards 12px and the login sheet 16px. Pills are reserved for chips and badges.

## Components

### Buttons
Primary: green fill, white text, 40px tall (48px for full-width mobile CTAs), scaling to 0.98 when pressed. Secondary: white with an inset `line-strong` ring. Ghost: green-soft on hover.

### Chips
24px pills in tone pairs (`soft` ground with `ink` text and a ring). Section chips add a 6px dot in the letter colour.

### Cards / Containers
White, 12px radius, `shadow-card`, rows divided by `line`. Never nest cards.

### Inputs / Fields
White with an inset ring that becomes a 2px green ring on focus. Labels sit above the field at 14px/500; hints are 12px `ink-3`.

### Navigation
Family: a bottom tab bar whose active item is green with a heavier icon stroke; the Avisos tab carries a red count badge. Staff: on the green rail the active item is a white/12 fill.

### Transitions
Each page enters with `page-in` (opacity plus 6px, 220ms ease-out-expo) through `template.tsx`. It is the only automatic movement; the rest answers an action (Enterado, pressing, opening details). With `prefers-reduced-motion` it is turned off.

### Enterado (signature)
The acknowledgment button turns optimistically into a green "✓ Enterado" label with a 220ms ease-out-expo scale-in. Staff see confirmation as a thin meter ("2 de 6 familias"), with a "Sin confirmar" list split into "Lo abrió" and "No lo ha abierto".

## Do's and Don'ts

### Do:
- **Do** put what needs action first (pending notices, amount due), then today, then later.
- **Do** label demo data as fictional.
- **Do** use lucide icons at 1.75 stroke, and 2.25 when active.

### Don't:
- **Don't** put an eyebrow or date kicker above headings. The date goes below the greeting.
- **Don't** use hero-metric tiles, gradients or decorative colour.
- **Don't** use logo letter colours for actions or alerts.
- **Don't** show times that the data does not truly represent.

## Usability rules (checked with `npm run revisar-pantallas`)

- Nothing overlaps or leaves its container at 320, 375, 768, 1024 and 1440 px. The check script lists any page overflow, text outside its box, overlapping controls or targets smaller than 24 px.
- What matters most comes first for each role. The "Activar notificaciones" prompt is a compact line placed after the important content; it does not appear if notifications are blocked or the person dismissed it, and they can turn them on from their profile.
- Date fields: iPhone Safari draws them at its own size, so they are normalised in `globals.css`. Day changes use the arrows and apply on their own (no "Ver" button).
- Text links ("Ver todos", "Abrir") use the `tap` utility, which enlarges the tap area to 44 px without changing the look.
- Do not use CSS scroll snapping (`snap-x`, `snap-start`): in iPhone Safari it can scroll the whole page on load to line up the snapped element, hiding the top of the page under the fixed header.
- In the school view, the side menu takes up space at 1024 px: two-column pages switch to two columns only from `xl`.
