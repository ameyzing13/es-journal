import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { JournalEntry } from "@/lib/types";

// GET /api/journal/:date → all entries for that date
export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  try {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("date", date)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ entries: [] });
  }
}

// POST /api/journal/:date → save a new entry
export async function POST(request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  try {
    const body = await request.json();
    const entry: JournalEntry = { ...body.entry, date };

    const { data, error } = await supabase
      .from("journal_entries")
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
