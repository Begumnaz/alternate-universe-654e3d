import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import { ParallelLife, NPC, Demographics, NarrativeArc } from "@/lib/types";
import { saveLife } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const { basePersonality, apiKey } = await req.json();

    if (!basePersonality || typeof basePersonality !== "string" || basePersonality.trim().length < 10) {
      return NextResponse.json({ error: "Please provide a base personality description (at least 10 characters)." }, { status: 400 });
    }

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "OpenAI API key is required. Set it in your environment or provide it in the request." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: key });

    const prompt = `You are a master of deep, realistic character generation. Create a "Parallel Life" profile for a person based on their core personality traits.

The user's base personality: "${basePersonality}"

Generate a COMPLETELY DIFFERENT life from what they likely live — a parallel universe version. The life must be mundane, complicated, and deeply human. Avoid tropes and clichés. Make it feel real — with flaws, regrets, small joys, and contradictions.

Respond in STRICT JSON format (no markdown, no extra text) with exactly this structure:

{
  "demographics": {
    "age": (number, 22-75),
    "occupation": (string, a specific, non-glamorous job title),
    "socioeconomicStatus": (string, e.g. "lower-middle class", "working class", "upper-middle class"),
    "location": (string, a specific city and country)
  },
  "narrativeArc": {
    "backstory": (string, 250-400 words. A detailed, novelistic backstory explaining how they arrived at this life — childhood influences, educational history, key turning points, why they chose their current path. Make it feel like a literary biography.),
    "turningPoints": [array of 3-5 specific turning point events as strings],
    "education": (string, their educational journey),
    "careerPath": (string, how their career unfolded)
  },
  "socialWeb": [
    {
      "name": (full name),
      "occupation": (their job),
      "relationship": (e.g. "best friend since high school", "estranged sibling", "work rival", "former mentor"),
      "traits": (brief personality description)
    }
  ] (3-5 NPCs)
}

CRITICAL RULES:
- Be specific. Instead of "works in an office," say "processes insurance claims at a mid-tier firm in Des Moines."
- Give characters contradictions. The yoga instructor who smokes. The librarian with a gambling habit.
- Make relationships complex. Not just "friend" but "college roommate who loaned them money they never paid back."
- Avoid glamour. No spies, no CEOs, no lottery winners. Think real people.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a character generator. You output ONLY valid JSON, no markdown, no backticks, no commentary." },
        { role: "user", content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";

    // Strip markdown code fences if present
    let jsonStr = raw;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response. Please try again.", raw }, { status: 500 });
    }

    const life: ParallelLife = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      basePersonality: basePersonality.trim(),
      demographics: parsed.demographics as Demographics,
      narrativeArc: parsed.narrativeArc as NarrativeArc,
      socialWeb: (parsed.socialWeb as NPC[]).map((npc, i) => ({
        ...npc,
        id: `npc-${i}`,
      })),
      additionalDetails: {},
    };

    saveLife(life);

    return NextResponse.json({ life });
  } catch (err: any) {
    console.error("Generate life error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
