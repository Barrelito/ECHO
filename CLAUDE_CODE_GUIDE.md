# ECHO — Installationsguide för Claude Code

## Förutsättningar
- Next.js 14+ med App Router
- TypeScript
- Anthropic SDK installerat

## Installation

```bash
# 1. Skapa nytt Next.js-projekt om du inte har ett
npx create-next-app@latest echo-game --typescript --app --tailwind

# 2. Installera Anthropic SDK
cd echo-game
npm install @anthropic-ai/sdk
```

## Filstruktur

Kopiera dessa filer till ditt projekt:

```
echo-game/
├── app/
│   ├── api/
│   │   └── game/
│   │       └── route.ts          ← API-motorn (Opus-anrop, state-hantering)
│   └── page.tsx                  ← Startsidan
├── components/
│   └── EchoGame.tsx              ← Spel-UI (startskärm + spelvy)
└── lib/
    └── echo-prompt.ts            ← Systemprompt som TypeScript-konstant
```

## Miljövariabler

Skapa `.env.local` i projektets rot:

```env
ANTHROPIC_API_KEY=din_api_nyckel_här
```

## Starta

```bash
npm run dev
```

Öppna `http://localhost:3000` — klicka "STARTA SPELET".

---

## Arkitektur

### API Route (`app/api/game/route.ts`)

**GET** — Ny spelsession. Anropar Opus och returnerar öppningsscenen.

**POST** — Fortsätt spel. Tar emot:
```typescript
{
  playerInput: string,      // Vad spelaren skrev
  history: GameMessage[],   // Senaste 20 turerna
  state: GameState          // Compliance, plats, flaggor etc.
}
```

Returnerar:
```typescript
{
  scene: string,            // Scentext från Opus
  state: GameState,         // Uppdaterat speltillstånd
  meta: { ... }             // Plats, tid, compliance för UI
}
```

### State-hantering

`GameState` lever i React-state på klienten och skickas med varje anrop.
Ingen databas behövs för MVP. När du vill spara spel — lägg till Supabase.

### Compliance-logik

`parseStateUpdates()` i route.ts hanterar compliance-förändringar baserat på
nyckelord i spelarens input. Bygg ut den med fler mönster efter hand.

---

## Nästa steg

### 1. Spara spel (Supabase)
```typescript
// Lägg till i route.ts POST handler
await supabase.from('saves').upsert({
  user_id: userId,
  state: updatedState,
  history: newHistory,
  updated_at: new Date()
})
```

### 2. Ambient ljud
Lägg till Howler.js och trigga olika soundscapes baserat på `meta.location`.

### 3. Streaming
Ersätt `client.messages.create()` med `client.messages.stream()` för
token-för-token rendering — känslan av att text skrivs fram i realtid.

```typescript
const stream = await client.messages.stream({
  model: "claude-opus-4-5",
  // ...
});

// Använd ReadableStream i Next.js för SSE till klienten
```

### 4. Multiplayer (Pusher / Supabase Realtime)
Dela spelvärldens kanoniska händelser mellan spelare.
Var och en lever sin unika historia — men Kymlinges massaker sker för alla.

---

## Modellval

Spelet använder `claude-opus-4-5` (Opus) för bästa narrativ kvalitet.

För kostnadsoptimering längre fram:
- Opus för kritiska scenövergångar och boss-karaktärer (Evelyn, Kane, Marcus)  
- Sonnet för vardagsinteraktioner med NPC:er och platsbeskrivningar
- Haiku för compliance-beräkningar och metadata-extraktion

Byt modell i `route.ts` per anropstyp när du är redo att optimera.
