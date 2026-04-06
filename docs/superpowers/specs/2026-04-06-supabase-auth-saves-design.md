# ECHO — Supabase Auth & Save System Design

## Overview

Add user authentication (GitHub OAuth + email/password) and persistent game saves to the ECHO MUD game. Players can create accounts, save multiple playthroughs, and resume them later. Guest mode allows playing without an account, with seamless upgrade to a full account when the player wants to save.

## Architecture: Supabase Client-Side with RLS

All auth and save operations happen directly from the React client via `@supabase/ssr`. No server-side API routes needed for saves — Row Level Security ensures each player only accesses their own data. The game API (`/api/game/route.ts`) remains unchanged.

**Dependencies:** `@supabase/supabase-js`, `@supabase/ssr`

## Data Model

### `game_saves` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK, default gen_random_uuid()) | Auto-generated |
| `user_id` | uuid (FK → auth.users, NOT NULL) | Owner |
| `name` | text (NOT NULL) | Player-chosen name, e.g. "Motståndsrutten" |
| `state` | jsonb (NOT NULL) | Full GameState object |
| `history` | jsonb (NOT NULL, default '[]') | Conversation history (GameMessage[]) |
| `scene` | text (NOT NULL, default '') | Latest scene text |
| `created_at` | timestamptz (default now()) | Created |
| `updated_at` | timestamptz (default now()) | Last saved |

### RLS Policies

- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`
- UPDATE: `user_id = auth.uid()`
- DELETE: `user_id = auth.uid()`

## Auth Flow

### Login options
1. **Email/password** — `supabase.auth.signInWithPassword()` / `signUp()`
2. **GitHub OAuth** — `supabase.auth.signInWithOAuth({ provider: 'github' })` with callback route

### OAuth callback
- `app/auth/callback/route.ts` — exchanges code for session, redirects to `/`

### User states
- **Not authenticated (guest):** Can play the game. "SPARA" button triggers auth modal.
- **Authenticated:** Sees saves grid on load. Can save/load freely.

## UI Flow

### Entry point (`app/page.tsx` orchestrates)

```
Page load
├─ Show splash (LoginScreen)
│  ├─ "Logga in" → AuthModal → on success → SavesGrid
│  └─ "Spela som gäst" → EchoGame (no save props)
│
├─ If already authenticated
│  └─ SavesGrid
│     ├─ Click save card → EchoGame (with loaded state/history/scene)
│     └─ "+ Nytt spel" → EchoGame (fresh game via GET /api/game)
```

### In-game UI changes to EchoGame

Header gains two discrete text buttons:
- **SPARA** — saves current game
  - First save: opens SaveModal for naming → `createSave()`
  - Subsequent: silent `updateSave()` with brief confirmation
  - Guest: opens AuthModal → after login → SaveModal → `createSave()`
- **MENY** — returns to SavesGrid

### Guest-to-account upgrade

1. Guest clicks "SPARA" in header
2. AuthModal opens (login or register)
3. After successful auth, SaveModal opens for naming
4. Current in-memory state/history/scene is preserved and saved
5. Player continues playing — now authenticated

## New Files

| File | Purpose |
|------|---------|
| `lib/types.ts` | Shared types: GameState, GameMessage, Meta |
| `lib/supabase.ts` | Creates Supabase browser client via `createBrowserClient` (singleton) |
| `lib/saves.ts` | CRUD functions: `getSaves`, `createSave`, `updateSave`, `deleteSave` |
| `components/AuthProvider.tsx` | React context holding `user \| null`, listens to `onAuthStateChange` |
| `components/LoginScreen.tsx` | Splash screen with "Logga in" / "Spela som gäst" buttons |
| `components/AuthModal.tsx` | Modal with email/password form + GitHub button + toggle login/register |
| `components/SavesGrid.tsx` | Grid of save cards (compliance number as visual focus) + "Nytt spel" |
| `components/SaveModal.tsx` | Name input modal for first save |
| `app/auth/callback/route.ts` | GitHub OAuth callback handler |

## Modified Files

| File | Changes |
|------|---------|
| `app/page.tsx` | Orchestrates full flow: splash → auth → saves → game |
| `app/layout.tsx` | Wraps children in `<AuthProvider>` |
| `components/EchoGame.tsx` | Accepts save props, adds SPARA/MENY to header, exposes current state for saving |
| `app/api/game/route.ts` | Import types from `lib/types.ts` instead of defining locally |

## Supabase Project Setup

Required configuration in Supabase dashboard:
1. Enable Email provider (email/password sign-in)
2. Enable GitHub provider (add OAuth app client ID + secret)
3. Create `game_saves` table with schema above
4. Enable RLS on `game_saves` with policies above
5. Add redirect URL for OAuth callback

Environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Shared Types

Extract `GameState`, `GameMessage`, and `Meta` into `lib/types.ts` so both the API route and client components import from the same source. This replaces the current pattern of importing types from `@/app/api/game/route`.

## Constraints

- **Max saves per user:** 10. When limit is reached, "Nytt spel" is disabled with a message: "Radera ett sparat spel för att skapa ett nytt."
- **History cap:** Save at most the last 40 messages (matching the API's effective context window of `slice(-20)` × 2 roles). Truncate at save time.
- **`scene` column rationale:** Kept separate from history to render SavesGrid card previews without parsing the full history jsonb. Derived from the last assistant message at save time.
- **Email verification:** Disabled in Supabase dashboard. Players can use their account immediately after signup.
- **Supabase client:** Singleton per page lifecycle in `lib/supabase.ts`.
- **OAuth redirect URLs:** Register production URL only. Preview deployments use email/password auth only.

## Error Handling

- **Save failure (network/Supabase):** Show a toast-style message: "Kunde inte spara. Försök igen." Game state remains intact in memory. No retry — player clicks SPARA again manually.
- **Auth failure:** Show error text inline in the AuthModal (e.g., "Fel lösenord", "E-post redan registrerad", "GitHub-inloggning avbröts"). Modal stays open.
- **Session expiry:** `onAuthStateChange` detects token refresh failure. Show a non-blocking banner: "Din session har gått ut — logga in igen för att spara." Player can continue playing as guest.
- **MENY with unsaved changes:** If changes exist since last save, show a confirmation: "Du har osparad progress. Vill du lämna ändå?" with "Spara & lämna" / "Lämna utan att spara" / "Avbryt".
- **MENY for guests:** Returns to splash screen (LoginScreen), not SavesGrid.

## Delete Save Flow

- Long-press or hover on a save card reveals a delete icon (trash).
- Click triggers confirmation: "Radera [save name]? Det går inte att ångra."
- On confirm: `deleteSave(id)` → remove card from grid with fade animation.

## SQL Migration

```sql
create table public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  state jsonb not null,
  history jsonb not null default '[]'::jsonb,
  scene text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_game_saves_user_id on public.game_saves(user_id);

alter table public.game_saves enable row level security;

create policy "Users can view own saves"
  on public.game_saves for select using (auth.uid() = user_id);
create policy "Users can insert own saves"
  on public.game_saves for insert with check (auth.uid() = user_id);
create policy "Users can update own saves"
  on public.game_saves for update using (auth.uid() = user_id);
create policy "Users can delete own saves"
  on public.game_saves for delete using (auth.uid() = user_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.game_saves
  for each row execute function public.handle_updated_at();
```

## Visual Design Decisions

- **Saves grid:** Cards in a 2-column grid with large compliance number as visual focus, color-coded (green ≥800, amber ≥400, red <400). Save name and location/turn below.
- **Login screen:** Current ECHO splash with "Logga in" and "Spela som gäst" buttons.
- **In-game save access:** "SPARA" and "MENY" as discrete uppercase text links in the header, right-aligned.
- **Auth modal:** Dark-themed modal matching ECHO aesthetics. Email/password fields, GitHub button, toggle between login/register.
