# Cyberpunk UI Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ECHO's visual presentation from web-app aesthetic to immersive cyberpunk terminal — dark palette, monospace font, CRT effects, diegetic HUD, terminal input.

**Architecture:** Pure CSS/styling changes across 7 files. No logic, API, or structural changes. The transformation is split into 8 tasks ordered so each builds on the previous — palette first (everything depends on colors), then font (everything depends on typography), then component-by-component changes.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, next/font/google (IBM Plex Mono)

**Spec:** `docs/superpowers/specs/2026-04-07-cyberpunk-transformation-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/globals.css` | Modify | Dark palette, CRT scanlines, vignette, keyframes |
| `app/layout.tsx` | Modify | IBM Plex Mono font loading |
| `components/EchoGame.tsx` | Modify | All game UI: cards, layout, HUD, text, input, loading, ambient, hints, journal, toast |
| `components/LoginScreen.tsx` | Modify | Glowing title, terminal buttons |
| `components/SavesGrid.tsx` | Modify | Dark aesthetic, sharp corners |
| `components/SaveModal.tsx` | Modify | Dark aesthetic, sharp corners |
| `components/AuthModal.tsx` | Modify | Dark aesthetic, sharp corners |

---

### Task 1: Dark palette, CRT effects & keyframes

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace :root color variables**

In `app/globals.css`, replace the `:root` block (lines 5-15) with:

```css
:root {
  --color-background-primary: #0a0a0f;
  --color-background-secondary: #0f1118;
  --color-background-tertiary: #060609;
  --color-text-primary: #c8d6c8;
  --color-text-secondary: #6b7f6b;
  --color-text-tertiary: #3a4a3a;
  --color-border-secondary: #1a2a1a;
  --color-border-tertiary: #111a11;
  --color-accent-green: #00ff88;
  --color-accent-amber: #ffaa00;
  --color-accent-red: #ff2244;
  --color-accent-teal: #00ccaa;
  --color-glow-green: rgba(0, 255, 136, 0.15);
  --font-sans: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 2: Remove dark mode media query**

Delete the entire `@media (prefers-color-scheme: dark)` block (lines 17-28).

- [ ] **Step 3: Add CRT scanlines, vignette, and keyframes**

Append after the `body` rule:

```css
/* CRT scanlines */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 136, 0.015) 2px,
    rgba(0, 255, 136, 0.015) 4px
  );
  pointer-events: none;
  z-index: 9999;
}

/* Vignette */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.6) 100%);
  pointer-events: none;
  z-index: 9998;
}

/* Keyframes */
@keyframes typewriterCursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes glitchFlicker {
  0% { transform: translateX(0); filter: hue-rotate(0deg); }
  25% { transform: translateX(-2px); filter: hue-rotate(20deg); }
  50% { transform: translateX(1px); filter: hue-rotate(-10deg); }
  75% { transform: translateX(-1px); filter: hue-rotate(15deg); }
  100% { transform: translateX(0); filter: hue-rotate(0deg); }
}

@keyframes compliancePulse {
  0%, 100% { box-shadow: 0 0 4px rgba(0, 255, 136, 0.2); }
  50% { box-shadow: 0 0 12px rgba(0, 255, 136, 0.5); }
}
```

- [ ] **Step 4: Verify build**

Run:
```bash
npm run build
```
Expected: No errors. The app should now have a dark background with subtle scanlines.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat: dark cyberpunk palette with CRT scanlines and vignette"
```

---

### Task 2: IBM Plex Mono font

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add IBM Plex Mono import to layout.tsx**

At the top of `app/layout.tsx`, add the font import after existing imports:

```tsx
import { IBM_Plex_Mono } from 'next/font/google';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-mono',
});
```

- [ ] **Step 2: Apply font variable to html element**

In the `RootLayout` return, add the font variable class to `<html>`:

Change:
```tsx
<html lang="sv">
```
To:
```tsx
<html lang="sv" className={plexMono.variable}>
```

- [ ] **Step 3: Update body font-family in globals.css**

In `app/globals.css`, change the body rule's `font-family` from:
```css
font-family: var(--font-sans);
```
To:
```css
font-family: var(--font-mono, monospace);
```

- [ ] **Step 4: Verify build**

