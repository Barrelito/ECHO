import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AMBIENT_SYSTEM_PROMPT } from "@/lib/ambient-prompt";
import type { AmbientRequest, AmbientEvent } from "@/lib/types";

const client = new Anthropic();

function buildAmbientContext(req: AmbientRequest): string {
  const { state, lastSceneSummary, ambientHook, sceneType } = req;
  const flags = Object.entries(state.flags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");

  const complianceTier = state.compliance >= 800 ? "GRÖN" : state.compliance >= 400 ? "AMBER" : state.compliance >= 100 ? "RÖD" : "RADERAD";

  return `PLATS: ${state.location}
TID: ${state.time}
COMPLIANCE: ${state.compliance}
COMPLIANCE-TIER: ${complianceTier}
FRAKTION: ${state.faction}
NEURAL DYKNING: ${state.inNeuralDive ? "AKTIV" : "Inaktiv"}
FLAGGOR: ${flags || "Inga"}
SCENTYP: ${sceneType ?? "scen"}
SENASTE SCEN: ${lastSceneSummary}
STÄMNINGSFRAS: ${ambientHook ?? "ingen"}`;
}

export async function POST(req: NextRequest) {
  const body: AmbientRequest = await req.json();

  if (!body.state) {
    return NextResponse.json({ error: "Missing state" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system: AMBIENT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildAmbientContext(body),
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const actionable = rawText.startsWith("[ACTIONABLE]");
    const text = actionable
      ? rawText.replace(/^\[ACTIONABLE\]\s*/, "").trim()
      : rawText.trim();

    const event: AmbientEvent = {
      type: "ambient",
      text,
      actionable,
    };

    return NextResponse.json(event);
  } catch (err) {
    console.error("Ambient fragment error:", err);
    return NextResponse.json(
      { error: "Fragment generation failed" },
      { status: 500 }
    );
  }
}
