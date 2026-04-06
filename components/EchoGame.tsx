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
  const paragraphs = text.replace(/\[.*?\]/g, "").trim().split("\n").filter((l) => l.trim());
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "17px", lineHeight: "1.9", color: "var(--color-text-primary)", marginBottom: "0.5rem" }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{
          margin: "0 0 1.1em 0",
          animation: streaming ? "none" : `sceneFadeIn 0.6s ease-out ${i * 0.15}s both`,
          opacity: streaming ? 1 : undefined,
        }}>
          {p}
        </p>
      ))}
      {streaming && <span style={{ display: "inline-block", width: "2px", height: "1.1em", background: "var(--color-text-tertiary)", marginLeft: "2px", verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" }} />}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes sceneFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
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

interface AmbientFragment {
  text: string;
  actionable: boolean;
  id: number;
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
  const [hudExpanded, setHudExpanded] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingMessage = useEchoLoadingMessage(isThinking);

  // Ambient state
  const [ambientFragments, setAmbientFragments] = useState<AmbientFragment[]>([]);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [ambientDimmed, setAmbientDimmed] = useState(false);
  const ambientAbortRef = useRef<AbortController | null>(null);
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientIdCounter = useRef(0);
  const ambientPausedRef = useRef(false);
  const ambientStoppedRef = useRef(false);
  const stateRef = useRef(state);
  const sceneRef = useRef(scene);
  stateRef.current = state;
  sceneRef.current = scene;
  ambientPausedRef.current = ambientPaused;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingText, isThinking, ambientFragments]);

  // Page Visibility API
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        stopAmbient();
      } else if (stateRef.current && !isStreaming && !isThinking) {
        startAmbient();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isStreaming, isThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopAmbient() {
    ambientStoppedRef.current = true;
    if (ambientTimerRef.current) { clearTimeout(ambientTimerRef.current); ambientTimerRef.current = null; }
    if (ambientAbortRef.current) { ambientAbortRef.current.abort(); ambientAbortRef.current = null; }
  }

  function startAmbient() {
    stopAmbient();
    ambientStoppedRef.current = false;
    setAmbientPaused(false);
    setAmbientDimmed(false);
    ambientTimerRef.current = setTimeout(() => scheduleNextFragment(), 3000);
  }

  function scheduleNextFragment(backoff = false) {
    if (ambientStoppedRef.current) return;
    const delay = backoff ? 30000 : 15000 + Math.random() * 10000;
    ambientTimerRef.current = setTimeout(async () => {
      if (ambientStoppedRef.current || !stateRef.current) return;
      const controller = new AbortController();
      ambientAbortRef.current = controller;
      let hadError = false;
      try {
        const summary = sceneRef.current.replace(/\[.*?\]/g, "").trim().slice(0, 200);
        const res = await fetch("/api/game/ambient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: stateRef.current, lastSceneSummary: summary }),
          signal: controller.signal,
        });
        if (!res.ok) { hadError = true; } else {
          const data = await res.json();
          if (data.text && !ambientPausedRef.current) {
            setAmbientFragments((prev) => {
              const next = [...prev, { text: data.text, actionable: data.actionable, id: ambientIdCounter.current++ }];
              return next.slice(-5);
            });
          }
        }
      } catch {
        if (ambientStoppedRef.current) return;
        hadError = true;
      }
      ambientAbortRef.current = null;
      if (!ambientStoppedRef.current) scheduleNextFragment(hadError);
    }, delay);
  }

  useEffect(() => {
    return () => stopAmbient();
  }, []);

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
    setHudExpanded(false);
    stopAmbient();
    let accumulated = "";
    try {
      const res = await fetch("/api/game");
      await readStream(res, (text) => { accumulated += text; setStreamingText(accumulated); }, (newState, newMeta) => { setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta); setHasUnsavedChanges(true); onStateChange?.(newState, [], accumulated); });
    } catch { setScene("Systemfel. ECHO svarar inte."); }
    finally { setIsThinking(false); setIsStreaming(false); setHudExpanded(true); startAmbient(); }
  }

  async function sendInput() {
    if (!input.trim() || isStreaming || !state) return;
    const playerText = input.trim();
    setInput("");

    stopAmbient();
    setAmbientDimmed(true);
    setHudExpanded(false);

    const recentTexts = ambientFragments.slice(-3).map((f) => f.text);

    setIsThinking(true); setIsStreaming(true);
    const newHistory: GameMessage[] = [...history, { role: "assistant", content: scene }, { role: "user", content: playerText }];
    let accumulated = "";
    setStreamingText("");
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerInput: playerText,
          history: newHistory.slice(-20),
          state,
          ...(recentTexts.length > 0 ? { recentAmbientFragments: recentTexts } : {}),
        }),
      });
      let clearedFragments = false;
      await readStream(res, (text) => {
        if (!clearedFragments) { setAmbientFragments([]); setAmbientDimmed(false); clearedFragments = true; }
        accumulated += text; setStreamingText(accumulated);
      }, (newState, newMeta) => { setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta); setHistory(newHistory); setHasUnsavedChanges(true); onStateChange?.(newState, newHistory, accumulated); });
    } catch { setScene("Systemfel. ECHO svarar inte."); setAmbientFragments([]); setAmbientDimmed(false); }
    finally { setIsThinking(false); setIsStreaming(false); setHudExpanded(true); startAmbient(); }
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
  const visibleFragments = ambientFragments.slice(-3);

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

        <div
          onClick={() => setHudExpanded((v) => !v)}
          style={{ cursor: "pointer", overflow: "hidden", maxHeight: hudExpanded ? "200px" : "0px", opacity: hudExpanded ? 1 : 0, transition: "max-height 0.5s ease, opacity 0.4s ease", marginBottom: hudExpanded ? "0" : "0" }}
        >
          <ComplianceBar value={meta.compliance} />
          <StatusRow meta={meta} />
          {meta.inNeuralDive && (
            <div style={{ background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "12px", color: "#3C3489", marginBottom: "1rem", letterSpacing: "0.04em" }}>
              ⬡ NEURAL DYKNING AKTIV — compliance sjunker vid förlängd exponering
            </div>
          )}
        </div>
        {!hudExpanded && (
          <div
            onClick={() => setHudExpanded(true)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", marginBottom: "0.75rem", cursor: "pointer", fontSize: "11px", color: "var(--color-text-tertiary)", letterSpacing: "0.06em", opacity: 0.6, transition: "opacity 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          >
            <span>{meta.location} · {meta.time}</span>
            <span style={{ color: meta.compliance >= 800 ? "#639922" : meta.compliance >= 400 ? "#BA7517" : "#E24B4A" }}>{meta.compliance}</span>
          </div>
        )}
        {isThinking && <EchoThinking message={loadingMessage} />}
        {displayText && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "2rem 2.25rem", marginBottom: "1.5rem" }}>
            <SceneText text={displayText} streaming={isStreaming} />
          </div>
        )}

        {visibleFragments.length > 0 && (
          <div style={{ marginBottom: "1rem", opacity: ambientDimmed ? 0.3 : 0.7, transition: "opacity 0.5s" }}>
            {visibleFragments.map((frag) => (
              <div key={frag.id} style={{
                fontSize: "13px",
                fontFamily: "Georgia, serif",
                color: "var(--color-text-tertiary)",
                lineHeight: "1.7",
                padding: "0.4rem 0",
                animation: "ambientFadeIn 1s ease-in",
                borderLeft: frag.actionable ? "2px solid var(--color-text-tertiary)" : "none",
                paddingLeft: frag.actionable ? "0.75rem" : "0",
              }}>
                {frag.text}
              </div>
            ))}
            <style>{`@keyframes ambientFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <input value={input}
            onChange={(e) => { setInput(e.target.value); if (e.target.value) setAmbientPaused(true); else setAmbientPaused(false); }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendInput()}
            placeholder={isStreaming ? "ECHO skriver..." : "Vad gör du?"}
            disabled={isStreaming}
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
