import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { JournalEntry, VocabWord, Persona, AppSettings } from "./types";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const akey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Chainable no-op returned when Supabase is not configured.
// Supports the full query-builder chain: .from().select().eq().order().single() etc.
// and resolves to { data: null, error: null } when awaited.
function makeNoOp(): unknown {
  const RESOLVED = Promise.resolve({ data: null, error: null });
  const handler: ProxyHandler<(...args: unknown[]) => unknown> = {
    get(_target, prop) {
      if (prop === "then")    return RESOLVED.then.bind(RESOLVED);
      if (prop === "catch")   return RESOLVED.catch.bind(RESOLVED);
      if (prop === "finally") return RESOLVED.finally.bind(RESOLVED);
      return noOpFn;
    },
    apply() { return noOp; },
  };
  const noOpFn = (..._args: unknown[]): unknown => noOp;
  const noOp: unknown = new Proxy(noOpFn, handler);
  return noOp;
}
const _noOp = makeNoOp();

// Lazy client — only created when credentials are present to avoid build errors
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!url || !akey) return null;
  if (!_client) _client = createClient(url, akey);
  return _client;
}
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    if (!client) return _noOp;
    return (client as unknown as Record<string|symbol, unknown>)[prop];
  },
});

// ─── Journal ─────────────────────────────────────────────────────────────
export async function getEntriesForDate(date: string): Promise<JournalEntry[]> {
  if (!url) return [];
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: true });
  return (data as JournalEntry[]) ?? [];
}

export async function saveEntry(entry: JournalEntry): Promise<void> {
  if (!url) return;
  await supabase.from("journal_entries").upsert(entry);
}

export async function updateEntry(id: string, patch: Partial<JournalEntry>): Promise<void> {
  if (!url) return;
  await supabase.from("journal_entries").update(patch).eq("id", id);
}

export async function getDatesWithEntries(): Promise<string[]> {
  if (!url) return [];
  const { data } = await supabase
    .from("journal_entries")
    .select("date")
    .order("date", { ascending: false });
  const unique = [...new Set((data ?? []).map((r: { date: string }) => r.date))];
  return unique;
}

export async function getEntryCountByDate(): Promise<Record<string, number>> {
  if (!url) return {};
  const { data } = await supabase
    .from("journal_entries")
    .select("date");
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { date: string }) => {
    counts[r.date] = (counts[r.date] ?? 0) + 1;
  });
  return counts;
}

export async function searchEntries(query: string): Promise<JournalEntry[]> {
  if (!url || !query) return [];
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .or(`transcript.ilike.%${query}%,ai_response.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as JournalEntry[]) ?? [];
}

export async function getStreakAndStats(): Promise<{
  streak: number;
  totalWords: number;
  totalEntries: number;
  totalMinutes: number;
}> {
  if (!url) return { streak: 0, totalWords: 0, totalEntries: 0, totalMinutes: 0 };

  const { data } = await supabase
    .from("journal_entries")
    .select("date, words_spoken, duration_seconds")
    .order("date", { ascending: false });

  const rows = data ?? [];
  const totalWords   = rows.reduce((s: number, r: { words_spoken: number }) => s + (r.words_spoken ?? 0), 0);
  const totalEntries = rows.length;
  const totalMinutes = Math.round(rows.reduce((s: number, r: { duration_seconds: number }) => s + (r.duration_seconds ?? 0), 0) / 60);

  // Streak: consecutive days ending today
  const dates = [...new Set(rows.map((r: { date: string }) => r.date))].sort().reverse() as string[];
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i] + "T12:00:00");
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff === i || diff === i + 1) { streak++; } else { break; }
  }

  return { streak, totalWords, totalEntries, totalMinutes };
}

// ─── Vocabulary ───────────────────────────────────────────────────────────
export async function getVocabulary(): Promise<VocabWord[]> {
  if (!url) return [];
  const { data } = await supabase
    .from("vocabulary")
    .select("*")
    .order("usage_count", { ascending: false });
  return (data as VocabWord[]) ?? [];
}

export async function upsertVocabWord(word: Partial<VocabWord>): Promise<void> {
  if (!url) return;
  await supabase.from("vocabulary").upsert(word, { onConflict: "word" });
}

// ─── Personas ─────────────────────────────────────────────────────────────
export async function getPersonas(): Promise<Persona[]> {
  if (!url) return [];
  const { data } = await supabase
    .from("personas")
    .select("*")
    .order("is_default", { ascending: false });
  return (data as Persona[]) ?? [];
}

export async function upsertPersona(p: Partial<Persona>): Promise<void> {
  if (!url) return;
  await supabase.from("personas").upsert(p);
}

// ─── Settings ─────────────────────────────────────────────────────────────
export async function getDbSettings(): Promise<AppSettings | null> {
  if (!url) return null;
  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();
  return (data as AppSettings) ?? null;
}