Run:
```bash
npm run build
```
Expected: No errors. All text should now render in IBM Plex Mono.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: load IBM Plex Mono as primary font"
```

---

### Task 3: Remove card aesthetic, wider layout, terminal input, loading

This task covers spec steps 3, 4, 8, and 9 in EchoGame.tsx — the structural changes that don't require understanding voice markers or HUD logic.

**Files:**
- Modify: `components/EchoGame.tsx`

- [ ] **Step 1: Wider layout (Step 4)**

At line ~1017, change:
```tsx
maxWidth: "680px"
```
To:
```tsx
maxWidth: "860px"
```

At line ~1016, change the desktop padding from:
```tsx
padding: isMobile ? "0.75rem 0.5rem 5rem" : "1.5rem 1rem 3rem"
```
To:
```tsx
padding: isMobile ? "0.75rem 0.5rem 5rem" : "2rem clamp(2rem, 8vw, 8rem) 3rem"
```

- [ ] **Step 2: Remove card styling from past scenes (Step 3)**

At lines ~1106-1121, the past scenes section renders each scene in a card with `background`, `border`, `borderRadius`. Replace the card wrapper styling with:

- Remove `background: "var(--color-background-primary)"`
- Remove `border: "0.5px solid var(--color-border-tertiary)"`
- Remove `borderRadius: isMobile ? "8px" : "12px"`
- Replace with `borderTop: "1px solid var(--color-border-tertiary)"`, `padding: "1rem 0"`, `opacity: 0.35`

For player action labels within past scenes (line ~1111), add `> ` prefix:
Change the player action text from plain text to:
```tsx
<span style={{ color: "var(--color-accent-green)" }}>&gt; </span>{action text}
```

- [ ] **Step 3: Remove card styling from current/streaming scenes (Step 3)**

At lines ~1124-1135 (streaming and current scene), remove:
- `background: "var(--color-background-primary)"`
- `border: "0.5px solid var(--color-border-tertiary)"`
- `borderRadius: isMobile ? "8px" : "12px"`

Replace with: `borderTop: "1px solid var(--color-border-secondary)"`, `padding: "1rem 0"`

- [ ] **Step 4: Remove card from map container (Step 3)**

At line ~1094, remove `borderRadius: "12px"` and any white/light background from the map container.

- [ ] **Step 5: Terminal-prompt input (Step 8)**

At lines ~1160-1171, replace the input section. Change from bordered input with borderRadius to:

```tsx
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
  <span style={{ color: "var(--color-accent-teal)", fontSize: "15px", fontWeight: 500 }}>&gt;</span>
  <input
    value={input}
    onChange={(e) => { setInput(e.target.value); if (e.target.value) setAmbientPaused(true); else setAmbientPaused(false); }}
    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendInput()}
    placeholder={isStreaming ? "ECHO skriver..." : "Vad gör du?"}
    disabled={isStreaming}
    style={{
      flex: 1,
      padding: "10px 0",
      fontSize: isMobile ? "16px" : "14px",
      border: "none",
      borderBottom: "1px solid var(--color-accent-teal)",
      borderRadius: 0,
      background: "transparent",
      color: "var(--color-accent-green)",
      caretColor: "var(--color-accent-green)",
      outline: "none",
      opacity: isStreaming ? 0.5 : 1,
      transition: "opacity 0.3s",
      fontFamily: "inherit",
      letterSpacing: "0.02em",
    }}
  />
</div>
```

Remove the send button entirely.

- [ ] **Step 6: Loading without card (Step 9)**

In the `EchoThinking` component (lines ~437-528), replace the card wrapper with:

- Remove `background`, `border`, `borderRadius`, `padding` card styling
- Replace dot animation with blinking block cursor:

```tsx
<span style={{
  display: "inline-block",
  width: "8px",
  height: "14px",
  background: "var(--color-accent-green)",
  animation: "typewriterCursor 1s step-end infinite",
}} />
```

- Change message color to `color: "var(--color-accent-green)"`, `fontSize: "12px"`

- [ ] **Step 7: Verify build**

Run:
```bash
npm run build
```
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: remove cards, wider layout, terminal input, minimal loading"
```

---

### Task 4: Diegetic HUD & ComplianceBar

Covers spec step 5 — transparent header, glowing ECHO title, teal nav, borderLeft status, glowing compliance.

**Files:**
- Modify: `components/EchoGame.tsx`

- [ ] **Step 1: Transparent header with gradient fade**

At lines ~1019-1059 (sticky header section), change the header background from:
```tsx
background: "var(--color-background-primary)"
```
To:
```tsx
background: "linear-gradient(to bottom, var(--color-background-primary) 60%, transparent)"
```

Remove any `borderBottom` on the header.

- [ ] **Step 2: ECHO title glow**

At line ~1039, change the ECHO title styling from:
```tsx
fontFamily: "Georgia, serif"
```
To:
```tsx
fontFamily: "var(--font-mono, monospace)",
fontSize: "13px",
textShadow: "0 0 8px rgba(0,255,136,0.5)",
color: "var(--color-accent-green)"
```

