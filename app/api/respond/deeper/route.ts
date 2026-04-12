import { NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey:  process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(request: Request) {
  try {
    const { talkingPoint } = await request.json();

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You help Spanish learners explore topics more deeply. Given a talking point, generate a richer, more specific follow-up prompt in Spanish that encourages detailed expression. Return ONLY valid JSON: {\"deeper\": \"the expanded Spanish prompt\"}",
        },
        { role: "user", content: `Expand this talking point for a Spanish journal entry: "${talkingPoint}"` },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    try {
      const clean = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json({ deeper: parsed.deeper ?? talkingPoint });
    } catch {
      return NextResponse.json({ deeper: talkingPoint });
    }
  } catch {
    return NextResponse.json({ deeper: "" }, { status: 500 });
  }
}
