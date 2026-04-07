# ECHO: Från hemsida till cyberpunk thriller

## Kontext

ECHO är ett AI-drivet textäventyr i Next.js/React som har stark narrativ design men presenteras med webbdesign-mönster (centrerad kolumn, vita kort med rundade hörn, Georgia serif, neutral färgpalett). Resultatet känns som en blogg/hemsida istället för ett immersivt cyberpunk-spel. Målet är att transformera den visuella upplevelsen utan att byta tech-stack.

**Rekommendation: Stanna i Next.js/React.** Att byta till Python (t.ex. Textual TUI) skulle innebära att förlora streaming, mobilstöd och den smidiga deploy-kedjan. Problemet är CSS/layout/typografi — inte ramverket.

---

## Filer att modifiera

| Fil | Ändring |
|-----|---------|
| `app/globals.css` | Mörk färgpalett, CRT-effekter, nya keyframes |
| `app/layout.tsx` | Monospace font-loading via next/font |
| `components/EchoGame.tsx` | Layout, typografi, kortborttagning, input, HUD |
| `components/LoginScreen.tsx` | Glödande titel, terminal-knappar |
| `components/SavesGrid.tsx` | Matchande mörk estetik |
| `components/SaveModal.tsx` | Matchande mörk estetik |
| `components/AuthModal.tsx` | Matchande mörk estetik |

---

## Steg 1: Färgpalett & atmosfär (`globals.css`)

**Ta bort** `prefers-color-scheme` media query. Ersätt med en enda mörk palette:

```css
:root {
  --color-background-primary: #0a0a0f;
  --color-background-secondary: #0f1118;
  --color-background-tertiary: #060609;
  --color-text-primary: #c8d6c8;      /* fosfor-grön */
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

**Lägg till CRT-scanlines** via `body::after` (repeating-linear-gradient, pointer-events: none, opacity ~0.03).

**Lägg till vignette** via `body::before` (radial-gradient, transparent center → mörka kanter).

**Nya keyframes:**
- `typewriterCursor` — blinkande blockcursor
- `glitchFlicker` — kort horisontell förskjutning + hue-rotate vid scenbyte
- `compliancePulse` — subtil glow-pulsering

---

## Steg 2: Monospace-font (`layout.tsx`)

Använd `next/font/google` för **IBM Plex Mono** (designad för läsbarhet i monospace):

```tsx
import { IBM_Plex_Mono } from 'next/font/google';
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['300','400','500','600'], variable: '--font-mono' });
```

Applicera `className={plexMono.variable}` på `<html>`. Uppdatera `body { font-family: var(--font-mono); }` i globals.css.

---

## Steg 3: Ta bort kort-estetik (`EchoGame.tsx`)

**Nuvarande:** Scener renderas i rundade kort med `background`, `border`, `borderRadius: 12px`.

**Ändra:**
- **Past scenes** (rad ~1106-1121): Ta bort kort-wrapper. Använd enkel `border-top: 1px solid var(--color-border-tertiary)` mellan scener. Player actions med `> ` prefix i grön accent.
- **Current scene** (rad ~1124-1135): Ta bort all kort-styling. Ren text mot mörk bakgrund, differentierad via opacity (1.0 vs 0.35 för gamla).
- **Streaming scene**: Samma — ingen kort-wrapper.
- **Map container** (rad ~1094): Ta bort `borderRadius: 12px` och vit bakgrund.

---

## Steg 4: Layout — bredare & mer immersiv (`EchoGame.tsx`)

- Ändra `maxWidth: "680px"` → `maxWidth: "860px"`
- Bredare padding: `padding: "2rem clamp(2rem, 8vw, 8rem) 3rem"`
- Känslan: mer utrymme att andas, mindre "bloggartikel"

---

## Steg 5: HUD som diegetiskt overlay (`EchoGame.tsx`)

**Header (rad ~1019-1090):**
- Ta bort solid `background` → transparent med gradient-fade
- ECHO-titel: monospace, `fontSize: 13px`, `textShadow: "0 0 8px var(--color-accent-green)"`
- Nav-knappar: prefix med `>`, färg `var(--color-accent-teal)`, monospace
- Neural dive: mörk bakgrund med pulserande lila border istället för ljuslila kort
- StatusRow: ta bort bakgrund/borderRadius, använd `borderLeft` istället
- ComplianceBar: glödande fill med `boxShadow`

---

## Steg 6: Typografi i SceneText (`EchoGame.tsx`)

- Byt från `Georgia, serif` till `var(--font-mono)` för narrativ text
- `fontSize: 15px`, `lineHeight: 1.75`, `letterSpacing: 0.02em`
- Streaming-cursor: bredare block (`8px`) i accent-grön med `typewriterCursor` animation
- Ny paragraf-animation: kort `glitchFlicker 0.15s` → sedan fade-in

---

## Steg 7: Voice markers — dramatisk differentiering (`EchoGame.tsx`)

- **ECHO**: `textShadow: "0 0 4px ${color}"`, subtil grön bakgrundswash
- **TANKE**: `//` prefix i tertiärfärg, italic, dämpad opacity
- **DIALOG**: Namn i `var(--color-accent-teal)`, monospace, tydlig hierarki

