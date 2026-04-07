# Pressure Timer & Game Over — Design Spec

## Overview

Add two tightly coupled systems to ECHO: a **Pressure Timer** that forces player action under time pressure in tense scenes, and a **Game Over** mechanic that ends the game when the player fails to survive. Both systems are AI-driven — Opus decides when pressure starts, how long the player has, how many chances they get, and when it's game over. No hardcoded rules or thresholds.

**Current state:** Neither system exists. The game currently waits indefinitely for player input.

## Scope

- Extend AI response format (`---STATE` block) with `pressure` and `gameOver` fields
- Extend system prompt with pressure/game over instructions
- Add countdown timer UI (inline, terminal-style)
- Add game over overlay (fullscreen, "SYSTEMFEL")
- Add auto-save on game start
- Add timeout auto-prompt mechanism
- Modify types, API route, and EchoGame component

## What This Does NOT Change

- Ambient system — unchanged
- Compliance logic — unchanged (AI still controls compliance normally)
- Save/load system — unchanged (only adding auto-save trigger)
- Auth flow — unchanged
- Map system — unchanged
- Voice markers — unchanged

---

## AI Response Format Changes

### Pressure Object (optional in `---STATE`)

```json
{
  "sceneType": "puls",
  "compliance": 780,
  "complianceDelta": -15,
  "pressure": {
    "seconds": 30,
    "label": "REAGERA",
    "consequence": "Titan bryter igenom dörren"
  },
  "hints": ["Barrikadera dörren", "Fly genom fönstret", "Göm dig"]
}
```

- `seconds` — countdown time (5–120). AI chooses based on narrative urgency.
- `label` — short imperative shown next to timer (e.g. "REAGERA", "SPRING", "GÖM DIG", "VÄLJ"). Max 15 characters.
- `consequence` — what happens if the player doesn't act. Forwarded to the frontend for auto-prompt construction, but never rendered to the player.

When `pressure` is absent, the game behaves as it does today — no timer, infinite wait.

### Game Over Flag (optional in `---STATE`)

```json
{
  "sceneType": "puls",
  "compliance": 0,
  "complianceDelta": -50,
  "gameOver": true,
  "hints": []
}
```

When `gameOver: true`, the scene text is the death scene — AI writes a short, definitive ending. No hints needed. No pressure object (the game is over).

### Rules for AI

- Pressure should be used sparingly — only when the narrative genuinely demands immediate action.
- AI may chain pressure scenes with escalating consequences (timeout → new pressure scene → timeout → ...).
- AI decides how many chances the player gets based on narrative plausibility.
- `gameOver` must always be preceded by at least one pressure scene — never instant death from a normal scene.
- `gameOver` should feel earned and narratively justified, not punitive.

---

## System Prompt Changes (`lib/echo-prompt.ts`)

Add a new section after the existing output format rules:

```
## PRESSURE & GAME OVER

Du kan lägga till ett "pressure"-objekt i STATE-blocket när scenen kräver omedelbar handling från spelaren.

pressure: {
  "seconds": 5-120 (hur lång tid spelaren har),
  "label": "REAGERA" (kort imperativ, max 15 tecken),
  "consequence": "Vad som händer om tiden rinner ut" (internt, visas ej)
}

Regler:
- Använd pressure SPARSAMT — bara i genuint brådskande situationer
- Du kan kedja pressure-scener: timeout → ny scen med ny pressure → timeout → ...
- Du bestämmer hur många chanser spelaren får baserat på vad som är narrativt rimligt
- Scentyp bör vara "puls" under pressure

Om situationen blir hopplös efter en eller flera pressure-timeouts, sätt "gameOver": true i STATE-blocket.
- Skriv en kort, definitiv dödsscen (40-80 ord)
- gameOver får ALDRIG komma utan att minst en pressure-scen har föregått den
- Inga hints behövs vid gameOver
- Compliance-värdet vid gameOver är irrelevant
- gameOver är INTE samma sak som compliance 0 (raderad). Compliance 0 är en narrativ fas, inte döden.

Om spelarens input börjar med [INGEN REAKTION] betyder det att tiden rann ut. Beskriv konsekvensen baserat på föregående pressure.consequence. Du kan eskalera med ny pressure eller avsluta med gameOver beroende på vad som är narrativt rimligt.
```

---

## Type Changes

### New type in `lib/types.ts`:

```typescript
interface PressureData {
  seconds: number;    // 5-120
  label: string;      // max 15 chars, e.g. "REAGERA"
  consequence: string; // what happens on timeout — forwarded to client, never rendered
}
```

