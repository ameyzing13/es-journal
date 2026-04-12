import { NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey:  process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(request: Request) {
  try {
    const { word, context } = await request.json();

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a concise Spanish-English dictionary. Given a Spanish word and its context, provide a translation.
Return ONLY valid JSON (no markdown):
{"translation":"English meaning","part_of_speech":"noun|verb|adj|adv|prep|etc","example":"short example sentence in Spanish with English translation in parentheses"}`,
        },
        {
          role: "user",
          content: `Word: "${word}"\nContext: "${context?.slice(0, 200) ?? ""}"`,
        },
      ],
      temperature: 0.3,
      max_tokens:  200,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    try {
      const clean = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      return NextResponse.json(match ? JSON.parse(match[0]) : { translation: "—", part_of_speech: "", example: "" });
    }
  } catch (err) {
    console.error("Translate error:", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
