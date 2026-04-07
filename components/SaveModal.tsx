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
        style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "2px", padding: "2rem", width: "320px", maxWidth: "90vw", fontFamily: "var(--font-mono, monospace)" }}
      >
        <h2 style={{ fontSize: "14px", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.12em", marginBottom: "0.5rem", textAlign: "center", color: "var(--color-accent-green)", textTransform: "uppercase" }}>
          {">"} Namnge ditt spel
        </h2>
        <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", textAlign: "center", marginBottom: "1.25rem", fontFamily: "var(--font-mono, monospace)" }}>
          Ge ditt spel ett namn så du kan hitta det igen.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            placeholder="t.ex. Motståndsrutten"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontFamily: "var(--font-mono, monospace)", border: "1px solid var(--color-accent-teal)", borderRadius: "2px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", marginBottom: "12px", outline: "none", boxSizing: "border-box" }}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{ width: "100%", padding: "10px", fontSize: "12px", fontWeight: 500, fontFamily: "var(--font-mono, monospace)", border: "1px solid var(--color-accent-teal)", borderRadius: "2px", background: "transparent", color: "var(--color-accent-teal)", cursor: name.trim() ? "pointer" : "not-allowed", letterSpacing: "0.08em", textTransform: "uppercase", opacity: name.trim() ? 1 : 0.35, boxSizing: "border-box" }}
          >
            {">"} Spara
          </button>
        </form>
      </div>
    </div>
  );
}
