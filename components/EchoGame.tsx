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

function cleanSceneText(text: string): string {
  // Strip metadata brackets and ---STATE JSON block
  const stateIdx = text.indexOf("---STATE");
  const withoutState = stateIdx !== -1 ? text.slice(0, stateIdx) : text;
  return withoutState.replace(/\[.*?\]/g, "").trim();
}

function SceneText({ text, streaming, dimmed }: { text: string; streaming: boolean; dimmed?: boolean }) {
  const cleaned = cleanSceneText(text);
  const paragraphs = cleaned.split("\n").filter((l) => l.trim());
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: dimmed ? "15px" : "17px", lineHeight: "1.9", color: dimmed ? "var(--color-text-tertiary)" : "var(--color-text-primary)", marginBottom: "0.5rem", transition: "color 0.3s" }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{
          margin: "0 0 1.1em 0",
          animation: streaming || dimmed ? "none" : `sceneFadeIn 0.6s ease-out ${i * 0.15}s both`,
          opacity: streaming || dimmed ? 1 : undefined,
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

function RevealingScene({ paragraphs, revealedCount, onAdvance, allRevealed }: {
  paragraphs: string[];
  revealedCount: number;
  onAdvance: () => void;
  allRevealed: boolean;
}) {
  return (
    <div
      onClick={allRevealed ? undefined : onAdvance}
      style={{ cursor: allRevealed ? "default" : "pointer", userSelect: allRevealed ? "auto" : "none" }}
    >
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "17px", lineHeight: "1.9", marginBottom: "0.5rem" }}>
        {paragraphs.slice(0, revealedCount).map((p, i) => {
          const isLatest = i === revealedCount - 1;
          const isPast = i < revealedCount - 1;
          return (
            <p key={i} style={{
              margin: "0 0 1.1em 0",
              color: isPast ? "var(--color-text-secondary)" : "var(--color-text-primary)",
              animation: isLatest ? "sceneFadeIn 0.5s ease-out both" : "none",
              transition: "color 0.4s ease",
            }}>
              {p}
            </p>
          );
        })}
      </div>
      {!allRevealed && (
        <div style={{ textAlign: "center", padding: "0.25rem 0" }}>
          <span style={{
            display: "inline-block",
            fontSize: "14px",
            color: "var(--color-text-tertiary)",
            animation: "advancePulse 2s ease-in-out infinite",
            opacity: 0.5,
          }}>
            ▾
          </span>
        </div>
      )}
      <style>{`
        @keyframes sceneFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes advancePulse { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 0.7; transform: translateY(3px); } }
      `}</style>
    </div>
  );
}

function ActionHints({ hints, onSelect }: { hints: string[]; onSelect: (hint: string) => void }) {
  if (hints.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "1rem" }}>
      {hints.map((hint, i) => (
        <button
          key={i}
          onClick={() => onSelect(hint)}
          style={{
            padding: "6px 14px",
            fontSize: "13px",
            fontFamily: "Georgia, serif",
            color: "var(--color-text-secondary)",
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "20px",
            cursor: "pointer",
            transition: "all 0.2s",
            animation: `sceneFadeIn 0.4s ease-out ${i * 0.1}s both`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-primary)"; e.currentTarget.style.borderColor = "var(--color-border-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.borderColor = "var(--color-border-tertiary)"; }}
        >
          {hint}
        </button>
      ))}
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

const FLAG_LABELS: Record<string, string> = {
  found_hexagram_mention: "Hexagrammet — en empatikod, gömd i systemets djup",
  heard_evelyns_voice: "Evelyns röst — fragment av ett medvetande som inte borde existera",
  met_daniel: "Daniel Voss — kopparmyntet, skulden, off-grid i Aspudden",
  knows_about_kymlinge: "Kymlinge — spökstationen. Silverpilen. Betong utan färg.",
  found_ghost_hand: "Spökhanden — biometrisk mask. ECHO ser dig inte.",
  contacted_resistance: "Motståndet — krypterade whispers i stadens brus",
  entered_server_zero: "Serverhall Noll — arton grader. Mörkret andas.",
  met_gabriel: "Gabriel Kane — karismatisk, övertygad. Tror att han styr ECHO.",
  met_marcus: "Marcus Raine — raderad Titan. Få ord. Stor tystnad.",
  met_sofia: "Sofia — pragmatisk, stridshärdad. Värmen är begravd djupt.",
};

