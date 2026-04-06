# Supabase Auth & Saves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Auth (GitHub OAuth + email/password), guest mode, and persistent game saves to the ECHO MUD game.

**Architecture:** Client-side Supabase with Row Level Security. Auth state managed via React context. Saves CRUD directly from client. Game API unchanged.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, @supabase/ssr, @supabase/supabase-js, Supabase Postgres with RLS

**Spec:** `docs/superpowers/specs/2026-04-06-supabase-auth-saves-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/types.ts` | Create | Shared types: GameState, GameMessage, GameRequest, Meta |
| `lib/supabase.ts` | Create | Singleton Supabase browser client |
| `lib/saves.ts` | Create | CRUD: getSaves, createSave, updateSave, deleteSave |
| `components/AuthProvider.tsx` | Create | React context: user state + onAuthStateChange |
| `components/LoginScreen.tsx` | Create | Splash with "Logga in" / "Spela som gäst" |
| `components/AuthModal.tsx` | Create | Email/password + GitHub OAuth modal |
| `components/SavesGrid.tsx` | Create | 2-col grid of save cards + "Nytt spel" |
| `components/SaveModal.tsx` | Create | Name input for first save |
| `app/auth/callback/route.ts` | Create | GitHub OAuth callback handler |
| `app/api/game/route.ts` | Modify | Import types from lib/types.ts |
| `components/EchoGame.tsx` | Modify | Accept save props, add SPARA/MENY header buttons |
| `app/layout.tsx` | Modify | Wrap children in AuthProvider |
| `app/page.tsx` | Modify | Orchestrate splash → auth → saves → game flow |

---

### Task 1: Install dependencies & set up environment

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Add Supabase env vars to .env.local**