- [ ] **Step 3: Nav buttons with > prefix and teal**

At lines ~1042-1049, update nav button styling. Add `> ` prefix text before each label and change:
```tsx
color: "var(--color-text-tertiary)"
```
To:
```tsx
color: "var(--color-accent-teal)",
fontFamily: "var(--font-mono, monospace)"
```

- [ ] **Step 4: StatusRow — borderLeft instead of cards**

In the StatusRow component (lines ~130-205), for each status item, replace:
- `background: "var(--color-background-secondary)"`
- `borderRadius: "8px"`

With:
- `borderLeft: "2px solid var(--color-border-secondary)"`
- `background: "none"`
- `padding: "0.4rem 0.75rem"`

- [ ] **Step 5: ComplianceBar — glowing fill**

In the ComplianceBar component (lines ~78-127), add to the fill bar div:
```tsx
boxShadow: `0 0 8px ${color}66`
```

Where `color` is the existing compliance color variable.

- [ ] **Step 6: Neural dive indicator update**

Update the neural dive indicator (if present near line ~1089) from light purple card style to dark background with pulsing purple border:
```tsx
background: "rgba(83, 74, 183, 0.08)",
border: "1px solid rgba(83, 74, 183, 0.4)",
animation: "compliancePulse 2s ease-in-out infinite"
```

- [ ] **Step 7: Verify build**

Run:
```bash
npm run build
```
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: diegetic HUD with transparent header and glowing compliance"
```

---

### Task 5: Monospace SceneText & Voice Markers

Covers spec steps 6 and 7.

**Files:**
- Modify: `components/EchoGame.tsx`

- [ ] **Step 1: SceneText — monospace typography**

In the SceneText component (lines ~257-344), change:

```tsx
fontFamily: "Georgia, 'Times New Roman', serif"
```
To:
```tsx
fontFamily: "var(--font-mono, monospace)"
```

Set: `fontSize: "15px"`, `lineHeight: 1.75`, `letterSpacing: "0.02em"`

- [ ] **Step 2: SceneText — 8px block cursor**

In the streaming cursor element (line ~289), change:
```tsx
width: "2px", height: "1.1em", background: "var(--color-text-tertiary)"
```
To:
```tsx
width: "8px", height: "1.1em", background: "var(--color-accent-green)", animation: "typewriterCursor 1s step-end infinite"
```

Remove the inline `@keyframes blink` style tag if present (now using global `typewriterCursor`).

- [ ] **Step 3: Voice markers — ECHO with glow**

In VoiceSegmentRenderer (lines ~207-255), for the ECHO voice type, add:
```tsx
textShadow: "0 0 4px rgba(0,255,136,0.4)",
background: "rgba(0,255,136,0.03)"
```

Keep existing green borderLeft.

- [ ] **Step 4: Voice markers — TANKE with // prefix**

For the TANKE/thought voice type, add `// ` prefix:
```tsx
<span style={{ color: "var(--color-text-tertiary)", fontStyle: "normal" }}>// </span>
```

Ensure italic and reduced opacity are applied.

- [ ] **Step 5: Voice markers — DIALOG in teal**

For the DIALOG voice type, change speaker name color to:
```tsx
color: "var(--color-accent-teal)"
```

Change borderLeft to teal:
```tsx
borderLeft: "2px solid var(--color-accent-teal)"
```

- [ ] **Step 6: Verify build**

Run:
```bash
npm run build
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: monospace scene text with voice marker differentiation"
```

---

### Task 6: Ambient positioning, Action Hints & Journal

Covers spec steps 10 and 11.

**Files:**
- Modify: `components/EchoGame.tsx`

- [ ] **Step 1: Ambient fragments — fixed position on desktop**

At lines ~1141-1158, wrap the ambient fragment rendering in a responsive container:

Desktop (`!isMobile`):
```tsx
position: "fixed",
bottom: "120px",
right: "2rem",
maxWidth: "280px",
zIndex: 5
```

Mobile: keep current inline positioning.

Change font to monospace, `fontSize: "11px"`, `opacity: 0.4`, add `textShadow: "0 0 2px rgba(0,255,136,0.1)"`.

- [ ] **Step 2: Action hints — > prefix and teal**

In ActionHints (lines ~346-435), change the hint prefix from `— ` to:
```tsx
<span style={{ color: "var(--color-accent-teal)" }}>&gt; </span>
```

Change font to `fontFamily: "var(--font-mono, monospace)"`.

Add hover style consideration — teal text-shadow on hover (can be done with CSS class or inline onMouseEnter/onMouseLeave).

- [ ] **Step 3: Journal — // headers and prefix glyphs**

In the Journal component (lines ~531-598):

