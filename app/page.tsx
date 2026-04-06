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
    if (pendingSaveRef.current) {
      const { state: s, history: h, scene: sc } = pendingSaveRef.current;
      if (currentSave?.id) {
        try { await updateSave(currentSave.id, s, h, sc); } catch {}
      } else {
        setPendingSave({ state: s, history: h, scene: sc });
        setShowSaveModal(true);
        return;
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
