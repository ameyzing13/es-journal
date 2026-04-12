import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const formData  = await request.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) return NextResponse.json({ error: "No audio file" }, { status: 400 });

    // Use verbose_json for word-level timestamps / confidence
    const transcription = await openai.audio.transcriptions.create({
      file:            audioFile,
      model:           "gpt-4o-transcribe",
      response_format: "json",
      language:        "es",
      prompt:          "This is a Spanish language journal entry. The speaker may mix English and Spanish naturally.",
    });

    const transcript = typeof transcription === "string" ? transcription : (transcription as { text: string }).text ?? "";
    const words      = transcript.trim().split(/\s+/).filter(Boolean);
    const wpm        = 0; // computed on client from duration

    return NextResponse.json({
      transcript,
      words_spoken:     words.length,
      wpm,
      confidence_data:  [], // gpt-4o-transcribe doesn't expose word-level confidence in JSON mode
    });
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.json({ error: "Transcription failed", details: String(err) }, { status: 500 });
  }
}