Change category headers from uppercase text to code-comment style:
```tsx
// KARAKTÄRER
// PLATSER
// HÄNDELSER
```

Add prefix glyphs to journal entries:
- Characters: `<span style={{ color: "var(--color-accent-teal)" }}>[K]</span>`
- Places: `<span style={{ color: "var(--color-accent-amber)" }}>[P]</span>`
- Events: `<span style={{ color: "var(--color-accent-red)" }}>[H]</span>`

- [ ] **Step 4: Verify build**

Run:
```bash
npm run build
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: peripheral ambient fragments, terminal hints, coded journal"
```

---

### Task 7: LoginScreen & secondary components

Covers spec step 12.

**Files:**
- Modify: `components/LoginScreen.tsx`
- Modify: `components/SavesGrid.tsx`
- Modify: `components/SaveModal.tsx`
- Modify: `components/AuthModal.tsx`

- [ ] **Step 1: LoginScreen — glowing title and terminal buttons**

In `components/LoginScreen.tsx` (41 lines):

ECHO title (line ~15-17): Change to:
```tsx
fontFamily: "var(--font-mono, monospace)",
fontSize: "28px",
color: "var(--color-accent-green)",
letterSpacing: "0.3em",
textShadow: "0 0 12px rgba(0,255,136,0.5)"
```

Buttons (lines ~23-36): Change to:
```tsx
borderRadius: "2px",
fontFamily: "var(--font-mono, monospace)",
border: "1px solid var(--color-accent-teal)",
color: "var(--color-accent-teal)",
letterSpacing: "0.06em"
```

Add `> ` prefix to button text.

- [ ] **Step 2: SavesGrid — dark aesthetic**

In `components/SavesGrid.tsx` (140 lines):

- Change all `borderRadius: "8px"` to `borderRadius: "2px"`
- Add `fontFamily: "var(--font-mono, monospace)"` to key elements
- Ensure dashed border on "new game" button uses dark palette colors
- Remove any light background colors that don't use CSS variables

- [ ] **Step 3: SaveModal — sharp corners**

In `components/SaveModal.tsx` (54 lines):

- Change `borderRadius: "12px"` to `borderRadius: "2px"`
- Add `fontFamily: "var(--font-mono, monospace)"` to modal
- Update button borders to use `var(--color-border-secondary)`

- [ ] **Step 4: AuthModal — sharp corners**

In `components/AuthModal.tsx` (125 lines):

- Change `borderRadius: "12px"` to `borderRadius: "2px"`
- Add `fontFamily: "var(--font-mono, monospace)"` to modal
- Update input styling: `borderRadius: "2px"`, dark background
- Update button styling to match terminal aesthetic

- [ ] **Step 5: Verify build**

Run:
```bash
npm run build
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add components/LoginScreen.tsx components/SavesGrid.tsx components/SaveModal.tsx components/AuthModal.tsx
git commit -m "feat: terminal aesthetic for login, saves, and modals"
```

---

### Task 8: Discovery Toast & Compliance Delta polish

Covers spec step 13.

**Files:**
- Modify: `components/EchoGame.tsx`

- [ ] **Step 1: DiscoveryToast — sharp corners and glow**

In DiscoveryToast (lines ~647-685):

Change:
```tsx
borderRadius: "10px"
```
To:
```tsx
borderRadius: "0"
```

Change border to:
```tsx
border: "1px solid var(--color-accent-green)"
```

Change boxShadow to:
```tsx
boxShadow: "0 0 12px rgba(0,255,136,0.15)"
```

Add entry animation:
```tsx
animation: "glitchFlicker 0.15s ease-out"
```

- [ ] **Step 2: ComplianceDelta — textShadow glow**

In ComplianceDelta (lines ~43-69), add textShadow matching the delta color:

```tsx
textShadow: `0 0 8px ${color}88`
```

Where `color` is the existing green/red color variable.

- [ ] **Step 3: Verify full build**

Run:
```bash
npm run build
```
Expected: No errors.

- [ ] **Step 4: Visual verification**

Run:
```bash
npm run dev
```
Open http://localhost:3000 and verify:
- Dark background with CRT scanlines
- IBM Plex Mono throughout
- No rounded cards — text on dark background
- Terminal `> ` input with teal underline
- ECHO glow, `//` TANKE, teal DIALOG
- 8px green block cursor during streaming
- Blinking `_` loading, no card
- Ambient fragments fixed right (desktop)
- Glowing ECHO login title
- Sharp toasts with green glow
- Mobile: responsive, sticky input, inline ambient
- Save/load still works

- [ ] **Step 5: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: glowing discovery toasts and compliance delta feedback"
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete cyberpunk UI transformation"
```
