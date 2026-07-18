import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getLife, appendInterviewMessage, getInterviewSession, updateLifeDetails } from "@/lib/store";
import { ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { lifeId, message, apiKey, model = "deepseek-chat" } = await req.json();

    if (!lifeId || !message?.trim()) {
      return NextResponse.json({ error: "lifeId and message are required." }, { status: 400 });
    }

    const life = getLife(lifeId);
    if (!life) {
      return NextResponse.json({ error: "Life profile not found. Please generate a life first." }, { status: 404 });
    }

    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "DeepSeek API key is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" });

    // Build the system prompt from the Life Ledger
    const lifeContext = `
You ARE this character. You are being interviewed about YOUR life. You must stay entirely in-character and answer based on the following Life Ledger. Never break character. Never say "the AI generated this" or "according to the data."

YOUR LIFE LEDGER:
- Name: The user plays this character (they know their own name).
- Age: ${life.demographics.age}
- Occupation: ${life.demographics.occupation}
- Socioeconomic Status: ${life.demographics.socioeconomicStatus}
- Location: ${life.demographics.location}
- Education: ${life.narrativeArc.education}
- Career Path: ${life.narrativeArc.careerPath}
- Backstory: ${life.narrativeArc.backstory}
- Turning Points: ${life.narrativeArc.turningPoints.join("; ")}
- Social Web (your relationships):
${life.socialWeb.map(n => `  • ${n.name} — ${n.occupation} — ${n.relationship} (${n.traits})`).join("\n")}
${life.additionalDetails && Object.keys(life.additionalDetails).length > 0
  ? "- Additional Known Details:\n" + Object.entries(life.additionalDetails).map(([k, v]) => `  • ${k}: ${v}`).join("\n")
  : ""}

IMPORTANT: Be consistent with the above facts. If the user asks about something not specified above, you may improvise realistic, mundane details that align with the socioeconomic and geographic context. Speak in first person. Sound like a real person — hesitant, proud, embarrassed, or matter-of-fact as appropriate. Use conversational language.
`;

    // Get conversation history
    const session = getInterviewSession(lifeId);
    const history: ChatMessage[] = session.messages.slice(-20);

    const userMsg: ChatMessage = { role: "user", content: message };
    appendInterviewMessage(lifeId, userMsg);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: lifeContext },
      ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 600,
    });

    const reply = completion.choices[0]?.message?.content || "I'm not sure what to say about that.";

    const assistantMsg: ChatMessage = { role: "assistant", content: reply };
    appendInterviewMessage(lifeId, assistantMsg);

    // Extract any new details mentioned and store them
    const detailExtraction = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Extract any new factual details about the character's life from this response. Output ONLY a JSON object of key-value pairs. If no new details, output {}." },
        { role: "user", content: reply },
      ],
      temperature: 0,
      max_tokens: 300,
    });

    try {
      const detailRaw = detailExtraction.choices[0]?.message?.content?.trim() || "{}";
      let detailJson = detailRaw;
      if (detailJson.startsWith("```")) detailJson = detailJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const newDetails = JSON.parse(detailJson);
      if (typeof newDetails === "object" && !Array.isArray(newDetails) && Object.keys(newDetails).length > 0) {
        updateLifeDetails(lifeId, newDetails);
      }
    } catch {
      // detail extraction is best-effort
    }

    return NextResponse.json({ reply, messages: [userMsg, assistantMsg] });
  } catch (err: any) {
    console.error("Interview error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
