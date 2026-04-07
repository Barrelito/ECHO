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
        <h1 style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "28px", fontWeight: 400, color: "var(--color-accent-green)", marginBottom: "0.5rem", letterSpacing: "0.3em", textShadow: "0 0 12px rgba(0,255,136,0.5)" }}>
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
            style={{ padding: "12px 28px", fontSize: "13px", fontWeight: 500, borderRadius: "2px", fontFamily: "var(--font-mono, monospace)", border: "1px solid var(--color-accent-teal)", background: "transparent", color: "var(--color-accent-teal)", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            {">"} Logga in
          </button>
          <button
            onClick={onGuest}
            style={{ padding: "12px 28px", fontSize: "13px", fontWeight: 500, borderRadius: "2px", fontFamily: "var(--font-mono, monospace)", border: "1px solid var(--color-accent-teal)", background: "transparent", color: "var(--color-accent-teal)", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.65 }}
          >
            {">"} Spela som gäst
          </button>
        </div>
      </div>
    </div>
  );
}
