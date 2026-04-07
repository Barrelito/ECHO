# ECHO: Cyberpunk UI Transformation — Design Spec

## Overview

Transform ECHO's visual presentation from a web-app aesthetic (white cards, Georgia serif, rounded corners, light palette) to an immersive cyberpunk terminal experience (dark palette, monospace, CRT effects, diegetic HUD). No tech-stack changes — this is purely CSS, typography, and component styling within the existing Next.js/React codebase.

**Current state:** The original design plan (`docs/design-plan-cyberpunk-transformation.md`) is ~30-35% implemented. Structural placeholders exist (voice markers, compliance bar, toast system) but the visual transformation is incomplete. This spec covers all remaining work.

## Scope

13 steps, grouped into three phases:
- **Phase 1 (Foundation):** Dark palette, monospace font, card removal, wider layout
- **Phase 2 (Interaction):** Diegetic HUD, voice markers, terminal input, loading
- **Phase 3 (Polish):** Ambient positioning, hints/journal, login, toasts

## Files to Modify

| File | Changes |
|------|---------|
| `app/globals.css` | Dark cyberpunk palette, CRT scanlines, vignette, keyframes |
| `app/layout.tsx` | IBM Plex Mono via next/font/google |
| `components/EchoGame.tsx` | Card removal, layout, HUD, typography, input, loading, ambient, hints, journal, toast |
| `components/LoginScreen.tsx` | Glowing title, terminal buttons, monospace |
| `components/SavesGrid.tsx` | Dark palette, sharp corners, monospace |
| `components/SaveModal.tsx` | Dark palette, sharp corners |
| `components/AuthModal.tsx` | Dark palette, sharp corners |

---

## Phase 1: Visual Foundation

### Step 1: Dark Palette & CRT Effects (`globals.css`)

**Remove** `prefers-color-scheme: dark` media query. Replace with a single dark palette:

```css
:root {
  --color-background-primary: #0a0a0f;
  --color-background-secondary: #0f1118;
  --color-background-tertiary: #060609;
  --color-text-primary: #c8d6c8;      /* phosphor green */
  --color-text-secondary: #6b7f6b;
  --color-text-tertiary: #3a4a3a;
  --color-border-secondary: #1a2a1a;
  --color-border-tertiary: #111a11;
  --color-accent-green: #00ff88;
  --color-accent-amber: #ffaa00;
  --color-accent-red: #ff2244;
  --color-accent-teal: #00ccaa;
  --color-glow-green: rgba(0, 255, 136, 0.15);
}
```

**CRT scanlines** via `body::after`:
- `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px)`
- `pointer-events: none`, `position: fixed`, `inset: 0`, `z-index: 9999`
- `opacity: ~0.03`

**Vignette** via `body::before`:
- `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)`
- `pointer-events: none`, `position: fixed`, `inset: 0`, `z-index: 9998`

**New keyframes:**
- `typewriterCursor` — block cursor blink (step-end)
- `glitchFlicker` — short horizontal offset + hue-rotate on scene transition (0.15s)
- `compliancePulse` — subtle glow pulse on compliance bar

### Step 2: Monospace Font (`layout.tsx`)

Load **IBM Plex Mono** via `next/font/google`:

```tsx
import { IBM_Plex_Mono } from 'next/font/google';
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300','400','500','600'],
  variable: '--font-mono'
});
```

Apply `className={plexMono.variable}` on `<html>`. Update `globals.css`: `body { font-family: var(--font-mono); }`.

### Step 3: Remove Card Aesthetic (`EchoGame.tsx`)

- **Past scenes:** Remove card wrapper (background, border, borderRadius). Use `border-top: 1px solid var(--color-border-tertiary)` as separator. Player actions get `> ` prefix in accent-green.
- **Current scene:** Remove all card styling. Raw text against dark background. Current scene at opacity 1.0, old scenes at 0.35.
- **Streaming scene:** Same — no card wrapper.
- **Map container:** Remove borderRadius and white background.

### Step 4: Wider Layout (`EchoGame.tsx`)

- `maxWidth: "680px"` → `maxWidth: "860px"`
- Padding: `padding: "2rem clamp(2rem, 8vw, 8rem) 3rem"`

---

## Phase 2: Interaction & Typography

### Step 5: Diegetic HUD (`EchoGame.tsx`)

- **Header:** Solid background → transparent with `linear-gradient(to bottom, #0a0a0f 60%, transparent)` fade
- **ECHO title:** Monospace, `fontSize: 13px`, `textShadow: "0 0 8px rgba(0,255,136,0.5)"`
- **Nav buttons:** `> ` prefix, `color: var(--color-accent-teal)`, monospace
- **Neural dive indicator:** Dark background with pulsing purple border instead of light purple card
- **StatusRow:** Remove background/borderRadius, use `borderLeft: 2px solid var(--color-border-secondary)` instead
- **ComplianceBar:** Glowing fill with `boxShadow: "0 0 8px rgba(0,255,136,0.4)"`

