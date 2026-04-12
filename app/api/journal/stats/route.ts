import { NextResponse } from "next/server";
import { getStreakAndStats } from "@/lib/supabase";

export async function GET() {
  try {
    const stats = await getStreakAndStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ streak: 0, totalWords: 0, totalEntries: 0, totalMinutes: 0 });
  }
}
