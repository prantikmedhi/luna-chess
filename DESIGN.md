---
version: alpha
name: Luna Chess
description: A calm, nocturnal chess room with precise state communication and restrained celestial character.
colors:
  primary: "#12151B"
  secondary: "#596273"
  tertiary: "#8EA9FF"
  neutral: "#F5F1E8"
  surface: "#1A1F29"
  surfaceRaised: "#242B38"
  textPrimary: "#F7F8FC"
  textMuted: "#AFB7C7"
  boardLight: "#D8CFBC"
  boardDark: "#6C778C"
  boardSelected: "#F3C969"
  boardLastMove: "#A7C6FF"
  boardCheck: "#FF6B6B"
  success: "#74C69D"
  danger: "#FF6B6B"
typography:
  display:
    fontFamily: ui-serif, Georgia, serif
    fontSize: 3rem
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  heading:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 1.25rem
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 1rem
    fontWeight: 450
    lineHeight: 1.5
  label:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  move:
    fontFamily: ui-monospace, SFMono-Regular, monospace
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 10px
  lg: 16px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  page:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.textPrimary}"
  board-light:
    backgroundColor: "{colors.boardLight}"
    textColor: "{colors.primary}"
  board-dark:
    backgroundColor: "{colors.boardDark}"
    textColor: "#000000"
  board-selected:
    backgroundColor: "{colors.boardSelected}"
    textColor: "{colors.primary}"
  board-last-move:
    backgroundColor: "{colors.boardLastMove}"
    textColor: "{colors.primary}"
  board-check:
    backgroundColor: "{colors.boardCheck}"
    textColor: "{colors.primary}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textPrimary}"
    rounded: "{rounded.lg}"
    padding: 24px
  panel-muted:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.textMuted}"
    rounded: "{rounded.md}"
    padding: 16px
  panel-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textPrimary}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.textPrimary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px
---

## Overview

Luna Chess feels like a quiet evening match: dark ink surfaces, moonlit blue interaction, warm ivory board squares, and restrained typography. It is a chess product first, not an AI dashboard. The board occupies the strongest visual position; every surrounding element serves orientation, action, or recovery.

Character comes from contrast and proportion rather than decoration. Avoid star fields, glowing gradients, glass panels, neon borders, animated particles, or anthropomorphic AI theatrics. One small lunar mark in the wordmark is enough.

## Colors

- **Primary (`#12151B`)** is the page canvas and deepest ink.
- **Surface (`#1A1F29`)** contains controls and game information without floating excessively above the canvas.
- **Tertiary (`#8EA9FF`)** is the sole high-emphasis interactive accent.
- **Neutral (`#F5F1E8`)** supplies warmth and avoids clinical pure white.
- **Board light/dark** squares remain neutral enough for pieces and state overlays to dominate.
- **Selected** uses warm gold. **Last move** uses cool blue. **Check** uses coral red. Never interchange these semantics.
- State communication must include shape, iconography, or text; color alone is insufficient.

## Typography

Use a restrained serif only for the product name or the mode-selection headline. All controls, labels, status, history, and body copy use the system sans-serif stack for speed and legibility. Move notation uses the system monospace stack.

- Headings use sentence case.
- Small labels may use uppercase with wide tracking.
- Avoid oversized marketing headlines inside the game screen.
- Numerals in move history should align consistently.

## Layout

### Mode selection

Use a compact centered column on desktop, but avoid a generic landing-page hero. Present the product mark, one-sentence promise, and two equally clear mode cards. AI setup replaces or expands the AI card without navigating to a new marketing page.

### Game screen

Desktop uses a two-column composition:

```text
[ square board, dominant ] [ status / captures / history / controls ]
```

The board should occupy the smaller of 70 viewport height or available column width, with a practical maximum around 720px.

Mobile stacks:

```text
status
board
primary controls
captures
move history
```

At 320px wide there must be no horizontal scrolling. Use `aspect-ratio: 1 / 1` for the board and fluid width rather than viewport-coordinate calculations.

Spacing follows an 8px rhythm. Related state is close; unrelated controls are separated. Avoid wrapping every text fragment in its own card.

## Elevation & Depth

Use one subtle panel border and, at most, a soft board shadow. Elevation distinguishes the tactile board from the surrounding surface; it must not create a stack of floating glass cards.

Hover states change color or border gently. Pressed controls may translate by 1px. Disable transition-heavy piece animation when reduced motion is requested.

## Shapes

- Board squares are never rounded individually.
- The board container uses a small 6px radius so the grid still feels exact.
- Panels use 16px radii.
- Buttons use 10px radii, not pills.
- Legal move dots are solid circles; legal captures use rings.
- Focus rings are 2px and visibly offset.

## Components

### Chess board

- Use a high-quality open SVG piece set or crisp inline assets with explicit attribution where required.
- Pieces need strong contrast on both square colors.
- Show rank/file coordinates at board edges without consuming separate layout space.
- Selected square: gold tint plus visible inset outline.
- Legal empty destination: centered dot.
- Legal capture destination: inset ring around the square.
- Last move: blue tint on origin and destination.
- Checked king: coral tint with a clear inset ring; do not use a pulsing alarm.
- The selected/check state must remain legible when it overlaps last-move state.

### Mode cards

Each card has a concise title, one sentence, and one direct action. The AI card exposes difficulty and side controls in-place. Use native radio inputs visually styled as segmented options; preserve keyboard behavior.

### Status row

Display the active side with a piece-color marker and explicit text. While Luna is thinking, retain the side-to-move text and add a small spinner with a live-region announcement.

### Move history

Show numbered White/Black SAN pairs in a compact scroll region. Highlight the latest half-move. Empty state copy is simply **Moves will appear here.**

### Captured pieces

Group by captured color and order by material value. Include accessible text such as **White captured: black knight, black pawn** rather than exposing glyphs alone.

### Promotion dialog

Use a modal dialog with four large piece choices. Trap focus, support Escape to cancel, and return focus to the board. The move is not committed before the player chooses.

### Game-over banner

State the exact result and cause. Place **Restart** as the primary action and **New Game** as the secondary action. The underlying board remains visible but locked.

### Error banner

Use plain language: **AI is temporarily unavailable. Try again.** Include Retry when safe. Never display upstream messages, stack traces, or configuration values.

## Do's and Don'ts

### Do

- Keep the board visually dominant.
- Make turn and interaction lock states explicit.
- Use text, shape, and color together for important states.
- Preserve native keyboard and screen-reader behavior.
- Use short, honest descriptions for difficulty.
- Test overlapping board highlights and both board orientations.

### Don't

- Do not resemble a chat interface or generic AI SaaS dashboard.
- Do not claim engine, expert, or grandmaster strength.
- Do not add glassmorphism, noisy gradients, particle fields, or animated constellations.
- Do not use color alone to indicate legal moves or check.
- Do not hide primary game controls behind menus.
- Do not allow the board to produce horizontal page overflow.
