import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getLife, saveSimulationLog } from "@/lib/store";
import { ParallelLife } from "@/lib/types";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { lifeIdA, lifeIdB, scenario, apiKey } = await req.json();

    if (!lifeIdA || !lifeIdB) {
      return NextResponse.json({ error: "Both lifeIdA and lifeIdB are required." }, { status: 400 });
    }

    const lifeA = getLife(lifeIdA);
    const lifeB = getLife(lifeIdB);

    if (!lifeA || !lifeB) {
      return NextResponse.json({ error: "One or both life profiles not found." }, { status: 404 });
    }

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "OpenAI API key is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: key });

    const profileSummary = (life: ParallelLife, label: string) => `
${label}:
- Age: ${life.demographics.age}
- Occupation: ${life.demographics.occupation}
- Socioeconomic Status: ${life.demographics.socioeconomicStatus}
- Location: ${life.demographics.location}
- Education: ${life.narrativeArc.education}
- Career Path: ${life.narrativeArc.careerPath}
- Backstory: ${life.narrativeArc.backstory}
- Personality Base: ${life.basePersonality}
- Relationships: ${life.socialWeb.map(n => `${n.name} (${n.relationship})`).join(", ")}
`;

    const scenarioHint = scenario?.trim()
      ? `\nThe user has suggested this scenario/context: "${scenario}"\n`
      : "";

    const prompt = `You are a literary fiction writer specializing in realistic, understated human encounters. You are given the parallel-life profiles of TWO characters. Write a scene — a short story — depicting how these two specific people would meet and interact.

${profileSummary(lifeA, "CHARACTER A")}
${profileSummary(lifeB, "CHARACTER B")}
${scenarioHint}
Write a rich, literary scene (300-500 words) that:

1. Places them in a SPECIFIC, believable setting where they could naturally cross paths given their demographics and locations. If they live in different cities, find a plausible reason for one to be in the other's city (a conference, visiting family, a layover, a mediocre vacation).
2. Shows their personalities through action, dialogue, and internal observation — not exposition.
3. Avoids tropes. No meet-cutes, no instant chemistry, no dramatic coincidences. Think: two strangers at a DMV, a delayed flight, a community college evening class, a hospital waiting room.
4. Captures the texture of real human awkwardness, small talk, and the quiet significance of fleeting connection.
5. Ends naturally — they may exchange numbers, or simply part ways forever. Either is fine.

Write in third person past tense. Make it feel like a passage from a contemporary literary novel. Don't label the characters A and B — use their actual names or refer to them naturally.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 1500,
    });

    const story = completion.choices[0]?.message?.content || "The two lives drifted past each other like ships in the night, never quite intersecting.";

    // Persist the simulation log
    saveSimulationLog(uuid(), lifeIdA, lifeIdB, story, scenario?.trim() || undefined);

    return NextResponse.json({ story });
  } catch (err: any) {
    console.error("Simulation error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
