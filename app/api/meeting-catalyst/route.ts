import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getLife, saveMeetingCatalyst } from "@/lib/store";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { lifeId, apiKey } = await req.json();

    if (!lifeId) {
      return NextResponse.json({ error: "lifeId is required." }, { status: 400 });
    }

    const life = getLife(lifeId);
    if (!life) {
      return NextResponse.json({ error: "Life profile not found." }, { status: 404 });
    }

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "OpenAI API key is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: key });

    const prompt = `You are a creative coach helping someone bring their parallel-life character into the real world. Based on this character's profile, generate a "Meeting Catalyst" — a specific, actionable scenario for how this person could embody their parallel self in real life and potentially meet someone (a friend, stranger, or another parallel-life player).

CHARACTER LIFE LEDGER:
- Age: ${life.demographics.age}
- Occupation: ${life.demographics.occupation}
- Socioeconomic Status: ${life.demographics.socioeconomicStatus}
- Location: ${life.demographics.location}
- Backstory: ${life.narrativeArc.backstory}
- Social Web:
${life.socialWeb.map(n => `  • ${n.name} — ${n.occupation} — ${n.relationship}`).join("\n")}

Generate a Meeting Catalyst. This is NOT a fictional story — it is a practical, actionable scenario the user can actually try in real life. 

Respond in STRICT JSON format:
{
  "scenario": (string, 100-200 words. A SPECIFIC, actionable real-world scenario. E.g., "Go to a neighborhood café on a rainy Tuesday afternoon. Sit at the communal table. Order something your parallel self would order. When someone sits nearby, you have a natural opening because..."),
  "location": (string, a specific type of place — "a quiet neighborhood café", "a park bench near the community garden", "the produce aisle of a mid-range grocery store"),
  "approach": (string, 50-100 words. Concrete advice on HOW to approach or embody this. E.g., body language tips, conversation openers rooted in the character's personality),
  "dialoguePrompt": (string, a specific, natural opening line the character might say — not cheesy, not rehearsed-sounding, just human)
}

Make it feel doable, not intimidating. The goal is small real-world experimentation, not performance.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You output ONLY valid JSON, no markdown, no backticks." },
        { role: "user", content: prompt }
      ],
      temperature: 0.85,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";

    let jsonStr = raw;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Failed to parse catalyst. Try again.", raw }, { status: 500 });
    }

    // Persist the catalyst
    saveMeetingCatalyst(uuid(), lifeId, parsed);

    return NextResponse.json({ catalyst: parsed });
  } catch (err: any) {
    console.error("Meeting catalyst error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
