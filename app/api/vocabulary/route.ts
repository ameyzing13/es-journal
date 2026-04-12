import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/vocabulary
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vocabulary")
      .select("*")
      .order("usage_count", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ words: data ?? [] });
  } catch {
    return NextResponse.json({ words: [] });
  }
}

// POST /api/vocabulary → upsert word
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { word, translation, part_of_speech, example } = body;

    // Try to increment usage count if word already exists
    const { data: existing } = await supabase
      .from("vocabulary")
      .select("id, usage_count")
      .eq("word", word)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from("vocabulary")
        .update({ usage_count: (existing.usage_count ?? 1) + 1, updated_at: new Date().toISOString() })
        .eq("word", word)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ word: data });
    } else {
      const { data, error } = await supabase
        .from("vocabulary")
        .insert({
          id: crypto.randomUUID(),
          word, translation, part_of_speech: part_of_speech ?? "", example: example ?? "",
          usage_count: 1, mastery_level: 0, srs_stage: 0,
          next_review: null, created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ word: data });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
