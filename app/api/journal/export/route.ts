import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { JournalEntry } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "text";

  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .order("created_at", { ascending: true });

  const entries = (data ?? []) as JournalEntry[];

  if (format === "text") {
    const lines: string[] = ["# Spanish Journal Export", ""];
    let lastDate = "";
    for (const e of entries) {
      if (e.date !== lastDate) {
        lines.push(`\n## ${e.date}`, "");
        lastDate = e.date;
      }
      const time = new Date(e.created_at).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
      lines.push(`### Entry — ${time}`);
      lines.push(e.transcript ?? "");
      if (e.ai_response) { lines.push("", `> ${e.persona_name ?? "AI"}: ${e.ai_response}`); }
      if (e.combined_score) { lines.push("", `Score: ${e.combined_score}/100 (Fluency: ${e.fluency_score}, Complexity: ${e.complexity_score})`); }
      lines.push("");
    }
    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": 'attachment; filename="spanish-journal.txt"' },
    });
  }

  return NextResponse.json({ entries });
}