---

## Steg 8: Terminal-prompt input (`EchoGame.tsx`)

- `background: transparent`, `border: none`, bara `borderBottom: 1px solid var(--color-accent-teal)`
- `borderRadius: 0` (skarpt, inte rundat)
- `> ` prompt-prefix före input
- `color: var(--color-accent-green)`, `caretColor: var(--color-accent-green)`
- Skicka-knapp: `[SEND]` i monospace eller göm (Enter fungerar redan)

---

## Steg 9: Loading-state utan kort (`EchoGame.tsx`)

- Ta bort card container från `EchoThinking`
- Blinkande `_` blockcursor + laddningsmeddelande i monospace
- `color: var(--color-accent-green)`, `fontSize: 12px`
- Befintliga meddelanden är redan perfekta ("Skannar omgivande zoner...")

---

## Steg 10: Ambient fragments som perifer atmosfär (`EchoGame.tsx`)

- Desktop: `position: fixed`, `bottom: 120px`, `right: 2rem`, `maxWidth: 280px`
- Monospace, `fontSize: 11px`, `opacity: 0.4`, subtil grön textShadow
- Mobil: behåll inline (fixed positioning för trångt)
- Känslan: avlyssnade transmissioner i periferin

---

## Steg 11: Action hints & Journal (`EchoGame.tsx`)

- Action hints: monospace, `>` prefix istället för `—`, teal hover-glow
- Journal: `// KARAKTÄRER` som code-comment headers, prefix-glyfer `[K]` `[P]` `[H]`

---

## Steg 12: LoginScreen & sekundära komponenter

- **LoginScreen**: ECHO-titel i monospace med grön glow (`textShadow`), `letterSpacing: 0.3em`
- Knappar: skarpa hörn (`borderRadius: 2px`), monospace, teal borders
- **SavesGrid/Modals**: Samma mörka palette, monospace, skarpa hörn, inga rundade kort

---

## Steg 13: Discovery toast & compliance delta

- Toast: skarpa hörn, grön border + glow, kort glitch-animation vid entry
- Compliance delta: `textShadow` glow, skärmflash vid stora negativa förändringar

---

## Verifiering

1. `npm run build` — säkerställ inga TypeScript/build-fel
2. `npm run dev` → testa i browser:
   - Splash screen: glödande ECHO-titel, mörk bakgrund
   - Spelet: kontinuerligt textflöde utan kort, terminal-input
   - HUD: diegetiskt overlay, inte navbar
   - Streaming: grön blockcursor, atmosfärisk loading
   - Ambient: perifera fragment (desktop: höger kant)
   - Mobil: responsiv layout, sticky input funkar
3. Verifiera att spara/ladda fortfarande fungerar
4. Testa voice markers (ECHO/TANKE/DIALOG) renderas korrekt med nya stilar
