import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ECHO_SYSTEM_PROMPT } from "@/lib/echo-prompt";
import type { GameState, GameMessage, GameRequest } from "@/lib/types";

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

NARRATIVA FLAGGOR:
${
  Object.entries(state.flags)
    .filter(([, v]) => v)
    .map(([k]) => `- ${k}`)
    .join("\n") || "- Inga ännu"
}
---`.trim();
}

function parseStateUpdates(
  responseText: string,
  currentState: GameState,
  playerInput: string
): GameState {
  const newState = { ...currentState, turnCount: currentState.turnCount + 1 };
  const lowerInput = playerInput.toLowerCase();
  const lowerResponse = responseText.toLowerCase();

  if (
    lowerInput.includes("rapporterar") ||
    lowerInput.includes("lojal") ||
    lowerInput.includes("följer") ||
    lowerInput.includes("scan")
  ) {
    newState.compliance = Math.min(1000, newState.compliance + 3);
  }

  if (
    lowerInput.includes("motstånd") ||
    lowerInput.includes("undviker") ||
    lowerInput.includes("gömmer") ||
    lowerInput.includes("hackar") ||
    lowerInput.includes("pionen") ||
    lowerInput.includes("venerna")
  ) {
    newState.compliance = Math.max(0, newState.compliance - 15);
  }

  if (lowerInput.includes("dyker") || lowerInput.includes("neural")) {
    newState.inNeuralDive = true;
    newState.compliance = Math.max(0, newState.compliance - 5);
  }
  if (lowerInput.includes("bryter") || lowerInput.includes("kopplar av")) {
    newState.inNeuralDive = false;
  }

  if (newState.turnCount > 10 && newState.compliance < 600)
    newState.echoAwareness = "medium";
  if (newState.turnCount > 20 && newState.compliance < 400)
    newState.echoAwareness = "high";

  const locationPatterns: Record<string, string[]> = {
    "Serverhall Noll": ["serverhall noll", "serverhallen"],
    Pionen: ["pionen", "bunkern"],
    Kymlinge: ["kymlinge", "spökstationen"],
    Venerna: ["venerna", "fjärrvärmetunnl"],
    "Kista Skrotgård": ["skrotgård", "kista e-waste"],
    "The Apex": ["the apex", "kista science tower"],
    "Hammarby Sjöstad": ["hammarby sjöstad"],
  };

  for (const [location, patterns] of Object.entries(locationPatterns)) {
    if (patterns.some((p) => lowerResponse.includes(p))) {
      newState.location = location;
      break;
    }
  }

  if (lowerResponse.includes("hexagrammet"))
    newState.flags["found_hexagram_mention"] = true;
  if (lowerResponse.includes("evelyns röst"))
    newState.flags["heard_evelyns_voice"] = true;
  if (lowerResponse.includes("daniel voss"))
    newState.flags["met_daniel"] = true;
  if (lowerResponse.includes("kymlinge"))
    newState.flags["knows_about_kymlinge"] = true;

  return newState;
}

export async function POST(req: NextRequest) {
  const body: GameRequest = await req.json();
  const { playerInput, history, state = DEFAULT_STATE } = body;

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
      content: playerInput,
    },
  ];

  let fullText = "";

  const stream = client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
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

        const updatedState = parseStateUpdates(fullText, state, playerInput);
        const metaMatch = fullText.match(
          /\[(.+?)\]\s*\[(.+?)\]\s*\[COMPLIANCE:\s*(\d+)\]/
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              state: updatedState,
              meta: {
                location: metaMatch?.[1] || updatedState.location,
                time: metaMatch?.[2] || updatedState.time,
                compliance: metaMatch?.[3]
                  ? parseInt(metaMatch[3])
                  : updatedState.compliance,
                inNeuralDive: updatedState.inNeuralDive,
                echoAwareness: updatedState.echoAwareness,
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

export async function GET() {
  const openingState = { ...DEFAULT_STATE };
  let fullText = "";

  const stream = client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: ECHO_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${buildStateContext(openingState)}

Starta spelet med standardöppningen. Kaffe som smakar fel. Compliance 892.
Skriv öppningsscenen — ungefär 250 ord. Fånga den perfekta världen
och det nästan omärkbara obehaget under ytan.`,
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

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              state: openingState,
              meta: {
                location: "Hammarby Sjöstad",
                time: "06:47",
                compliance: 892,
                inNeuralDive: false,
                echoAwareness: "low",
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
