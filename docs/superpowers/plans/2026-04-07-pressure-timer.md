# Pressure Timer & Game Over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-driven countdown timer for tense scenes and a game over mechanic with fullscreen overlay and respawn from last save.

**Architecture:** Extend the existing `---STATE` JSON block with optional `pressure` and `gameOver` fields. The AI decides when to use them. Frontend handles countdown, auto-prompt on timeout, and game over overlay. Auto-save on game start ensures there's always a save to respawn from.

**Tech Stack:** Next.js 14, React 18, TypeScript, Supabase (saves), Anthropic Claude API

**Spec:** `docs/superpowers/specs/2026-04-07-pressure-timer-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/types.ts` | Modify | Add `PressureData` interface, extend `Meta` |
| `app/api/game/route.ts` | Modify | Extend `AIStateBlock`, forward `pressure`/`gameOver` in meta for both GET and POST |
| `lib/echo-prompt.ts` | Modify | Add PRESSURE & GAME OVER section to system prompt |
| `lib/saves.ts` | Modify | Add `getLatestSave()` and `upsertAutoSave()` helpers |
| `app/globals.css` | Modify | Add `pulse` and `fadeIn` keyframes |
| `components/EchoGame.tsx` | Modify | Pressure timer UI, game over overlay, auto-save trigger, timeout auto-prompt |

---

### Task 1: Types & API — Wire pressure/gameOver through the data layer

**Files:**
- Modify: `lib/types.ts`
- Modify: `app/api/game/route.ts`

This task adds the data types and ensures pressure/gameOver flow from AI response → parsed state → SSE meta → frontend.

- [ ] **Step 1: Add `PressureData` interface and extend `Meta` in `lib/types.ts`**

Add after the existing `Meta` interface (line 39):

```typescript
export interface PressureData {
  seconds: number;
  label: string;
  consequence: string;
}
```

Add to the `Meta` interface (after `newFlags`):

```typescript
  pressure?: PressureData | null;
  gameOver?: boolean;
```

- [ ] **Step 2: Extend `AIStateBlock` in `app/api/game/route.ts`**

The `AIStateBlock` interface is defined locally at line 42. Add after `ambientHook`:

```typescript
  pressure?: { seconds: number; label: string; consequence: string };
  gameOver?: boolean;
```

Also add the import for `PressureData`:

```typescript
import type { GameState, GameMessage, GameRequest, SceneType, PressureData } from "@/lib/types";
```

- [ ] **Step 3: Forward pressure/gameOver in POST handler meta**

In the POST handler's `done` SSE event (around line 158-176), add to the meta object:

```typescript
pressure: stateBlock?.pressure ?? null,
gameOver: stateBlock?.gameOver ?? false,
```

- [ ] **Step 4: Forward pressure/gameOver in GET handler meta**

In the GET handler's `done` SSE event (around line 276-291), add to the meta object:

```typescript
pressure: stateBlock?.pressure ?? null,
gameOver: stateBlock?.gameOver ?? false,
```

- [ ] **Step 5: Ensure `applyStateBlock` skips pressure/gameOver**

Verify that `applyStateBlock()` (lines 73-95) does NOT copy `pressure` or `gameOver` to `GameState`. Since it only copies explicitly listed fields (location, time, compliance, etc.), this should already be the case — no code change needed, just verification.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: No TypeScript errors. The new types compile cleanly.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts app/api/game/route.ts
git commit -m "feat: add PressureData type and wire pressure/gameOver through API"
```

---

### Task 2: System Prompt — Teach AI about pressure and game over

**Files:**
- Modify: `lib/echo-prompt.ts`

- [ ] **Step 1: Add PRESSURE & GAME OVER section to system prompt**

Insert the following section after the `COMPLIANCE-RIKTLINJER` block (after line 551, before the closing backtick):

```typescript
## PRESSURE & GAME OVER

Du kan lägga till ett "pressure"-objekt i STATE-blocket när scenen kräver omedelbar handling från spelaren.