Add these lines (get values from Supabase dashboard → Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY
```

- [ ] **Step 3: Run the Supabase SQL migration**

In Supabase dashboard → SQL Editor, run:
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

- [ ] **Step 4: Configure Supabase Auth providers**

In Supabase dashboard → Authentication → Providers:
1. Email: Enable, disable "Confirm email" (so players can use account immediately)
2. GitHub: Enable, add OAuth App client ID + secret (create at github.com → Settings → Developer settings → OAuth Apps, set callback URL to `https://YOUR_PROJECT.supabase.co/auth/v1/callback`)

- [ ] **Step 5: Add site URL and redirect**

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (update to production URL before deploy)
- Redirect URLs: `http://localhost:3000/auth/callback`

- [ ] **Step 6: Verify dev server starts**

Run:
```bash
npm run dev
```
Expected: Compiles successfully, no new errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @supabase/supabase-js and @supabase/ssr dependencies"
```

---

### Task 2: Extract shared types into lib/types.ts

**Files:**
- Create: `lib/types.ts`
- Modify: `app/api/game/route.ts`
- Modify: `components/EchoGame.tsx`

- [ ] **Step 1: Create lib/types.ts**

```typescript
export interface GameState {
  compliance: number;
  location: string;
  time: string;
  faction: "neutral" | "loyal" | "resistance" | "criminal" | "raderad";
  inNeuralDive: boolean;
  echoAwareness: "low" | "medium" | "high";
  flags: Record<string, boolean>;
  turnCount: number;
}

export interface GameMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GameRequest {
  playerInput: string;
  history: GameMessage[];
  state: GameState;
}

export interface Meta {
  location: string;
  time: string;
  compliance: number;
  inNeuralDive: boolean;
  echoAwareness: string;
}

export interface SaveData {
  id: string;
  user_id: string;
  name: string;
  state: GameState;
  history: GameMessage[];
  scene: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Update app/api/game/route.ts imports**

Replace lines 1 and 7-27:
```typescript
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ECHO_SYSTEM_PROMPT } from "@/lib/echo-prompt";
import type { GameState, GameMessage, GameRequest } from "@/lib/types";
```
Remove the `GameState`, `GameMessage`, and `GameRequest` interface definitions (lines 7-27). Keep the `export` keyword removal — these are now imported.

- [ ] **Step 3: Update components/EchoGame.tsx imports**

Replace line 4:
```typescript
import type { GameState, GameMessage } from "@/app/api/game/route";
```
With:
```typescript
import type { GameState, GameMessage, Meta } from "@/lib/types";
```
Remove the local `Meta` interface (lines 6-12) since it's now in `lib/types.ts`.

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No new errors (pre-existing debug route error is OK).

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts app/api/game/route.ts components/EchoGame.tsx
git commit -m "refactor: extract shared types to lib/types.ts"
```

---

### Task 3: Create Supabase client singleton

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create lib/supabase.ts**

```typescript
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Supabase browser client singleton"
```

---

### Task 4: Create AuthProvider context

**Files:**
- Create: `components/AuthProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create components/AuthProvider.tsx**

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sessionExpired: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  sessionExpired: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "TOKEN_REFRESHED") {
          setSessionExpired(false);
        }
        if (event === "SIGNED_OUT" && user) {
          setSessionExpired(true);
        }
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Wrap layout.tsx in AuthProvider**

Update `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "ECHO",
  description: "Stockholm. Nära framtid. En AI styr allt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add components/AuthProvider.tsx app/layout.tsx
git commit -m "feat: add AuthProvider context with onAuthStateChange"
```

---

### Task 5: Create OAuth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create app/auth/callback/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add GitHub OAuth callback route"
```

---

### Task 6: Create AuthModal component

**Files:**
- Create: `components/AuthModal.tsx`

- [ ] **Step 1: Create components/AuthModal.tsx**

```tsx
"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabase();

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message === "Invalid login credentials" ? "Fel e-post eller lösenord" : err.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message.includes("already registered") ? "E-post redan registrerad" : err.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSuccess();
  }

  async function handleGitHub() {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "12px", padding: "2rem", width: "340px", maxWidth: "90vw" }}
      >
        <h2 style={{ fontSize: "18px", fontFamily: "Georgia, serif", letterSpacing: "0.08em", marginBottom: "1.5rem", textAlign: "center" }}>
          {mode === "login" ? "Logga in" : "Skapa konto"}
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 12px", fontSize: "13px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", marginBottom: "8px", outline: "none", boxSizing: "border-box" }}
          />
          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: "10px 12px", fontSize: "13px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", marginBottom: "12px", outline: "none", boxSizing: "border-box" }}
          />

          {error && (
            <div style={{ fontSize: "12px", color: "#E24B4A", marginBottom: "10px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "10px", fontSize: "12px", fontWeight: 500, border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "transparent", color: "var(--color-text-primary)", cursor: loading ? "wait" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase", opacity: loading ? 0.5 : 1, boxSizing: "border-box" }}
          >
            {loading ? "..." : mode === "login" ? "Logga in" : "Skapa konto"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "14px 0" }}>
          <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-secondary)" }} />
          <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>eller</span>
          <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-secondary)" }} />
        </div>

        <button
          onClick={handleGitHub}
          style={{ width: "100%", padding: "10px", fontSize: "12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxSizing: "border-box" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Logga in med GitHub
        </button>

        <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", textAlign: "center", marginTop: "14px" }}>
          {mode === "login" ? (
            <>Inget konto? <span onClick={() => { setMode("register"); setError(""); }} style={{ color: "var(--color-text-secondary)", textDecoration: "underline", cursor: "pointer" }}>Registrera dig</span></>
          ) : (
            <>Har redan konto? <span onClick={() => { setMode("login"); setError(""); }} style={{ color: "var(--color-text-secondary)", textDecoration: "underline", cursor: "pointer" }}>Logga in</span></>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/AuthModal.tsx
git commit -m "feat: add AuthModal with email/password and GitHub OAuth"
```

---

### Task 7: Create saves CRUD library

**Files:**
- Create: `lib/saves.ts`

- [ ] **Step 1: Create lib/saves.ts**

```typescript
import { getSupabase } from "@/lib/supabase";
import type { GameState, GameMessage, SaveData } from "@/lib/types";

const MAX_SAVES = 10;
const MAX_HISTORY_MESSAGES = 40;

export async function getSaves(): Promise<SaveData[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createSave(
  name: string,
  state: GameState,
  history: GameMessage[],
  scene: string
): Promise<SaveData> {
  const supabase = getSupabase();

  const { count } = await supabase
    .from("game_saves")
    .select("id", { count: "exact", head: true });

  if (count !== null && count >= MAX_SAVES) {
    throw new Error("MAX_SAVES_REACHED");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const { data, error } = await supabase
    .from("game_saves")
    .insert({
      user_id: user.id,
      name,
      state,
      history: history.slice(-MAX_HISTORY_MESSAGES),
      scene,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSave(
  id: string,
  state: GameState,
  history: GameMessage[],
  scene: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("game_saves")
    .update({
      state,
      history: history.slice(-MAX_HISTORY_MESSAGES),
      scene,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteSave(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("game_saves")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/saves.ts
git commit -m "feat: add saves CRUD library with max saves and history cap"
```

---

### Task 8: Create LoginScreen component

**Files:**
- Create: `components/LoginScreen.tsx`

- [ ] **Step 1: Create components/LoginScreen.tsx**

```tsx
"use client";

interface LoginScreenProps {
  onLogin: () => void;
  onGuest: () => void;
}

export default function LoginScreen({ onLogin, onGuest }: LoginScreenProps) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: "1rem" }}>
          SYSTEMSTATUS: VAKEN
        </div>
        <h1 style={{ fontSize: "52px", fontWeight: 400, fontFamily: "Georgia, serif", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>
          ECHO
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", lineHeight: "1.75", marginBottom: "2.5rem" }}>
          Stockholm. Nära framtid. En AI styr allt — trafik, mat, tid, tanke. Systemet älskar dig.
          <br />
          Och något stämmer inte.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onLogin}
            style={{ padding: "12px 28px", fontSize: "13px", fontWeight: 500, border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Logga in
          </button>
          <button
            onClick={onGuest}
            style={{ padding: "12px 28px", fontSize: "13px", fontWeight: 500, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "8px", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Spela som gäst
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LoginScreen.tsx
git commit -m "feat: add LoginScreen with login and guest buttons"
```

---

### Task 9: Create SavesGrid component

**Files:**
- Create: `components/SavesGrid.tsx`

- [ ] **Step 1: Create components/SavesGrid.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSaves, deleteSave } from "@/lib/saves";
import type { SaveData } from "@/lib/types";

interface SavesGridProps {
  onSelectSave: (save: SaveData) => void;
  onNewGame: () => void;
  onLogout: () => void;
}

export default function SavesGrid({ onSelectSave, onNewGame, onLogout }: SavesGridProps) {
  const { user, signOut } = useAuth();
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    getSaves()
      .then(setSaves)
      .catch(() => setSaves([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    try {
      await deleteSave(id);
      setSaves((prev) => prev.filter((s) => s.id !== id));
    } catch {}
    setDeleteConfirm(null);
  }

  async function handleLogout() {
    await signOut();
    onLogout();
  }

  function complianceColor(value: number) {
    return value >= 800 ? "#639922" : value >= 400 ? "#BA7517" : "#E24B4A";
  }

  const canCreateNew = saves.length < 10;

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "520px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <span style={{ fontSize: "18px", fontWeight: 400, fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>ECHO</span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>{user?.email}</span>
            <span onClick={handleLogout} style={{ fontSize: "10px", color: "var(--color-text-tertiary)", cursor: "pointer", textDecoration: "underline" }}>Logga ut</span>
          </div>
        </div>

        <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>
          Dina spel
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)", fontSize: "12px" }}>Laddar...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {saves.map((save) => (
              <div
                key={save.id}
                style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", padding: "1.2rem", textAlign: "center", cursor: "pointer", position: "relative" }}
                onClick={() => onSelectSave(save)}
                onMouseEnter={(e) => {
                  const del = e.currentTarget.querySelector("[data-delete]") as HTMLElement;
                  if (del) del.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  const del = e.currentTarget.querySelector("[data-delete]") as HTMLElement;
                  if (del) del.style.opacity = "0";
                  if (deleteConfirm === save.id) setDeleteConfirm(null);
                }}
              >
                <div
                  data-delete
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(save.id); }}
                  style={{ position: "absolute", top: "8px", right: "8px", fontSize: "12px", color: "var(--color-text-tertiary)", cursor: "pointer", opacity: 0, transition: "opacity 0.2s" }}
                >
                  🗑
                </div>

                {deleteConfirm === save.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: "absolute", inset: 0, background: "var(--color-background-primary)", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", padding: "1rem", border: "0.5px solid var(--color-border-secondary)" }}
                  >
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textAlign: "center" }}>
                      Radera {save.name}? Det går inte att ångra.
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleDelete(save.id)} style={{ padding: "6px 12px", fontSize: "10px", border: "0.5px solid #E24B4A", borderRadius: "4px", background: "transparent", color: "#E24B4A", cursor: "pointer" }}>Radera</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ padding: "6px 12px", fontSize: "10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "4px", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer" }}>Avbryt</button>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: "24px", color: complianceColor(save.state.compliance), fontWeight: 300, marginBottom: "4px" }}>
                  {save.state.compliance}
                </div>
                <div style={{ fontSize: "13px", color: "var(--color-text-primary)", marginBottom: "6px" }}>{save.name}</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>
                  {save.state.location} · Tur {save.state.turnCount}
                </div>
              </div>
            ))}

            <div
              onClick={canCreateNew ? onNewGame : undefined}
              style={{ border: "1px dashed var(--color-border-secondary)", borderRadius: "8px", padding: "1.2rem", textAlign: "center", cursor: canCreateNew ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "4px", opacity: canCreateNew ? 1 : 0.4 }}
            >
              <span style={{ fontSize: "12px", color: "var(--color-text-tertiary)" }}>+ Nytt spel</span>
              {!canCreateNew && (
                <span style={{ fontSize: "9px", color: "var(--color-text-tertiary)" }}>Radera ett spel först</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/SavesGrid.tsx
git commit -m "feat: add SavesGrid with delete confirmation and max saves limit"
```

---

### Task 10: Create SaveModal component

**Files:**
- Create: `components/SaveModal.tsx`

- [ ] **Step 1: Create components/SaveModal.tsx**

```tsx
"use client";

import { useState } from "react";

interface SaveModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function SaveModal({ onSave, onClose }: SaveModalProps) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) onSave(name.trim());
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "12px", padding: "2rem", width: "320px", maxWidth: "90vw" }}
      >
        <h2 style={{ fontSize: "16px", fontFamily: "Georgia, serif", letterSpacing: "0.06em", marginBottom: "0.5rem", textAlign: "center" }}>
          Namnge ditt spel
        </h2>
        <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", textAlign: "center", marginBottom: "1.25rem" }}>
          Ge ditt spel ett namn så du kan hitta det igen.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            placeholder="t.ex. Motståndsrutten"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            style={{ width: "100%", padding: "10px 12px", fontSize: "13px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", marginBottom: "12px", outline: "none", boxSizing: "border-box" }}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{ width: "100%", padding: "10px", fontSize: "12px", fontWeight: 500, border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "transparent", color: "var(--color-text-primary)", cursor: name.trim() ? "pointer" : "not-allowed", letterSpacing: "0.08em", textTransform: "uppercase", opacity: name.trim() ? 1 : 0.4, boxSizing: "border-box" }}
          >
            Spara
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/SaveModal.tsx
git commit -m "feat: add SaveModal for naming saves"
```

---

### Task 11: Modify EchoGame to accept save props and add header buttons

**Files:**
- Modify: `components/EchoGame.tsx`

- [ ] **Step 1: Update EchoGame props and imports**

Add props interface and update the component signature. The splash screen (the `if (!started)` block) is removed from EchoGame — it now lives in LoginScreen. EchoGame always renders the game.

Key changes:
1. Add `EchoGameProps` interface with optional `initialSave` and callbacks `onSave`, `onMenu`
2. If `initialSave` is provided, initialize state/history/scene from it and set `started = true`
3. Add SPARA and MENY buttons to the header (right side)
4. Track `currentSaveId` and `hasUnsavedChanges`
5. Remove the splash screen block — it's now in LoginScreen/page.tsx

The full updated file:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameState, GameMessage, Meta, SaveData } from "@/lib/types";

const ECHO_LOADING_MESSAGES = [
  "Bearbetar biometrisk data...",
  "Analyserar rörelsemönster...",
  "Uppdaterar compliance-register...",
  "Skannar omgivande zoner...",
  "Kalibrerar narrativ respons...",
  "Synkroniserar med stadsnätverket...",
  "Läser av neurala signaler...",
  "Optimerar utfall...",
  "Identifierar avvikelser...",
  "Upprättar neural länk...",
];

function useEchoLoadingMessage(active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ECHO_LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [active]);
  return ECHO_LOADING_MESSAGES[index];
}

function ComplianceBar({ value }: { value: number }) {
  const color = value >= 800 ? "#639922" : value >= 400 ? "#BA7517" : "#E24B4A";
  const label = value >= 800 ? "GRÖN" : value >= 400 ? "AMBER" : "RADERAD";
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-tertiary)", marginBottom: "5px", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        <span>Compliance</span>
        <span style={{ color, fontWeight: 500 }}>{value} · {label}</span>
      </div>
      <div style={{ height: "4px", background: "var(--color-background-tertiary)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value / 10}%`, background: color, borderRadius: "2px", transition: "width 1.2s ease, background 1.2s ease" }} />
      </div>
    </div>
  );
}

function StatusRow({ meta }: { meta: Meta }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "1.25rem" }}>
      {[
        { label: "Plats", value: meta.location },
        { label: "Tid", value: meta.time },
        { label: "ECHO", value: meta.inNeuralDive ? "⬡ NEURAL DYKNING" : `Medvetenhet: ${meta.echoAwareness}` },
      ].map(({ label, value }) => (
        <div key={label} style={{ background: "var(--color-background-secondary)", borderRadius: "8px", padding: "0.6rem 0.75rem" }}>
          <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "3px" }}>{label}</div>
          <div style={{ fontSize: "12px", color: meta.inNeuralDive && label === "ECHO" ? "#534AB7" : "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function SceneText({ text, streaming }: { text: string; streaming: boolean }) {
  const cleaned = text.replace(/\[.*?\]/g, "").trim().split("\n").filter((l) => l.trim()).join("\n\n");
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "16px", lineHeight: "1.85", color: "var(--color-text-primary)", whiteSpace: "pre-wrap", marginBottom: "0.5rem" }}>
      {cleaned}
      {streaming && <span style={{ display: "inline-block", width: "2px", height: "1.1em", background: "var(--color-text-tertiary)", marginLeft: "2px", verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" }} />}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

function EchoThinking({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0.75rem 1rem", background: "var(--color-background-secondary)", borderRadius: "8px", marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--color-text-tertiary)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <span style={{ fontSize: "12px", color: "var(--color-text-tertiary)", letterSpacing: "0.04em", fontFamily: "var(--font-mono, monospace)" }}>
        ECHO · {message}
      </span>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export interface EchoGameProps {
  initialSave?: SaveData;
  onSave?: (state: GameState, history: GameMessage[], scene: string, saveId?: string) => void;
  onMenu?: (hasUnsavedChanges: boolean) => void;
  onStateChange?: (state: GameState, history: GameMessage[], scene: string) => void;
}

export default function EchoGame({ initialSave, onSave, onMenu, onStateChange }: EchoGameProps) {
  const [scene, setScene] = useState(initialSave?.scene ?? "");
  const [streamingText, setStreamingText] = useState("");
  const [history, setHistory] = useState<GameMessage[]>(initialSave?.history ?? []);
  const [state, setState] = useState<GameState | null>(initialSave?.state ?? null);
  const [meta, setMeta] = useState<Meta>({
    location: initialSave?.state.location ?? "Hammarby Sjöstad",
    time: initialSave?.state.time ?? "06:47",
    compliance: initialSave?.state.compliance ?? 892,
    inNeuralDive: initialSave?.state.inNeuralDive ?? false,
    echoAwareness: initialSave?.state.echoAwareness ?? "low",
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [started, setStarted] = useState(!!initialSave);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingMessage = useEchoLoadingMessage(isThinking);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingText, isThinking]);

  const handleSave = useCallback(() => {
    if (!state || !onSave) return;
    onSave(state, history, scene, initialSave?.id);
  }, [state, history, scene, initialSave?.id, onSave]);

  async function readStream(response: Response, onText: (text: string) => void, onDone: (state: GameState, meta: Meta) => void) {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") { setIsThinking(false); onText(data.text); }
          else if (data.type === "done") { onDone(data.state, data.meta); }
        } catch {}
      }
    }
  }

  async function startGame() {
    setIsThinking(true); setIsStreaming(true); setStreamingText(""); setStarted(true);
    let accumulated = "";
    try {
      const res = await fetch("/api/game");
      await readStream(res, (text) => { accumulated += text; setStreamingText(accumulated); }, (newState, newMeta) => { setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta); setHasUnsavedChanges(true); onStateChange?.(newState, [], accumulated); });
    } catch { setScene("Systemfel. ECHO svarar inte."); }
    finally { setIsThinking(false); setIsStreaming(false); }
  }

  async function sendInput() {
    if (!input.trim() || isStreaming || !state) return;
    const playerText = input.trim();
    setInput(""); setIsThinking(true); setIsStreaming(true);
    const newHistory: GameMessage[] = [...history, { role: "assistant", content: scene }, { role: "user", content: playerText }];
    let accumulated = "";
    setStreamingText("");
    try {
      const res = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerInput: playerText, history: newHistory.slice(-20), state }) });
      await readStream(res, (text) => { accumulated += text; setStreamingText(accumulated); }, (newState, newMeta) => { setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta); setHistory(newHistory); setHasUnsavedChanges(true); onStateChange?.(newState, newHistory, accumulated); });
    } catch { setScene("Systemfel. ECHO svarar inte."); }
    finally { setIsThinking(false); setIsStreaming(false); }
  }

  useEffect(() => {
    if (!started && !initialSave) {
      startGame();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <EchoThinking message={loadingMessage} />
      </div>
    );
  }

  const displayText = streamingText || scene;

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "1.5rem 1rem 3rem" }}>
      <div style={{ maxWidth: "680px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "18px", fontWeight: 400, fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>ECHO</span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {onSave && (
              <span
                onClick={isStreaming ? undefined : handleSave}
                style={{ fontSize: "10px", color: "var(--color-text-tertiary)", cursor: isStreaming ? "default" : "pointer", letterSpacing: "0.06em", opacity: isStreaming ? 0.4 : 1, transition: "opacity 0.2s" }}
              >
                SPARA
              </span>
            )}
            {onMenu && (
              <span
                onClick={() => onMenu(hasUnsavedChanges)}
                style={{ fontSize: "10px", color: "var(--color-text-tertiary)", cursor: "pointer", letterSpacing: "0.06em" }}
              >
                MENY
              </span>
            )}
            <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tur {state?.turnCount ?? 0}</span>
          </div>
        </div>

        <ComplianceBar value={meta.compliance} />
        <StatusRow meta={meta} />
        {meta.inNeuralDive && (
          <div style={{ background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "12px", color: "#3C3489", marginBottom: "1rem", letterSpacing: "0.04em" }}>
            ⬡ NEURAL DYKNING AKTIV — compliance sjunker vid förlängd exponering
          </div>
        )}
        {isThinking && <EchoThinking message={loadingMessage} />}
        {displayText && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "1.75rem", marginBottom: "1.25rem" }}>
            <SceneText text={displayText} streaming={isStreaming} />
          </div>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendInput()} placeholder={isStreaming ? "ECHO skriver..." : "Vad gör du?"} disabled={isStreaming}
            style={{ flex: 1, padding: "12px 16px", fontSize: "14px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", opacity: isStreaming ? 0.5 : 1, transition: "opacity 0.3s" }} />
          <button onClick={sendInput} disabled={isStreaming || !input.trim()}
            style={{ padding: "12px 20px", fontSize: "14px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", background: "transparent", color: "var(--color-text-primary)", cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer", opacity: isStreaming || !input.trim() ? 0.4 : 1, transition: "opacity 0.3s" }}>
            →
          </button>
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/EchoGame.tsx
git commit -m "feat: add SPARA/MENY header buttons and save props to EchoGame"
```

---

### Task 12: Orchestrate full flow in page.tsx

**Files:**
- Modify: `app/page.tsx`

This is the main integration task. page.tsx becomes the state machine that manages which screen is shown.

- [ ] **Step 1: Rewrite app/page.tsx**

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import LoginScreen from "@/components/LoginScreen";
import AuthModal from "@/components/AuthModal";
import SavesGrid from "@/components/SavesGrid";
import SaveModal from "@/components/SaveModal";
import EchoGame from "@/components/EchoGame";
import { createSave, updateSave } from "@/lib/saves";
import type { GameState, GameMessage, SaveData } from "@/lib/types";

type Screen = "splash" | "saves" | "game";

export default function Page() {
  const { user, loading, sessionExpired } = useAuth();
  const [screen, setScreen] = useState<Screen>("splash");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentSave, setCurrentSave] = useState<SaveData | undefined>();
  const [saveToast, setSaveToast] = useState("");

  // Pending save data for guest → account upgrade
  const [pendingSave, setPendingSave] = useState<{
    state: GameState;
    history: GameMessage[];
    scene: string;
  } | null>(null);

  // Ref to latest game state for save-and-leave
  const pendingSaveRef = useRef<{ state: GameState; history: GameMessage[]; scene: string } | null>(null);

  // After auth loads, if user exists go to saves
  const resolvedScreen = loading ? "splash" : (screen === "splash" && user) ? "saves" : screen;

  function handleAuthSuccess() {
    setShowAuthModal(false);
    if (pendingSave) {
      // Guest upgraded mid-game — show save modal
      setShowSaveModal(true);
    } else {
      setScreen("saves");
    }
  }

  const handleSave = useCallback(
    async (state: GameState, history: GameMessage[], scene: string, saveId?: string) => {
      pendingSaveRef.current = { state, history, scene };

      if (!user) {
        // Guest — trigger auth flow, store pending save
        setPendingSave({ state, history, scene });
        setShowAuthModal(true);
        return;
      }

      if (saveId) {
        // Update existing save
        try {
          await updateSave(saveId, state, history, scene);
          setSaveToast("Sparat");
          setTimeout(() => setSaveToast(""), 2000);
        } catch {
          setSaveToast("Kunde inte spara. Försök igen.");
          setTimeout(() => setSaveToast(""), 3000);
        }
      } else {
        // First save — show name modal
        setPendingSave({ state, history, scene });
        setShowSaveModal(true);
      }
    },
    [user]
  );

  async function handleSaveWithName(name: string) {
    if (!pendingSave) return;
    setShowSaveModal(false);
    try {
      const saved = await createSave(name, pendingSave.state, pendingSave.history, pendingSave.scene);
      setCurrentSave(saved);
      setSaveToast("Sparat");
      setTimeout(() => setSaveToast(""), 2000);
    } catch (err) {
      const msg = (err as Error).message === "MAX_SAVES_REACHED"
        ? "Max antal sparningar nått. Radera ett spel först."
        : "Kunde inte spara. Försök igen.";
      setSaveToast(msg);
      setTimeout(() => setSaveToast(""), 3000);
    }
    setPendingSave(null);
  }

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  function handleMenu(hasUnsavedChanges: boolean) {
    if (!user) {
      // Guest — back to splash
      if (hasUnsavedChanges && !confirm("Du har osparad progress som går förlorad. Vill du lämna ändå?")) return;
      setCurrentSave(undefined);
      setScreen("splash");
      return;
    }
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      return;
    }
    setCurrentSave(undefined);
    setScreen("saves");
  }

  function handleUnsavedLeave() {
    setShowUnsavedModal(false);
    setCurrentSave(undefined);
    setScreen("saves");
  }

  async function handleUnsavedSaveAndLeave() {
    setShowUnsavedModal(false);
    // Trigger a save, then navigate
    if (pendingSaveRef.current) {
      const { state: s, history: h, scene: sc } = pendingSaveRef.current;
      if (currentSave?.id) {
        try { await updateSave(currentSave.id, s, h, sc); } catch {}
      } else {
        setPendingSave({ state: s, history: h, scene: sc });
        setShowSaveModal(true);
        return; // Don't navigate yet — SaveModal will handle it
      }
    }
    setCurrentSave(undefined);
    setScreen("saves");
  }

  if (resolvedScreen === "splash") {
    return (
      <>
        <LoginScreen
          onLogin={() => setShowAuthModal(true)}
          onGuest={() => { setScreen("game"); setCurrentSave(undefined); }}
        />
        {showAuthModal && (
          <AuthModal
            onClose={() => { setShowAuthModal(false); setPendingSave(null); }}
            onSuccess={handleAuthSuccess}
          />
        )}
      </>
    );
  }

  if (resolvedScreen === "saves") {
    return (
      <SavesGrid
        onSelectSave={(save) => { setCurrentSave(save); setScreen("game"); }}
        onNewGame={() => { setCurrentSave(undefined); setScreen("game"); }}
        onLogout={() => setScreen("splash")}
      />
    );
  }

  // Game screen
  return (
    <>
      {sessionExpired && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "8px", background: "#BA7517", color: "#fff", fontSize: "12px", textAlign: "center", zIndex: 200 }}>
          Din session har gått ut — logga in igen för att spara.
          <span onClick={() => setShowAuthModal(true)} style={{ marginLeft: "8px", textDecoration: "underline", cursor: "pointer" }}>Logga in</span>
        </div>
      )}
      <EchoGame
        key={currentSave?.id ?? "new"}
        initialSave={currentSave}
        onSave={handleSave}
        onMenu={handleMenu}
        onStateChange={(s, h, sc) => { pendingSaveRef.current = { state: s, history: h, scene: sc }; }}
      />
      {saveToast && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", padding: "8px 20px", borderRadius: "6px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: "12px", color: "var(--color-text-secondary)", zIndex: 50 }}>
          {saveToast}
        </div>
      )}
      {showAuthModal && (
        <AuthModal
          onClose={() => { setShowAuthModal(false); setPendingSave(null); }}
          onSuccess={handleAuthSuccess}
        />
      )}
      {showSaveModal && (
        <SaveModal
          onSave={handleSaveWithName}
          onClose={() => { setShowSaveModal(false); setPendingSave(null); }}
        />
      )}
      {showUnsavedModal && (
        <div
          onClick={() => setShowUnsavedModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "12px", padding: "2rem", width: "320px", maxWidth: "90vw", textAlign: "center" }}
          >
            <p style={{ fontSize: "14px", color: "var(--color-text-primary)", marginBottom: "1.25rem" }}>
              Du har osparad progress.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={handleUnsavedSaveAndLeave}
                style={{ padding: "10px", fontSize: "12px", fontWeight: 500, border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", letterSpacing: "0.06em" }}
              >
                Spara & lämna
              </button>
              <button
                onClick={handleUnsavedLeave}
                style={{ padding: "10px", fontSize: "12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer", letterSpacing: "0.06em" }}
              >
                Lämna utan att spara
              </button>
              <button
                onClick={() => setShowUnsavedModal(false)}
                style={{ padding: "10px", fontSize: "12px", border: "none", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer" }}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Verify dev server starts and renders**

Run:
```bash
npm run dev
```
Open http://localhost:3000 — should see the ECHO splash with "Logga in" and "Spela som gäst" buttons.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: orchestrate auth/saves/game flow in page.tsx"
```

---

### Task 13: End-to-end manual testing

- [ ] **Step 1: Test guest flow**

1. Open http://localhost:3000
2. Click "Spela som gäst"
3. Verify game starts and plays normally
4. Click "SPARA" → should open auth modal
5. Click "MENY" → should return to splash with confirmation if unsaved

- [ ] **Step 2: Test email/password registration**

1. Click "Logga in" on splash
2. Click "Registrera dig"
3. Enter email + password → click "Skapa konto"
4. Should redirect to SavesGrid (empty)
5. Click "+ Nytt spel" → game starts
6. Play a turn, click "SPARA" → save name modal → enter name → save
7. Click "MENY" → should see save in grid
8. Click save card → should resume game

- [ ] **Step 3: Test GitHub OAuth**

1. Click "Logga in" → click "Logga in med GitHub"
2. Authorize on GitHub
3. Should redirect back to SavesGrid

- [ ] **Step 4: Test guest upgrade**

1. "Spela som gäst" → play a few turns
2. Click "SPARA" → auth modal opens
3. Register/login → save name modal → save
4. Game continues with same state
5. Click "MENY" → save visible in grid

- [ ] **Step 5: Test delete save**

1. In SavesGrid, hover a save card
2. Click trash icon
3. Confirm delete
4. Card disappears

- [ ] **Step 6: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete Supabase auth and save system integration"
```
