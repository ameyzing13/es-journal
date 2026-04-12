import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text, sourceLang, targetLang } = await request.json();

    if (!text?.trim()) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google Translate API key not configured" }, { status: 503 });
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const body = {
      q:      text,
      source: sourceLang ?? "en",
      target: targetLang ?? "es",
      format: "text",
    };

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Google Translate API error:", err);
      return NextResponse.json({ error: "Translation API error" }, { status: res.status });
    }

    const data = await res.json();
    const translation = data?.data?.translations?.[0]?.translatedText ?? "";
    const detectedSourceLanguage = data?.data?.translations?.[0]?.detectedSourceLanguage ?? sourceLang;

    return NextResponse.json({ translation, detectedSourceLanguage });
  } catch (err) {
    console.error("Google Translate error:", err);
    return NextResponse.json({ error: "Translation failed", details: String(err) }, { status: 500 });
  }
}
