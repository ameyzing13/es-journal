import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ entries: [] });

  try {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("id, date, transcript, ai_response, created_at")
      .or(`transcript.ilike.%${q}%,ai_response.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) throw error;
    return NextResponse.json({ entries: data ?? [] });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