### Extend `AIStateBlock` in `app/api/game/route.ts` (where it is defined locally):

```typescript
interface AIStateBlock {
  // ... existing fields ...
  pressure?: PressureData;
  gameOver?: boolean;
}
```

### Extend `Meta` in `lib/types.ts`:

```typescript
interface Meta {
  // ... existing fields ...
  pressure?: PressureData;
  gameOver?: boolean;
}
```

**Important:** `pressure` and `gameOver` are transient — they are NOT added to `GameState`. They flow through `Meta` only. `applyStateBlock()` should skip these fields when copying to `GameState`.

---

## API Route Changes (`app/api/game/route.ts`)

### Parsing

`parseStructuredResponse()` already extracts the full STATE JSON. No parsing changes needed — `pressure` and `gameOver` will be included automatically when present.

### Meta forwarding

In **both** the POST handler's and GET handler's `done` SSE event, forward the new fields:

```typescript
// In the done event payload:
meta: {
  // ... existing fields ...
  pressure: stateBlock.pressure || null,
  gameOver: stateBlock.gameOver || false,
}
```

Even though pressure on the opening scene is unlikely, both handlers must include the fields for type consistency.

### Timeout auto-prompt

When the frontend detects a timeout, it sends a new request with a special playerInput:

```
[INGEN REAKTION] Tiden rann ut. {consequence}. Beskriv vad som händer härnäst.
```

This uses the existing API endpoint — no new route needed. The system prompt instructs the AI how to interpret the `[INGEN REAKTION]` prefix.

---

## Frontend Changes (`components/EchoGame.tsx`)

### Pressure Timer

**State:**
```typescript
const [pressureTimer, setPressureTimer] = useState<number | null>(null);
const [pressureData, setPressureData] = useState<PressureData | null>(null);
const pressureIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

**Activation:** When a `done` SSE event arrives with `meta.pressure`:
1. Set `pressureData` to the pressure object
2. Store a `deadlineRef` as `Date.now() + pressure.seconds * 1000`
3. Start a `setInterval` (every 250ms) that computes remaining time as `Math.ceil((deadlineRef - Date.now()) / 1000)` and updates `pressureTimer` with the result (whole seconds). This avoids timer drift over long countdowns.

**On timeout (timer reaches 0):**
1. Clear the interval
2. Disable input (set a `pressureTimeout` flag)
3. Auto-submit: `[INGEN REAKTION] Tiden rann ut. {pressureData.consequence}. Beskriv vad som händer härnäst.`
4. Clear pressure state
5. Input re-enables when the auto-prompt response's `done` event arrives

**On player input during pressure:**
1. Clear the interval
2. Clear pressure state
3. Submit player input normally

**During streaming:** If a new response is actively streaming (from auto-prompt or otherwise), input remains disabled until the `done` event. If the new `done` event contains another `pressure` object, a new timer starts immediately.

**Cleanup:** The interval must be cleared on component unmount via `useEffect` return.

**UI rendering — inline timer below scene text:**
```tsx
{pressureData && pressureTimer !== null && (
  <div style={{
    fontSize: "13px",
    color: "var(--color-accent-red)",
    textShadow: "0 0 8px rgba(255,34,68,0.4)",
    fontFamily: "var(--font-mono)",
    marginTop: "1rem",
    animation: pressureTimer <= 10 ? "pulse 1s ease-in-out infinite" : "none",
  }}>
    <span style={{ color: "var(--color-text-tertiary)" }}>&gt;</span>
    {" "}{pressureData.label}{" "}
    <span style={{ fontSize: "18px", fontWeight: 600 }}>
      {formatTime(pressureTimer)}
    </span>
  </div>
)}
```

**Input border change during pressure:** `borderBottom` switches from `var(--color-accent-teal)` to `var(--color-accent-red)`.

**Timer formatting helper:**
```typescript
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

### Game Over Overlay

**State:**
```typescript
const [gameOver, setGameOver] = useState(false);
const [deathScene, setDeathScene] = useState<string>("");
```

**Activation:** When a `done` SSE event arrives with `meta.gameOver === true`:
1. Set `deathScene` to the scene text
2. After 1500ms delay, set `gameOver` to `true` (overlay fades in)

