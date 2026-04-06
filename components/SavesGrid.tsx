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
                  data-delete=""
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
