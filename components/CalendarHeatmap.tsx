"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getLevel, ENTRY_TEMPLATES } from "@/lib/types";
import { useToast, ToastContainer } from "./Toast";
import SettingsModal from "./SettingsModal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayYMD() { return toYMD(new Date()); }
function formatFull(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

export default function CalendarHeatmap() {
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useToast();
  const [counts, setCounts]       = useState<Record<string,number>>({});
  const [streak, setStreak]       = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalMins, setTotalMins] = useState(0);
  const [hoverDay, setHoverDay]   = useState<string | null>(null);
  const [hoverPos, setHoverPos]   = useState({ x: 0, y: 0 });
  const [calYear, setCalYear]     = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]   = useState(new Date().getMonth());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const today = todayYMD();

  const loadData = useCallback(async () => {
    try {
      const [countRes, statsRes] = await Promise.all([
        fetch("/api/journal"),
        fetch("/api/journal/stats"),
      ]);
      if (countRes.ok) { const d = await countRes.json(); setCounts(d.counts ?? {}); }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStreak(d.streak ?? 0);
        setTotalWords(d.totalWords ?? 0);
        setTotalEntries(d.totalEntries ?? 0);
        setTotalMins(d.totalMinutes ?? 0);
      }
    } catch { /* offline / no supabase */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Heatmap (52 weeks) ────────────────────────────────────────────────
  const buildWeeks = () => {
    const weeks: string[][] = [];
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday
    let cursor = new Date(start);
    while (cursor <= end) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(toYMD(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };
  const weeks = buildWeeks();

  function heatmapClass(dateStr: string) {
    const c = counts[dateStr] ?? 0;
    if (c === 0) return "heatmap-0";
    if (c === 1) return "heatmap-1";
    if (c === 2) return "heatmap-2";
    if (c === 3) return "heatmap-3";
    return "heatmap-4";
  }

  // ── Month calendar ────────────────────────────────────────────────────
  function buildMonthGrid(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  const monthGrid = buildMonthGrid(calYear, calMonth);

  function dayClass(dateStr: string | null) {
    if (!dateStr) return "month-day month-day-empty";
    let cls = "month-day";
    if (dateStr === today) cls += " is-today";
    else if (counts[dateStr]) cls += " has-entry";
    if (dateStr > today) cls += " other-month";
    return cls;
  }

  const { level, emoji: levelEmoji, progress: lvlProgress } = getLevel(totalWords);

  // ── Search ────────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<Array<{ id:string; date:string; transcript:string }>>([]);
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/journal/search?q=${encodeURIComponent(searchQuery)}`);
      if (r.ok) { const d = await r.json(); setSearchResults(d.entries ?? []); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Top Bar */}
      <header className="top-bar" style={{ padding: "0 var(--sp-3)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <button className="btn-icon btn" onClick={() => setSettingsOpen(true)} title="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:18, height:18 }}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
            <button className="btn-icon btn" onClick={() => setSearchOpen(!searchOpen)} title="Search entries">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:18, height:18 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>

          <div style={{ textAlign: "center" }}>
            <div className="t-display" style={{ fontSize: "1.5rem", lineHeight:1 }}>Spanish Journal</div>
            <div style={{ fontSize: "0.75rem", color: "var(--ghost)", fontFamily: "var(--font-data)", letterSpacing:"0.08em", marginTop:2 }}>
              PRACTICE SPANISH · ONE DAY AT A TIME
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {streak > 0 && (
              <div className="streak-badge">
                <span className="streak-fire">🔥</span> {streak} day{streak !== 1 ? "s" : ""}
              </div>
            )}
            <div className="level-badge">{levelEmoji} {level}</div>
          </div>
        </div>
      </header>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ background: "var(--white-warm)", borderBottom: "1px solid var(--border-soft)", overflow:"hidden" }}
          >
            <div style={{ maxWidth: 1100, margin:"0 auto", padding:"var(--sp-2) var(--sp-3)" }}>
              <input
                className="input"
                placeholder="Search entries by keyword…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{ maxWidth: 480 }}
              />
              {searchResults.length > 0 && (
                <div style={{ marginTop: "var(--sp-2)", display:"flex", flexDirection:"column", gap:8, maxWidth:480 }}>
                  {searchResults.map(r => (
                    <div key={r.id} className="card" style={{ padding:"12px 16px", cursor:"pointer" }}
                      onClick={() => router.push(`/entry/${r.date}`)}>
                      <div style={{ fontSize:"0.72rem", color:"var(--ghost)", fontFamily:"var(--font-data)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{r.date}</div>
                      <div style={{ fontSize:"0.9rem", color:"var(--slate)", marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {r.transcript}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--sp-4) var(--sp-3)" }}>
        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"var(--sp-2)", marginBottom:"var(--sp-4)" }}>
          {[
            { label:"Total Entries", value: totalEntries, emoji:"📖" },
            { label:"Words Spoken", value: totalWords.toLocaleString(), emoji:"💬" },
            { label:"Minutes Spoken", value: totalMins, emoji:"🎙️" },
            { label:"Day Streak", value: streak, emoji:"🔥" },
          ].map(s => (
            <motion.div key={s.label} className="card" style={{ padding:"var(--sp-2) var(--sp-3)", textAlign:"center" }}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
              <div style={{ fontSize:"1.5rem" }}>{s.emoji}</div>
              <div style={{ fontFamily:"var(--font-data)", fontSize:"1.5rem", fontWeight:700, color:"var(--terracotta)", lineHeight:1.2 }}>{s.value}</div>
              <div className="t-label" style={{ marginTop:4 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Level progress */}
        <div className="card" style={{ padding:"var(--sp-2) var(--sp-3)", marginBottom:"var(--sp-4)", display:"flex", alignItems:"center", gap:"var(--sp-2)" }}>
          <div className="level-badge" style={{ fontSize:"0.85rem", padding:"6px 14px" }}>{levelEmoji} {level}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:"0.78rem", color:"var(--slate)", fontFamily:"var(--font-data)" }}>
                {totalWords.toLocaleString()} words spoken
              </span>
              <span style={{ fontSize:"0.78rem", color:"var(--ghost)", fontFamily:"var(--font-data)" }}>{lvlProgress}%</span>
            </div>
            <div className="level-progress-bar">
              <motion.div className="level-progress-fill" initial={{ width:0 }} animate={{ width:`${lvlProgress}%` }} transition={{ duration:1.2, ease:"easeOut" }} />
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 360px", gap:"var(--sp-4)", alignItems:"start" }}>
          {/* Left: Year heatmap + month calendar */}
          <div style={{ minWidth:0, overflow:"hidden" }}>
            {/* Year heatmap */}
            <div className="card" style={{ padding:"var(--sp-3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"var(--sp-2)" }}>
                <h2 style={{ margin:0, fontSize:"1rem", fontFamily:"var(--font-ui)", fontWeight:700 }}>Activity This Year</h2>
                <div style={{ fontSize:"0.72rem", color:"var(--ghost)", fontFamily:"var(--font-data)", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                  {totalEntries} entries
                </div>
              </div>
              {/* Month labels */}
              <div style={{ display:"flex", gap:3, marginBottom:4, paddingLeft:2 }}>
                {(() => {
                  const labels: string[] = [];
                  let lastMonth = -1;
                  weeks.forEach((week, wi) => {
                    const month = new Date(week[0] + "T12:00:00").getMonth();
                    if (month !== lastMonth) { labels.push(MONTHS[month]); lastMonth = month; }
                    else labels.push("");
                  });
                  return labels.map((l, i) => (
                    <div key={i} style={{ width:14, fontSize:"0.6rem", color:"var(--ghost)", fontFamily:"var(--font-data)", letterSpacing:"0.04em" }}>
                      {l}
                    </div>
                  ));
                })()}
              </div>
              <div style={{ display:"flex", gap:3, overflowX:"auto" }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`heatmap-cell ${heatmapClass(day)} ${day === today ? "cal-today-ring" : ""}`}
                        style={{ position:"relative" }}
                        onMouseEnter={e => { setHoverDay(day); setHoverPos({ x: (e.target as HTMLElement).getBoundingClientRect().x, y: (e.target as HTMLElement).getBoundingClientRect().y }); }}
                        onMouseLeave={() => setHoverDay(null)}
                        onClick={() => router.push(`/entry/${day}`)}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:12, justifyContent:"flex-end" }}>
                <span style={{ fontSize:"0.68rem", color:"var(--ghost)", fontFamily:"var(--font-data)" }}>Less</span>
                {[0,1,2,3,4].map(v => (
                  <div key={v} className={`heatmap-cell heatmap-${v}`} style={{ cursor:"default" }} />
                ))}
                <span style={{ fontSize:"0.68rem", color:"var(--ghost)", fontFamily:"var(--font-data)" }}>More</span>
              </div>
            </div>

            {/* Month calendar */}
            <div className="card" style={{ padding:"var(--sp-3)", marginTop:"var(--sp-3)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--sp-2)" }}>
                <button className="btn btn-ghost" style={{ padding:"6px 12px" }} onClick={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else { setCalMonth(m => m-1); }
                }}>◀</button>
                <span style={{ fontFamily:"var(--font-ui)", fontWeight:700, fontSize:"1rem" }}>{MONTH_FULL[calMonth]} {calYear}</span>
                <button className="btn btn-ghost" style={{ padding:"6px 12px" }} onClick={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else { setCalMonth(m => m+1); }
                }}>▶</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 40px)", gap:4, justifyContent:"center" }}>
                {DAYS.map(d => (
                  <div key={d} style={{ width:40, textAlign:"center", fontSize:"0.72rem", fontFamily:"var(--font-data)", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ghost)", padding:"8px 0" }}>{d}</div>
                ))}
                {monthGrid.map((dateStr, i) => (
                  <div key={i} className={dayClass(dateStr)} onClick={() => dateStr && router.push(`/entry/${dateStr}`)}>
                    {dateStr ? new Date(dateStr + "T12:00:00").getDate() : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: CTA + recent entries */}
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-3)" }}>
            {/* Start today button */}
            <motion.button
              className="btn btn-primary"
              style={{ width:"100%", padding:"20px 32px", borderRadius:"var(--r-lg)", fontSize:"1.05rem", flexDirection:"column", height:"auto", gap:8 }}
              onClick={() => router.push(`/entry/${today}`)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <span style={{ fontSize:"2rem" }}>✍️</span>
              <span>Start Today&apos;s Entry</span>
              <span style={{ fontSize:"0.78rem", opacity:0.75, fontWeight:400 }}>{formatFull(today)}</span>
            </motion.button>

            {/* Recent entries */}
            <div>
              <div className="section-label" style={{ marginBottom:"var(--sp-1)" }}>Recent Entries</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {Object.entries(counts)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 6)
                  .map(([date, count]) => (
                    <motion.div key={date} className="card" style={{ padding:"12px 16px", cursor:"pointer" }}
                      whileHover={{ x: 4 }}
                      onClick={() => router.push(`/entry/${date}`)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontFamily:"var(--font-ui)", fontWeight:700, fontSize:"0.9rem" }}>
                            {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}
                          </div>
                          <div style={{ fontSize:"0.75rem", color:"var(--ghost)", fontFamily:"var(--font-data)", marginTop:2 }}>
                            {count} entr{count !== 1 ? "ies" : "y"}
                          </div>
                        </div>
                        <div style={{ width:32, height:32, borderRadius:"var(--r-full)", background:"var(--terracotta-light)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--terracotta-dark)", fontSize:"0.8rem", fontFamily:"var(--font-data)", fontWeight:700 }}>
                          {count}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                {Object.keys(counts).length === 0 && (
                  <div style={{ textAlign:"center", padding:"var(--sp-4) var(--sp-2)", color:"var(--ghost)" }}>
                    <div style={{ fontSize:"3rem", marginBottom:8 }}>🌱</div>
                    <div style={{ fontFamily:"var(--font-journal)", fontStyle:"italic", fontSize:"0.95rem" }}>Your journey begins here.<br/>Make your first entry today.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hover tooltip for heatmap */}
      {hoverDay && (
        <div style={{
          position:"fixed",
          left: hoverPos.x + 20,
          top:  hoverPos.y - 40,
          background: "var(--graphite)",
          color:"#fff",
          fontSize:"0.75rem",
          fontFamily:"var(--font-data)",
          padding:"5px 10px",
          borderRadius:"var(--r-sm)",
          pointerEvents:"none",
          zIndex:200,
          whiteSpace:"nowrap",
        }}>
          {counts[hoverDay] ? `${counts[hoverDay]} entr${counts[hoverDay]!==1?"ies":"y"}` : "No entry"} · {hoverDay}
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
