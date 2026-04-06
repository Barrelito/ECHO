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