### Step 6: Monospace SceneText (`EchoGame.tsx`)

- Font: `Georgia, serif` → `var(--font-mono)`
- `fontSize: 15px`, `lineHeight: 1.75`, `letterSpacing: 0.02em`
- Streaming cursor: `width: 8px` block in accent-green with `typewriterCursor` animation (replaces 2px thin line)
- New paragraph animation: short `glitchFlicker 0.15s` then fade-in

### Step 7: Voice Markers (`EchoGame.tsx`)

- **ECHO:** `textShadow: "0 0 4px rgba(0,255,136,0.4)"`, subtle green background wash `rgba(0,255,136,0.03)`, green borderLeft
- **TANKE:** `//` prefix in tertiary color, italic, reduced opacity — player's inner voice
- **DIALOG:** Speaker name in `var(--color-accent-teal)`, teal borderLeft, monospace name

### Step 8: Terminal-Prompt Input (`EchoGame.tsx`)

- `background: transparent`, `border: none`
- `borderBottom: 1px solid var(--color-accent-teal)` only
- `borderRadius: 0`
- `> ` prompt prefix before input in teal
- `color: var(--color-accent-green)`, `caretColor: var(--color-accent-green)`
- Remove send button (Enter works already)

### Step 9: Loading Without Cards (`EchoGame.tsx`)

- Remove card wrapper from `EchoThinking`
- Blinking `_` block cursor (8px wide, accent-green) + loading message in monospace
- `color: var(--color-accent-green)`, `fontSize: 12px`
- Existing loading messages are kept as-is

---

## Phase 3: Atmosphere & Secondary

### Step 10: Ambient Fragments as Peripheral Atmosphere (`EchoGame.tsx`)

- **Desktop:** `position: fixed`, `bottom: 120px`, `right: 2rem`, `maxWidth: 280px`
- Monospace, `fontSize: 11px`, `opacity: 0.4`, subtle green `textShadow`
- **Mobile:** Keep inline below scene (fixed positioning too cramped)
- Feel: intercepted transmissions in the periphery

### Step 11: Action Hints & Journal (`EchoGame.tsx`)

- **Action hints:** Monospace, `>` prefix instead of `—`, teal hover-glow
- **Journal headers:** `// KARAKTÄRER`, `// PLATSER`, `// HÄNDELSER` as code-comment style
- **Journal entries:** Prefix glyphs `[K]` (karaktärer, teal), `[P]` (platser, amber), `[H]` (händelser, red)

### Step 12: LoginScreen & Secondary Components

- **LoginScreen:** ECHO title in monospace with green glow (`textShadow: "0 0 12px rgba(0,255,136,0.5)"`), `letterSpacing: 0.3em`. Buttons: sharp corners (`borderRadius: 2px`), monospace, teal borders, `> ` prefix
- **SavesGrid/SaveModal/AuthModal:** Dark palette, monospace, sharp corners (borderRadius 0-2px), no rounded cards

### Step 13: Discovery Toast & Compliance Delta

- **Toast:** Sharp corners (`borderRadius: 0`), green border + `boxShadow: "0 0 12px rgba(0,255,136,0.15)"`, short `glitchFlicker` animation on entry
- **Compliance delta:** `textShadow` glow matching delta color, more prominent visual feedback on large negative changes

---

## What This Does NOT Change

- Game logic / AI prompts (`lib/echo-prompt.ts`) — unchanged
- Ambient system (`lib/ambient-prompt.ts`, `app/api/game/ambient/route.ts`) — logic unchanged, only rendering position
- Save system — unchanged
- Auth flow — unchanged
- API routes — unchanged
- Page orchestration (`app/page.tsx`) — unchanged

## Verification

1. `npm run build` — no TypeScript/build errors
2. `npm run dev` → test in browser:
   - Dark background with CRT scanlines visible on close inspection
   - Monospace text throughout (IBM Plex Mono)
   - No rounded cards — text flows directly on dark background
   - Terminal-style `> ` input with teal underline
   - ECHO voice markers glow green, TANKE has `//` prefix, DIALOG in teal
   - Streaming shows 8px green block cursor
   - Loading: blinking `_` cursor, no card wrapper
   - Ambient fragments on desktop: fixed right side
   - Login screen: glowing ECHO title, sharp terminal buttons
   - Toasts: sharp corners, green glow border
3. Mobile: responsive layout, sticky input works, ambient inline
4. Save/load still functional
5. Voice markers render correctly with new styles