pressure: {
  "seconds": 5-120 (hur lång tid spelaren har),
  "label": "REAGERA" (kort imperativ, max 15 tecken),
  "consequence": "Vad som händer om tiden rinner ut" (internt, visas ej för spelaren)
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

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/echo-prompt.ts
git commit -m "feat: add pressure timer and game over instructions to system prompt"
```

---

### Task 3: CSS Keyframes — Add pulse and fadeIn animations

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add keyframes to globals.css**

Add at the end of the file (before any closing braces):

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

Check first whether `pulse` or `fadeIn` already exist in the file to avoid duplicates.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add pulse and fadeIn keyframes for pressure timer"
```

---

### Task 4: Save Helpers — Add getLatestSave and upsertAutoSave

**Files:**
- Modify: `lib/saves.ts`

- [ ] **Step 1: Add `getLatestSave` function**

Add after the existing `getSaves` function:

```typescript
export async function getLatestSave(): Promise<SaveData | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}
```

- [ ] **Step 2: Add `upsertAutoSave` function**

Add after `getLatestSave`:

```typescript
export async function upsertAutoSave(
  state: GameState,
  history: GameMessage[],
  scene: string
): Promise<SaveData | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check for existing auto-save
  const { data: existing } = await supabase
    .from("game_saves")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Auto-save")
    .limit(1)
    .single();

  if (existing) {
    // Update existing auto-save
    const { error } = await supabase
      .from("game_saves")
      .update({
        state,
        history: history.slice(-MAX_HISTORY_MESSAGES),
        scene,
      })
      .eq("id", existing.id);
    if (error) return null;
    return { ...existing, state, history, scene } as SaveData;
  } else {
    // Create new auto-save (check limit first)
    const { count } = await supabase
      .from("game_saves")
      .select("id", { count: "exact", head: true });

    if (count !== null && count >= MAX_SAVES) return null;

    const { data, error } = await supabase
      .from("game_saves")
      .insert({
        user_id: user.id,
        name: "Auto-save",
        state,
        history: history.slice(-MAX_HISTORY_MESSAGES),
        scene,
      })
      .select()
      .single();

    if (error || !data) return null;
    return data;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/saves.ts
git commit -m "feat: add getLatestSave and upsertAutoSave helpers for game over respawn"
```

---

### Task 5: Pressure Timer UI — Countdown display and timeout auto-prompt

**Files:**
- Modify: `components/EchoGame.tsx`

This is the core frontend task. Add the pressure timer state, countdown logic, auto-prompt on timeout, and the inline timer UI.

- [ ] **Step 1: Add imports and helper function**

At the top of `EchoGame.tsx`, add to the import from `@/lib/types`:

```typescript
import type { GameState, GameMessage, Meta, SaveData, PressureData } from "@/lib/types";
```

Add `formatTime` helper function before the `EchoGame` component (around line 730):

```typescript
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Add pressure state variables**

Inside the `EchoGame` component, after the existing state declarations (after line 780 area), add:

```typescript
// Pressure timer state
const [pressureTimer, setPressureTimer] = useState<number | null>(null);
const [pressureData, setPressureData] = useState<PressureData | null>(null);
const pressureIntervalRef = useRef<NodeJS.Timeout | null>(null);
const pressureDeadlineRef = useRef<number | null>(null);
```

- [ ] **Step 3: Add pressure timer cleanup**

Add a cleanup function and useEffect after the ambient cleanup (around line 894):

```typescript
function clearPressure() {
  if (pressureIntervalRef.current) {
    clearInterval(pressureIntervalRef.current);
    pressureIntervalRef.current = null;
  }
  pressureDeadlineRef.current = null;
  setPressureTimer(null);
  setPressureData(null);
}

// Cleanup pressure timer on unmount
useEffect(() => {
  return () => {
    if (pressureIntervalRef.current) clearInterval(pressureIntervalRef.current);
  };
}, []);
```

- [ ] **Step 4: Add `startPressureTimer` function**

Add after `clearPressure`:

```typescript
function startPressureTimer(pressure: PressureData) {
  clearPressure();
  setPressureData(pressure);
  setPressureTimer(pressure.seconds);
  pressureDeadlineRef.current = Date.now() + pressure.seconds * 1000;

  pressureIntervalRef.current = setInterval(() => {
    if (!pressureDeadlineRef.current) return;
    const remaining = Math.ceil((pressureDeadlineRef.current - Date.now()) / 1000);
    if (remaining <= 0) {
      clearPressure();
      // Auto-submit timeout
      const consequence = pressure.consequence;
      sendInput(`[INGEN REAKTION] Tiden rann ut. ${consequence}. Beskriv vad som händer härnäst.`);
    } else {
      setPressureTimer(remaining);
    }
  }, 250);
}
```

**Note:** `sendInput` is already defined in the component. The `overrideText` parameter allows passing text directly.

**Important:** When pressure is active and a scene arrives, skip `enterRevealMode` — show all paragraphs immediately. Time pressure is incompatible with paragraph-by-paragraph reveal.

- [ ] **Step 5: Hook pressure into the `done` event handlers**

In the `startGame` function's `onDone` callback (around line 937-943), add pressure activation:

```typescript
// After existing onDone logic:
if (newMeta.pressure) {
  startPressureTimer(newMeta.pressure);
}
```

In the `sendInput` function's `onDone` callback (around line 986-991), add:

```typescript
// After existing onDone logic:
if (newMeta.pressure) {
  startPressureTimer(newMeta.pressure);
}
```

- [ ] **Step 6: Clear pressure when player submits input**

In `sendInput` function, at the top (around line 949 after the early return), add:

```typescript
// Clear any active pressure timer when player acts
clearPressure();
```

Also clear pressure in `stopAmbient` is NOT needed — pressure and ambient are independent systems.

- [ ] **Step 7: Add pressure timer UI**

In the render section, add the pressure timer display **after** the current scene block and **before** the action hints (around line 1136, between the current scene div and the hints):

```tsx
{/* Pressure timer */}
{pressureData && pressureTimer !== null && (
  <div
    role="timer"
    aria-live="assertive"
    style={{
      fontSize: "13px",
      color: "var(--color-accent-red)",
      textShadow: "0 0 8px rgba(255,34,68,0.4)",
      fontFamily: "var(--font-mono, monospace)",
      marginTop: "-0.5rem",
      marginBottom: "1rem",
      animation: pressureTimer <= 10 ? "pulse 1s ease-in-out infinite" : "none",
    }}
  >
    <span style={{ color: "var(--color-text-tertiary)" }}>&gt;</span>
    {" "}{pressureData.label}{" "}
    <span style={{ fontSize: "18px", fontWeight: 600 }}>
      {formatTime(pressureTimer)}
    </span>
  </div>
)}
```

- [ ] **Step 8: Change input border color during pressure**

In the input element's style (around line 1176), change the `borderBottom` to be dynamic:

```typescript
borderBottom: `1px solid ${pressureData ? "var(--color-accent-red)" : "var(--color-accent-teal)"}`
```

- [ ] **Step 9: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: add pressure timer countdown UI with timeout auto-prompt"
```

---

### Task 6: Game Over Overlay — Death screen with respawn

**Files:**
- Modify: `components/EchoGame.tsx`
- Read: `lib/saves.ts` (for `getLatestSave`)

- [ ] **Step 1: Add game over state and imports**

Add import at top:

```typescript
import { getLatestSave } from "@/lib/saves";
```

Add state variables (near the pressure state):

```typescript
// Game over state
const [gameOver, setGameOver] = useState(false);
const [deathScene, setDeathScene] = useState("");
```

- [ ] **Step 2: Hook gameOver detection into done handlers**

In both `startGame` and `sendInput` done callbacks, add (after the pressure check):

```typescript
if (newMeta.gameOver) {
  setDeathScene(accumulated);
  setTimeout(() => setGameOver(true), 1500);
}
```

- [ ] **Step 3: Add handleLoadLastSave function**

Add after the `handleSave` callback:

```typescript
async function handleLoadLastSave() {
  const save = await getLatestSave();
  if (!save) return;
  setScene(save.scene);
  setHistory(save.history);
  setState(save.state);
  setMeta({
    location: save.state.location,
    time: save.state.time,
    compliance: save.state.compliance,
    inNeuralDive: save.state.inNeuralDive,
    echoAwareness: save.state.echoAwareness,
  });
  setPastScenes([]);
  setHints([]);
  setGameOver(false);
  setDeathScene("");
  clearPressure();
  startAmbient();
}
```

- [ ] **Step 4: Add game over overlay JSX**

Add at the very end of the component's return, just before the closing `</div>` of the outermost wrapper (before line 1197):

```tsx
{/* Game Over overlay */}
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
    fontFamily: "var(--font-mono, monospace)",
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
      position: "relative",
    }}>SYSTEMFEL</div>

    <div style={{
      fontSize: "12px", color: "var(--color-text-tertiary)",
      letterSpacing: "0.15em", textTransform: "uppercase",
      marginBottom: "2rem",
      position: "relative",
    }}>Subjekt förlorad — compliance terminated</div>

    <div style={{
      fontSize: "14px", color: "var(--color-text-secondary)",
      lineHeight: 1.8, maxWidth: "400px", marginBottom: "2.5rem",
      textAlign: "left", borderLeft: "2px solid var(--color-accent-red)",
      paddingLeft: "1rem",
      position: "relative",
    }}>{cleanSceneText(deathScene)}</div>

    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "260px", position: "relative" }}>
      <button
        onClick={handleLoadLastSave}
        disabled={!user}
        style={{
          padding: "10px", fontSize: "12px",
          border: "1px solid var(--color-accent-red)", borderRadius: 0,
          background: "transparent",
          color: user ? "var(--color-accent-red)" : "var(--color-text-tertiary)",
          fontFamily: "inherit", letterSpacing: "0.06em",
          cursor: user ? "pointer" : "not-allowed",
          textShadow: user ? "0 0 4px rgba(255,34,68,0.3)" : "none",
          opacity: user ? 1 : 0.4,
        }}>{user ? "> LADDA SENASTE SPARNING" : "> INGEN SPARNING TILLGÄNGLIG"}</button>
      {onMenu && (
        <button onClick={() => onMenu(false)} style={{
          padding: "10px", fontSize: "12px",
          border: "1px solid var(--color-border-secondary)", borderRadius: 0,
          background: "transparent", color: "var(--color-text-tertiary)",
          fontFamily: "inherit", letterSpacing: "0.06em", cursor: "pointer",
        }}>&gt; HUVUDMENY</button>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Disable input and hints during game over**

The game over overlay covers everything (z-index 10000), so input is already inaccessible. No additional changes needed.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: add fullscreen SYSTEMFEL game over overlay with respawn"
```

---

### Task 7: Auto-Save on Game Start

**Files:**
- Modify: `components/EchoGame.tsx`
- Read: `lib/saves.ts` (for `upsertAutoSave`)

- [ ] **Step 1: Add upsertAutoSave import**

Add to existing import from `@/lib/saves`:

```typescript
import { getLatestSave, upsertAutoSave } from "@/lib/saves";
```

- [ ] **Step 2: Add `useAuth` import and hook**

Add import:

```typescript
import { useAuth } from "@/components/AuthProvider";
```

Inside the component, add:

```typescript
const { user } = useAuth();
```

- [ ] **Step 3: Trigger auto-save in startGame's done callback**

In `startGame`'s `onDone` callback (around line 937-943), add after `onStateChange`:

```typescript
// Silent auto-save for authenticated users
if (user) {
  upsertAutoSave(newState, [], accumulated).catch(() => {});
}
```

The empty history `[]` is correct — it's the first scene, no history yet. The `.catch(() => {})` silences any errors (auto-save failure is non-critical).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: add silent auto-save on game start for authenticated users"
```

---

### Task 8: Integration Verification & Push

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 2: Manual testing checklist**

Start dev server with `npm run dev` and verify:

1. **Normal scene:** No timer visible, game works as before
2. **Type check:** Open browser DevTools, verify no console errors
3. **Auto-save:** Start new game while logged in, check Supabase for "Auto-save" entry
4. **Input styling:** Input has teal border normally
5. **Game over overlay:** Would need AI to trigger `gameOver: true` — verify the overlay renders by temporarily adding `setGameOver(true); setDeathScene("Test death scene")` to a button click handler, then remove the test code
6. **Respawn:** In the test overlay, click "LADDA SENASTE SPARNING" — verify it loads the save
7. **Menu button:** Click "HUVUDMENY" — verify it returns to start screen

- [ ] **Step 3: Commit any fixes**

If any issues found during testing, fix and commit.

- [ ] **Step 4: Push to main**

```bash
git push origin main
```