**UI — fullscreen overlay:**
```tsx
{gameOver && (
  <div style={{
    position: "fixed",
    inset: 0,
    background: "rgba(6,6,9,0.95)",
    zIndex: 10000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    animation: "fadeIn 0.5s ease-out",
  }}>
    {/* CRT scanlines */}
    <div style={{
      position: "absolute", inset: 0,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,34,68,0.02) 2px, rgba(255,34,68,0.02) 4px)",
      pointerEvents: "none",
    }} />
    {/* Vignette */}
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)",
      pointerEvents: "none",
    }} />

    <div style={{
      fontSize: "32px", color: "var(--color-accent-red)",
      letterSpacing: "0.3em",
      textShadow: "0 0 20px rgba(255,34,68,0.6), 2px 0 #ff2244, -2px 0 #00ccaa",
      marginBottom: "1.5rem",
    }}>SYSTEMFEL</div>

    <div style={{
      fontSize: "12px", color: "var(--color-text-tertiary)",
      letterSpacing: "0.15em", textTransform: "uppercase",
      marginBottom: "2rem",
    }}>Subjekt förlorad — compliance terminated</div>

    <div style={{
      fontSize: "14px", color: "var(--color-text-secondary)",
      lineHeight: 1.8, maxWidth: "400px", marginBottom: "2.5rem",
      textAlign: "left", borderLeft: "2px solid var(--color-accent-red)",
      paddingLeft: "1rem",
    }}>{deathScene}</div>

    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "260px" }}>
      <button onClick={handleLoadLastSave} style={{
        padding: "10px", fontSize: "12px",
        border: "1px solid var(--color-accent-red)", borderRadius: 0,
        background: "transparent", color: "var(--color-accent-red)",
        fontFamily: "inherit", letterSpacing: "0.06em", cursor: "pointer",
      }}>&gt; LADDA SENASTE SPARNING</button>
      <button onClick={handleReturnToMenu} style={{
        padding: "10px", fontSize: "12px",
        border: "1px solid var(--color-border-secondary)", borderRadius: 0,
        background: "transparent", color: "var(--color-text-tertiary)",
        fontFamily: "inherit", letterSpacing: "0.06em", cursor: "pointer",
      }}>&gt; HUVUDMENY</button>
    </div>
  </div>
)}
```

**Button handlers:**

- `handleLoadLastSave`:
  1. Call Supabase directly to fetch the user's most recent save (ordered by `updated_at DESC`, limit 1). This is a new query — the existing saves UI loads all saves for display, but we need a quick "get latest" fetch.
  2. If a save exists: parse its state and reset component state directly — `setScene(save.scene)`, `setHistory(save.history)`, `setState(save.state)`, reset `setMeta(...)` from the save's state. Clear `gameOver` and `deathScene`. Resume play.
  3. If no save exists (should not happen due to auto-save, but as fallback): show the button as disabled with text "> INGEN SPARNING HITTAD", leaving only the menu button active.

- `handleReturnToMenu`: Call `onMenu(false)` (the existing callback prop, with `false` indicating no unsaved changes since the game is over). This navigates to the login/start screen.

### Auto-Save on Game Start

When a new game is created and the first scene's `done` event arrives:
- If the user is authenticated: query Supabase for an existing save with name `"Auto-save"`. If found, update it via `updateSave(id, ...)`. If not found, call `createSave("Auto-save", ...)` directly (Supabase insert), bypassing the save modal and name prompt.
- If the user is NOT authenticated (guest): skip auto-save. On game over, the "LADDA SENASTE SPARNING" button will be disabled, and only "HUVUDMENY" is available. Guest users accept the risk of no respawn — this is acceptable since the auth prompt already appears when they try to manually save.
- Auto-save is silent — no toast notification.
- This ensures authenticated users always have a save to fall back on.

---

## New CSS (`app/globals.css`)

Add `pulse` keyframe (if not already present) and `fadeIn`:

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

## Accessibility

- Pressure timer element: `role="timer"` and `aria-live="assertive"` so screen readers announce the countdown.
- Game over overlay: trap focus within the overlay while visible (only two buttons are focusable).

---

## Verification

1. `npm run build` — no TypeScript/build errors
2. `npm run dev` → test in browser:
   - Normal scenes: no timer, no changes to existing behavior
   - Pressure scene (triggered by AI): inline timer appears, red glow, ticking down
   - Player input during pressure: timer clears, input submitted normally
   - Timeout: auto-prompt sent, AI responds (may chain more pressure or end normally)
   - Game over: death scene renders, 1.5s delay, fullscreen SYSTEMFEL overlay fades in
   - "Ladda senaste sparning": game resumes from last save
   - "Huvudmeny": returns to start screen
   - Auto-save: new game creates silent save immediately
3. Mobile: timer and game over overlay work on small screens
4. Existing features unaffected: compliance, ambient, voice markers, journal, hints