function Journal({ flags, open, onToggle }: { flags: Record<string, boolean>; open: boolean; onToggle: () => void }) {
  const discovered = Object.entries(flags).filter(([, v]) => v);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        onClick={onToggle}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "0.4rem 0", fontSize: "11px", color: "var(--color-text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}
      >
        <span>Upptäckter {discovered.length > 0 ? `(${discovered.length})` : ""}</span>
        <span style={{ transition: "transform 0.3s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>&#9662;</span>
      </div>
      <div style={{ overflow: "hidden", maxHeight: open ? "500px" : "0px", opacity: open ? 1 : 0, transition: "max-height 0.4s ease, opacity 0.3s ease" }}>
        {discovered.length === 0 ? (
          <div style={{ fontSize: "13px", fontFamily: "Georgia, serif", color: "var(--color-text-tertiary)", fontStyle: "italic", padding: "0.5rem 0" }}>
            Inga upptäckter ännu. Utforska världen.
          </div>
        ) : (
          <div style={{ padding: "0.5rem 0" }}>
            {discovered.map(([key]) => (
              <div key={key} style={{
                fontSize: "13px",
                fontFamily: "Georgia, serif",
                color: "var(--color-text-secondary)",
                padding: "0.35rem 0 0.35rem 0.75rem",
                borderLeft: "2px solid var(--color-border-tertiary)",
                marginBottom: "0.4rem",
                animation: "sceneFadeIn 0.4s ease-out both",
              }}>
                {FLAG_LABELS[key] || key.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LOCATION_COORDS: Record<string, { x: number; y: number }> = {
  "Hammarby Sjöstad": { x: 62, y: 68 },
  "The Apex": { x: 50, y: 18 },
  "Kista Skrotgård": { x: 38, y: 22 },
  "Pionen": { x: 48, y: 58 },
  "Kymlinge": { x: 42, y: 30 },
  "Venerna": { x: 55, y: 50 },
  "Serverhall Noll": { x: 52, y: 42 },
};

function MiniMap({ currentLocation, compliance }: { currentLocation: string; compliance: number }) {
  const current = LOCATION_COORDS[currentLocation];
  return (
    <svg viewBox="0 0 100 90" style={{ width: "100%", maxWidth: "280px", margin: "0 auto", display: "block" }}>
      {/* Water */}
      <path d="M60,45 Q75,50 80,65 Q82,75 70,80 Q60,85 55,75 Q50,65 60,45" fill="var(--color-background-tertiary)" opacity="0.4" />
      <path d="M30,60 Q35,55 40,60 Q45,65 35,70 Q25,68 30,60" fill="var(--color-background-tertiary)" opacity="0.3" />

      {/* Location dots + labels */}
      {Object.entries(LOCATION_COORDS).map(([name, pos]) => {
        const isCurrent = name === currentLocation;
        const isAccessible = compliance < 400 || name === "Hammarby Sjöstad" || name === "The Apex" ||
          (compliance < 800 && (name === "Pionen" || name === "Kista Skrotgård"));
        const dotColor = isCurrent ? "var(--color-text-primary)" : isAccessible ? "var(--color-text-tertiary)" : "var(--color-background-tertiary)";

        return (
          <g key={name}>
            <circle cx={pos.x} cy={pos.y} r={isCurrent ? 2.5 : 1.5} fill={dotColor}>
              {isCurrent && <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />}
              {isCurrent && <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />}
            </circle>
            <text x={pos.x} y={pos.y - 4} textAnchor="middle" fontSize="3.2" fill={isCurrent ? "var(--color-text-primary)" : "var(--color-text-tertiary)"} fontFamily="system-ui, sans-serif" opacity={isCurrent ? 1 : 0.6}>
              {name === "Hammarby Sjöstad" ? "Hammarby" : name === "Kista Skrotgård" ? "Skrotgården" : name === "Serverhall Noll" ? "Serverhallen" : name}
            </text>
          </g>
        );
      })}

      {/* Connection lines */}
      {current && Object.entries(LOCATION_COORDS).filter(([n]) => n !== currentLocation).map(([name, pos]) => (
        <line key={name} x1={current.x} y1={current.y} x2={pos.x} y2={pos.y} stroke="var(--color-border-tertiary)" strokeWidth="0.3" strokeDasharray="1,2" opacity="0.3" />
      ))}
    </svg>
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
  const [pastScenes, setPastScenes] = useState<{ text: string; playerAction?: string }[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [revealParagraphs, setRevealParagraphs] = useState<string[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const isRevealing = revealParagraphs.length > 0 && revealedCount < revealParagraphs.length;
  const allRevealed = revealParagraphs.length > 0 && revealedCount >= revealParagraphs.length;
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

  const advanceReveal = useCallback(() => {
    setRevealedCount((c) => Math.min(c + 1, revealParagraphs.length));
  }, [revealParagraphs.length]);

  // Keyboard: space/enter/ArrowDown to advance reveal
  useEffect(() => {
    if (!isRevealing) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        advanceReveal();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isRevealing, advanceReveal]);

  const scrollRafRef = useRef<number | null>(null);
  const smoothScrollTo = useCallback((target: number) => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    const start = window.scrollY;
    const distance = target - start;
    if (Math.abs(distance) < 2) return;
    const duration = Math.min(800, Math.max(300, Math.abs(distance) * 1.5));
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      window.scrollTo(0, start + distance * ease);
      if (progress < 1) scrollRafRef.current = requestAnimationFrame(step);
      else scrollRafRef.current = null;
    }
    scrollRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!bottomRef.current) return;
    const targetY = bottomRef.current.getBoundingClientRect().top + window.scrollY - window.innerHeight + 80;
    if (targetY > window.scrollY) smoothScrollTo(targetY);
  }, [streamingText, isThinking, ambientFragments, revealedCount, smoothScrollTo]);

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

  function enterRevealMode(text: string) {
    const cleaned = cleanSceneText(text);
    const paras = cleaned.split("\n").filter((l) => l.trim());
    if (paras.length === 0) return;
    setRevealParagraphs(paras);
    setRevealedCount(1); // Show first paragraph immediately
  }

  async function startGame() {
    setIsThinking(true); setIsStreaming(true); setStreamingText(""); setStarted(true);
    setHudExpanded(false); setHints([]); setRevealParagraphs([]); setRevealedCount(0);
    stopAmbient();
    let accumulated = "";
    try {
      const res = await fetch("/api/game");
      await readStream(res, (text) => { accumulated += text; }, (newState, newMeta) => {
        setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta);
        setHints(newMeta.hints ?? []); setHasUnsavedChanges(true);
        onStateChange?.(newState, [], accumulated);
        enterRevealMode(accumulated);
      });
    } catch { setScene("Systemfel. ECHO svarar inte."); }
    finally { setIsThinking(false); setIsStreaming(false); setHudExpanded(true); startAmbient(); }
  }

  async function sendInput(overrideText?: string) {
    const playerText = (overrideText ?? input).trim();
    if (!playerText || isStreaming || !state) return;
    if (isRevealing) return; // Don't allow input while revealing
    setInput("");

    // Push current scene to history
    if (scene) {
      setPastScenes((prev) => [...prev, { text: scene, playerAction: playerText }]);
    }

    stopAmbient();
    setAmbientDimmed(true);
    setHudExpanded(false);
    setHints([]); setRevealParagraphs([]); setRevealedCount(0);

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
        accumulated += text;
      }, (newState, newMeta) => {
        setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta);
        setHints(newMeta.hints ?? []); setHistory(newHistory); setHasUnsavedChanges(true);
        onStateChange?.(newState, newHistory, accumulated);
        enterRevealMode(accumulated);
      });
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

  const visibleFragments = ambientFragments.slice(-3);

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "1.5rem 1rem 3rem" }}>
      <div style={{ maxWidth: "680px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "18px", fontWeight: 400, fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>ECHO</span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span
              onClick={() => setJournalOpen((v) => !v)}
              style={{ fontSize: "10px", color: journalOpen ? "var(--color-text-primary)" : "var(--color-text-tertiary)", cursor: "pointer", letterSpacing: "0.06em", transition: "color 0.2s" }}
            >
              JOURNAL
            </span>
            <span
              onClick={() => setMapOpen((v) => !v)}
              style={{ fontSize: "10px", color: mapOpen ? "var(--color-text-primary)" : "var(--color-text-tertiary)", cursor: "pointer", letterSpacing: "0.06em", transition: "color 0.2s" }}
            >
              KARTA
            </span>
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
        {state?.flags && <Journal flags={state.flags} open={journalOpen} onToggle={() => setJournalOpen((v) => !v)} />}

        {mapOpen && (
          <div style={{ marginBottom: "1rem", padding: "1rem", background: "var(--color-background-secondary)", borderRadius: "12px", animation: "sceneFadeIn 0.3s ease-out both" }}>
            <MiniMap currentLocation={meta.location} compliance={meta.compliance} />
          </div>
        )}

        {isThinking && <EchoThinking message={loadingMessage} />}

        {pastScenes.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            {pastScenes.map((past, i) => (
              <div key={i} style={{ marginBottom: "0.75rem" }}>
                {past.playerAction && (
                  <div style={{ fontSize: "12px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em", marginBottom: "0.4rem", paddingLeft: "0.5rem", borderLeft: "2px solid var(--color-border-tertiary)" }}>
                    {past.playerAction}
                  </div>
                )}
                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "1.25rem 1.5rem", opacity: 0.5 }}>
                  <SceneText text={past.text} streaming={false} dimmed />
                </div>
              </div>
            ))}
          </div>
        )}

        {revealParagraphs.length > 0 && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "2rem 2.25rem", marginBottom: "1.5rem" }}>
            <RevealingScene
              paragraphs={revealParagraphs}
              revealedCount={revealedCount}
              onAdvance={advanceReveal}
              allRevealed={allRevealed}
            />
          </div>
        )}

        {allRevealed && !isStreaming && hints.length > 0 && (
          <ActionHints hints={hints} onSelect={(hint) => sendInput(hint)} />
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

        <div style={{ display: "flex", gap: "8px", opacity: isRevealing ? 0 : (isStreaming ? 0.5 : 1), transition: "opacity 0.4s", pointerEvents: isRevealing || isStreaming ? "none" : "auto" }}>
          <input value={input}
            onChange={(e) => { setInput(e.target.value); if (e.target.value) setAmbientPaused(true); else setAmbientPaused(false); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendInput(); } }}
            placeholder={isStreaming ? "ECHO skriver..." : "Vad gör du?"}
            disabled={isStreaming || isRevealing}
            style={{ flex: 1, padding: "12px 16px", fontSize: "14px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
          <button onClick={() => sendInput()} disabled={isStreaming || isRevealing || !input.trim()}
            style={{ padding: "12px 20px", fontSize: "14px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", background: "transparent", color: "var(--color-text-primary)", cursor: isStreaming || isRevealing || !input.trim() ? "not-allowed" : "pointer", opacity: isStreaming || isRevealing || !input.trim() ? 0.4 : 1, transition: "opacity 0.3s" }}>
            →
          </button>
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
