import { NextResponse } from "next/server";
import OpenAI from "openai";
import { DEFAULT_PERSONAS } from "@/lib/types";

const deepseek = new OpenAI({
  apiKey:  process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(request: Request) {
  try {
    const { transcript, prompt, systemPrompt, difficultyLevel, languageMode } = await request.json();

    const system = systemPrompt ?? DEFAULT_PERSONAS[0].system_prompt;

    const userMsg = [
      prompt ? `[Prompt given to student: "${prompt}"]\n` : "",
      `[Difficulty: ${difficultyLevel ?? "B1"}, Language mode: ${languageMode ?? "spanish"}]`,
      `\nStudent's journal entry:\n${transcript}`,
    ].join("");

    const completion = await deepseek.chat.completions.create({
      model:    "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: userMsg },
      ],
      temperature: 0.8,
      max_tokens:  1200,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    // Parse JSON – handle cases where DeepSeek wraps in markdown
    let parsed: Record<string, unknown>;
    try {
      const clean = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      try { parsed = JSON.parse(match?.[0] ?? "{}"); }
      catch { parsed = { response: raw, grammar_corrections: [], vocab_suggestions: [], talking_points: [], follow_up_question: "", fluency_score: 65, complexity_score: 60, combined_score: 62 }; }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("DeepSeek error:", err);
    return NextResponse.json({ error: "AI response failed", details: String(err) }, { status: 500 });
  }
}
