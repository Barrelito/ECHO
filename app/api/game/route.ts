import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ECHO_SYSTEM_PROMPT } from "@/lib/echo-prompt";
import type { GameState, GameMessage, GameRequest, SceneType } from "@/lib/types";

const client = new Anthropic();

const DEFAULT_STATE: GameState = {
  compliance: 892,
  location: "Hammarby Sjöstad",
  time: "06:47",
  faction: "neutral",
  inNeuralDive: false,
  echoAwareness: "low",
  flags: {},
  turnCount: 0,
};

function buildStateContext(state: GameState): string {
  return `
## AKTUELLT SPELTILLSTÅND

COMPLIANCE: ${state.compliance}
PLATS: ${state.location}
TID: ${state.time}
FRAKTION: ${state.faction}
NEURAL DYKNING: ${state.inNeuralDive ? "AKTIV" : "Inaktiv"}
ECHO MEDVETENHET: ${state.echoAwareness}
TUR: ${state.turnCount}
FÖREGÅENDE SCENTYP: ${state.sceneType ?? "ingen"}

NARRATIVA FLAGGOR:
${
  Object.entries(state.flags)
    .filter(([, v]) => v)
    .map(([k]) => `- ${k}`)
    .join("\n") || "- Inga ännu"
}
---`.trim();
}

interface AIStateBlock {
  sceneType?: SceneType;
  location?: string;
  time?: string;
  compliance?: number;
  complianceDelta?: number;
  inNeuralDive?: boolean;
  echoAwareness?: "low" | "medium" | "high";
  flags?: Record<string, boolean>;
  hints?: string[];
  ambientHook?: string;
}

function parseStructuredResponse(fullText: string): { sceneText: string; stateBlock: AIStateBlock | null } {
  const stateMarker = "---STATE";
  const idx = fullText.indexOf(stateMarker);
  if (idx === -1) {
    return { sceneText: fullText, stateBlock: null };
  }

  const sceneText = fullText.slice(0, idx).trim();
  const jsonStr = fullText.slice(idx + stateMarker.length).trim().split("\n")[0];

  try {
    const stateBlock = JSON.parse(jsonStr) as AIStateBlock;
    return { sceneText, stateBlock };
  } catch {
    return { sceneText, stateBlock: null };
  }
}

function applyStateBlock(
  currentState: GameState,
  block: AIStateBlock | null
): GameState {
  const newState = { ...currentState, turnCount: currentState.turnCount + 1 };

  if (block) {
    if (block.location) newState.location = block.location;
    if (block.time) newState.time = block.time;
    if (typeof block.compliance === "number") {
      newState.compliance = Math.max(0, Math.min(1000, block.compliance));
    }
    if (typeof block.inNeuralDive === "boolean") newState.inNeuralDive = block.inNeuralDive;
    if (block.echoAwareness) newState.echoAwareness = block.echoAwareness;
    if (block.flags) {
      newState.flags = { ...newState.flags, ...block.flags };
    }
    if (block.sceneType) newState.sceneType = block.sceneType;
    if (block.ambientHook) newState.ambientHook = block.ambientHook;
  }

  return newState;
}

export async function POST(req: NextRequest) {
  const body: GameRequest = await req.json();
  const { playerInput, history, state = DEFAULT_STATE, recentAmbientFragments } = body;

  if (!playerInput?.trim()) {
    return new Response("Ingen spelarinput", { status: 400 });
  }

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: buildStateContext(state),
    },
    {
      role: "assistant",
      content: "Speltillstånd inläst. Redo att fortsätta.",
    },
    ...history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    {
      role: "user",
      content: recentAmbientFragments?.length
        ? `## RECENT AMBIENT OBSERVATIONS\nThe player has observed the following while waiting:\n${recentAmbientFragments.map((f) => `- ${f}`).join("\n")}\nThe player's input may reference these observations.\n\n${playerInput}`
        : playerInput,
    },
  ];

  let fullText = "";

  const stream = client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 768,
    system: ECHO_SYSTEM_PROMPT,
    messages,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullText += text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", text })}\n\n`
              )
            );
          }
        }

        const { stateBlock } = parseStructuredResponse(fullText);
        const updatedState = applyStateBlock(state, stateBlock);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              state: updatedState,
              meta: {
                location: updatedState.location,
                time: updatedState.time,
                compliance: updatedState.compliance,
                inNeuralDive: updatedState.inNeuralDive,
                echoAwareness: updatedState.echoAwareness,
                hints: stateBlock?.hints ?? [],
                sceneType: stateBlock?.sceneType ?? "scen",
                ambientHook: stateBlock?.ambientHook,
              },
            })}\n\n`
          )
        );

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

const OPENING_SCENARIOS = [
  `Öppning: KAFFET. Morgon i Hammarby Sjöstad. Compliance 892.
Kaffet smakar annorlunda idag — inte dåligt, men annorlunda. ECHO har justerat receptet.
Scentyp: SCEN (120–200 ord). Använd tre slag: förankring, vridning, krok.
Fånga den perfekta världen och det nästan omärkbara obehaget under ytan.`,

  `Öppning: KAPSELN. Morgonpendel genom tunneln. Compliance 892.
Transportkapseln stannar 0.3 sekunder för länge vid Gullmarsplan. Ingen annan verkar märka det.
Scentyp: SCEN (120–200 ord). Använd tre slag: förankring, vridning, krok.
Fånga rutinens perfektion och den lilla glitchen som bryter mönstret.`,

  `Öppning: SPEGELN. Morgon i badrummet. Compliance 892.
Din spegel visar din hälsostatus innan du hunnit öppna ögonen ordentligt. Idag står det ett nummer du aldrig sett förut.
Scentyp: SCEN (120–200 ord). Använd tre slag: förankring, vridning, krok.
Fånga den intima övervakningens obehag — systemet vet mer om din kropp än du.`,

  `Öppning: GRANNEN. Trapphuset i Hammarby Sjöstad. Compliance 892.
Grannen i 4B har inte synts på tre dagar. Hennes dörr har bytt färg — subtilt, nästan omärkbart.
Scentyp: SCEN (120–200 ord). Använd tre slag: förankring, vridning, krok.
Fånga vardagens yta och antydningen att någon raderats ur systemet.`,
];

export async function GET() {
  const openingState = { ...DEFAULT_STATE };
  let fullText = "";

  const opening = OPENING_SCENARIOS[Math.floor(Math.random() * OPENING_SCENARIOS.length)];

  const stream = client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 768,
    system: ECHO_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${buildStateContext(openingState)}\n\n${opening}`,
      },
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullText += text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", text })}\n\n`
              )
            );
          }
        }

        const { stateBlock } = parseStructuredResponse(fullText);
        const updatedOpening = stateBlock
          ? { ...openingState, ...( stateBlock.location ? { location: stateBlock.location } : {}), ...( stateBlock.time ? { time: stateBlock.time } : {}) }
          : openingState;

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              state: updatedOpening,
              meta: {
                location: updatedOpening.location,
                time: updatedOpening.time,
                compliance: 892,
                inNeuralDive: false,
                echoAwareness: "low",
                hints: stateBlock?.hints ?? [],
                sceneType: stateBlock?.sceneType ?? "scen",
                ambientHook: stateBlock?.ambientHook,
              },
            })}\n\n`
          )
        );

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
