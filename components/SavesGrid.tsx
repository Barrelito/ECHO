"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSaves, deleteSave } from "@/lib/saves";
import type { SaveData } from "@/lib/types";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

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
    return value >= 800 ? "var(--color-accent-green)" : value >= 400 ? "#BA7517" : "var(--color-accent-red, #E24B4A)";
  }

  const canCreateNew = saves.length < 10;
  const isMobile = useIsMobile();

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: isMobile ? "1.5rem 0.75rem" : "2rem 1rem" }}>
      <div style={{ maxWidth: "520px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <span style={{ fontSize: "18px", fontWeight: 400, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.3em", color: "var(--color-accent-green)", textShadow: "0 0 8px rgba(0,255,136,0.4)" }}>ECHO</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {!isMobile && <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono, monospace)" }}>{user?.email}</span>}
            <span onClick={handleLogout} style={{ fontSize: isMobile ? "12px" : "10px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-accent-teal)", cursor: "pointer", textDecoration: "underline", padding: isMobile ? "8px 4px" : "0", minHeight: isMobile ? "44px" : "auto", display: "flex", alignItems: "center" }}>{">"} Logga ut</span>
          </div>
        </div>

        <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>
          Dina spel
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)", fontSize: "12px", fontFamily: "var(--font-mono, monospace)" }}>Laddar...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
            {saves.map((save) => (
              <div
                key={save.id}
                style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "2px", padding: "1.2rem", textAlign: "center", cursor: "pointer", position: "relative" }}
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
                  data-delete=""
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(save.id); }}
                  style={{ position: "absolute", top: "8px", right: "8px", fontSize: "12px", color: "var(--color-text-tertiary)", cursor: "pointer", opacity: isMobile ? 0.6 : 0, transition: "opacity 0.2s", padding: isMobile ? "8px" : "0" }}
                >
                  🗑
                </div>

                {deleteConfirm === save.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: "absolute", inset: 0, background: "var(--color-background-primary)", borderRadius: "2px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", padding: "1rem", border: "0.5px solid var(--color-border-secondary)" }}
                  >
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textAlign: "center", fontFamily: "var(--font-mono, monospace)" }}>
                      Radera {save.name}? Det går inte att ångra.
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleDelete(save.id)} style={{ padding: "6px 12px", fontSize: "10px", fontFamily: "var(--font-mono, monospace)", border: "0.5px solid var(--color-accent-red, #E24B4A)", borderRadius: "2px", background: "transparent", color: "var(--color-accent-red, #E24B4A)", cursor: "pointer" }}>Radera</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ padding: "6px 12px", fontSize: "10px", fontFamily: "var(--font-mono, monospace)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "2px", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer" }}>Avbryt</button>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: "24px", color: complianceColor(save.state.compliance), fontWeight: 300, marginBottom: "4px", fontFamily: "var(--font-mono, monospace)" }}>
                  {save.state.compliance}
                </div>
                <div style={{ fontSize: "13px", color: "var(--color-text-primary)", marginBottom: "6px", fontFamily: "var(--font-mono, monospace)" }}>{save.name}</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono, monospace)" }}>
                  {save.state.location} · Tur {save.state.turnCount}
                </div>
              </div>
            ))}

            <div
              onClick={canCreateNew ? onNewGame : undefined}
              style={{ border: "1px solid var(--color-accent-teal)", borderRadius: "2px", padding: "1.2rem", textAlign: "center", cursor: canCreateNew ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "4px", opacity: canCreateNew ? 0.6 : 0.25 }}
            >
              <span style={{ fontSize: "12px", color: "var(--color-accent-teal)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.08em" }}>{">"} Nytt spel</span>
              {!canCreateNew && (
                <span style={{ fontSize: "9px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono, monospace)" }}>Radera ett spel först</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
