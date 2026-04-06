"use client";

import { useState, useEffect, useRef } from "react";
import type { GameState, GameMessage, Meta } from "@/lib/types";

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

export default function EchoGame() {
  const [scene, setScene] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [history, setHistory] = useState<GameMessage[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [meta, setMeta] = useState<Meta>({ location: "Hammarby Sjöstad", time: "06:47", compliance: 892, inNeuralDive: false, echoAwareness: "low" });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingMessage = useEchoLoadingMessage(isThinking);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingText, isThinking]);

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
      await readStream(res, (text) => { accumulated += text; setStreamingText(accumulated); }, (newState, newMeta) => { setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta); });
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
      await readStream(res, (text) => { accumulated += text; setStreamingText(accumulated); }, (newState, newMeta) => { setScene(accumulated); setStreamingText(""); setState(newState); setMeta(newMeta); setHistory(newHistory); });
    } catch { setScene("Systemfel. ECHO svarar inte."); }
    finally { setIsThinking(false); setIsStreaming(false); }
  }

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: "1rem" }}>SYSTEMSTATUS: VAKEN</div>
          <h1 style={{ fontSize: "52px", fontWeight: 400, fontFamily: "Georgia, serif", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>ECHO</h1>
          <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", lineHeight: "1.75", marginBottom: "2.5rem" }}>
            Stockholm. Nära framtid. En AI styr allt — trafik, mat, tid, tanke. Systemet älskar dig.<br />Och något stämmer inte.
          </p>
          <button onClick={startGame} style={{ padding: "12px 36px", fontSize: "13px", fontWeight: 500, border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Starta spelet
          </button>
        </div>
      </div>
    );
  }

  const displayText = streamingText || scene;

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "1.5rem 1rem 3rem" }}>
      <div style={{ maxWidth: "680px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "18px", fontWeight: 400, fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>ECHO</span>
          <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tur {state?.turnCount ?? 0}</span>
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
