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
