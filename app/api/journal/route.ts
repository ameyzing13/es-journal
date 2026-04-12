import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/journal  →  entry counts by date  +  all dates with entries
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("date");

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: { date: string }) => {
      counts[r.date] = (counts[r.date] ?? 0) + 1;
    });

    return NextResponse.json({ counts, dates: Object.keys(counts) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ counts: {}, dates: [] });
  }
}
