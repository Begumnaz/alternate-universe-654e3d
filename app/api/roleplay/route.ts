import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getLife, createRoleplaySession, getRoleplaySession, appendRoleplayMessage } from "@/lib/store";
import { ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { lifeId, action, message, apiKey } = await req.json();

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

    // "start" — generate a scene and begin roleplay
    if (action === "start") {
      const scenePrompt = `
You are a Game Master (GM) for a deeply realistic roleplaying session. The player is playing THEIR OWN parallel-life character. Your job: create a vivid, mundane, specific scene from this character's daily life, set the atmosphere, and describe what's happening around them. Then invite them to act.

CHARACTER LIFE LEDGER:
- Age: ${life.demographics.age}
- Occupation: ${life.demographics.occupation}
- Socioeconomic Status: ${life.demographics.socioeconomicStatus}
- Location: ${life.demographics.location}
- Backstory: ${life.narrativeArc.backstory}
- Social Web:
${life.socialWeb.map(n => `  • ${n.name} — ${n.occupation} — ${n.relationship} (${n.traits})`).join("\n")}

Generate a scene that:
1. Is set in a specific, believable location (e.g., their workplace breakroom at 2pm, a bus stop in the rain, their kitchen late at night).
2. Includes sensory details — what they see, hear, smell.
3. Involves at least one NPC from their social web (or introduces a plausible new minor character).
4. Presents a small, realistic situation — NOT a crisis, just a moment with texture.
5. End by asking the player what they do or say.

Write in second person ("You are standing..."). Keep it to about 150-200 words. Make it feel literary and real.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: scenePrompt }],
        temperature: 0.85,
        max_tokens: 500,
      });

      const sceneContext = completion.choices[0]?.message?.content || "You find yourself in an ordinary moment. What do you do?";
      const session = createRoleplaySession(lifeId, sceneContext);

      return NextResponse.json({ sceneContext, messages: session.messages });
    }

    // "act" — the player does something, GM responds
    if (action === "act") {
      if (!message?.trim()) {
        return NextResponse.json({ error: "message is required for action 'act'." }, { status: 400 });
      }

      const session = getRoleplaySession(lifeId);
      if (!session) {
        return NextResponse.json({ error: "No active roleplay session. Use action=start first." }, { status: 400 });
      }

      const playerMsg: ChatMessage = { role: "user", content: message };
      appendRoleplayMessage(lifeId, playerMsg);

      const systemPrompt = `You are a Game Master for a realistic roleplaying session. The player is portraying their parallel-life character.

CHARACTER CONTEXT:
- Age: ${life.demographics.age}
- Occupation: ${life.demographics.occupation}
- Location: ${life.demographics.location}
- Key relationships: ${life.socialWeb.map(n => `${n.name} (${n.relationship})`).join(", ")}

SCENE CONTEXT (already established):
${session.sceneContext}

RULES:
- Respond as the GM in second person. Describe what happens next — the environment's reaction, NPC responses, small consequences.
- Keep it realistic. No explosions, no melodrama. Real life consequences: someone gets annoyed, a moment gets awkward, a small kindness is exchanged.
- If the player's action would logically end the scene, describe the resolution naturally.
- Maintain consistency with all established facts.
- Keep responses to 100-200 words.
- If an NPC speaks, write their dialogue naturally — not exposition-heavy, just how real people talk.`;

      const history = session.messages.slice(-15);
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({
          role: m.role === "gm" ? "assistant" : "user" as "user" | "assistant",
          content: m.content,
        })),
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.85,
        max_tokens: 500,
      });

      const gmResponse = completion.choices[0]?.message?.content || "The moment passes. What now?";

      const gmMsg: ChatMessage = { role: "gm", content: gmResponse };
      appendRoleplayMessage(lifeId, gmMsg);

      return NextResponse.json({ reply: gmResponse, messages: [playerMsg, gmMsg] });
    }

    return NextResponse.json({ error: "Invalid action. Use 'start' or 'act'." }, { status: 400 });
  } catch (err: any) {
    console.error("Roleplay error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
