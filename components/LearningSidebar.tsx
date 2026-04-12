"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { JournalEntry, VocabWord } from "@/lib/types";

interface Props {
  entries: JournalEntry[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id:"translate", label:"Translate", emoji:"🌐" },
  { id:"words",     label:"Words",     emoji:"📚" },
  { id:"grammar",   label:"Grammar",   emoji:"✏️" },
  { id:"phrases",   label:"Phrases",   emoji:"💬" },
  { id:"quickref",  label:"Conjugate", emoji:"🔢" },
];

// ─── Google Translate Widget ───────────────────────────────────────────────
function TranslateTab() {
  const [input, setInput]     = useState("");
  const [result, setResult]   = useState<{ translation: string; pronunciation?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom]       = useState("en");
  const [to, setTo]           = useState("es");
  const [history, setHistory] = useState<Array<{ input: string; translation: string; from: string; to: string }>>([]);

  const LANGS = [
    { code:"en", label:"English" }, { code:"es", label:"Spanish" },
    { code:"fr", label:"French"  }, { code:"pt", label:"Portuguese" },
    { code:"it", label:"Italian" }, { code:"de", label:"German" },
  ];

  const translate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/google-translate", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ text: input, sourceLang: from, targetLang: to }),
      });
      const d = await r.json();
      setResult(d);
      setHistory(prev => [{ input, translation: d.translation, from, to }, ...prev.slice(0, 9)]);
    } catch {
      setResult({ translation: "Translation failed — check API key" });
    }
    setLoading(false);
  };

  const swap = () => { setFrom(to); setTo(from); setInput(result?.translation ?? input); setResult(null); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
      {/* Language selectors */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <select className="input" value={from} onChange={e => setFrom(e.target.value)} style={{ flex:1, padding:"7px 10px", fontSize:"0.82rem" }}>
          {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <button onClick={swap} className="btn btn-icon btn" title="Swap languages" style={{ flexShrink:0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:16, height:16 }}>
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
        </button>
        <select className="input" value={to} onChange={e => setTo(e.target.value)} style={{ flex:1, padding:"7px 10px", fontSize:"0.82rem" }}>
          {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>

      {/* Input */}
      <textarea
        className="input"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type text to translate…"
        rows={3}
        style={{ fontSize:"0.9rem", resize:"vertical" }}
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) translate(); }}
      />

      <button className="btn btn-primary" onClick={translate} disabled={loading || !input.trim()} style={{ width:"100%", padding:"11px", fontSize:"0.9rem" }}>
        {loading ? "Translating…" : "Translate  →"}
      </button>

      {/* Result */}
      <AnimatePresence>
        {loading && (
          <div className="skeleton" style={{ height:60, borderRadius:"var(--r-md)" }} />
        )}
        {result && !loading && (
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            style={{ background:"var(--sand)", borderRadius:"var(--r-md)", padding:"14px 16px", border:"1px solid var(--border-soft)" }}
          >
            <div style={{ fontSize:"0.68rem", fontFamily:"var(--font-data)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--ghost)", marginBottom:8 }}>Translation</div>
            <div style={{ fontFamily:"var(--font-journal)", fontSize:"1.05rem", color:"var(--graphite)", lineHeight:1.6 }}>
              {result.translation}
            </div>
            {result.pronunciation && (
              <div style={{ fontSize:"0.78rem", color:"var(--ghost)", marginTop:6, fontStyle:"italic" }}>/{result.pronunciation}/</div>
            )}
            <button
              style={{ marginTop:10, background:"var(--sage-light)", border:"1.5px solid rgba(122,158,118,0.3)", borderRadius:"var(--r-full)", padding:"5px 14px", fontSize:"0.72rem", fontFamily:"var(--font-data)", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"var(--sage-dark)", cursor:"pointer" }}
              onClick={async () => {
                await fetch("/api/vocabulary", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ word: input, translation: result.translation }) });
              }}
            >
              + Save to Vocab
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom:8, marginTop:4 }}>Recent</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {history.slice(0,5).map((h,i) => (
              <div key={i} style={{ background:"var(--white-warm)", border:"1px solid var(--border-soft)", borderRadius:"var(--r-sm)", padding:"8px 12px", cursor:"pointer" }}
                onClick={() => { setInput(h.input); setFrom(h.from); setTo(h.to); setResult({ translation: h.translation }); }}>
                <div style={{ fontSize:"0.82rem", color:"var(--graphite)", fontFamily:"var(--font-ui)" }}>{h.input}</div>
                <div style={{ fontSize:"0.78rem", color:"var(--amber-warm)", fontFamily:"var(--font-journal)", fontStyle:"italic", marginTop:2 }}>{h.translation}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Words Tab ─────────────────────────────────────────────────────────────
function WordsTab({ entries }: { entries: JournalEntry[] }) {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/vocabulary").then(r => r.json()).then(d => setVocab(d.words ?? [])).catch(() => {});
  }, []);

  // Also show today's suggested vocab
  const todayVocab = entries.flatMap(e => e.vocab_suggestions).slice(0, 8);

  const filtered = vocab.filter(w => !search || w.word.toLowerCase().includes(search.toLowerCase()) || w.translation?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {todayVocab.length > 0 && (
        <div style={{ marginBottom:"var(--sp-3)" }}>
          <div className="section-label" style={{ marginBottom:8 }}>✨ Today&apos;s Suggestions</div>
          {todayVocab.map((v, i) => (
            <div key={i} className="vocab-card" style={{ marginBottom:6 }}>
              <span className="v-arrow">→</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                  <span className="v-used">{v.used}</span>
                  <span style={{ color:"var(--ghost)" }}>→</span>
                  <span className="v-suggest">{v.suggestion}</span>
                  {v.level && <span className="v-level">{v.level}</span>}
                </div>
                <div className="v-explanation">{v.explanation}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-label" style={{ marginBottom:8 }}>My Vocabulary</div>
      <input className="input" placeholder="Search words…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:"var(--sp-2)", fontSize:"0.85rem" }} />

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--sp-4) 0", color:"var(--ghost)" }}>
          <div style={{ fontSize:"2rem", marginBottom:8 }}>📖</div>
          <div style={{ fontSize:"0.85rem", fontStyle:"italic" }}>No saved words yet.<br/>Click any word in an AI response to translate &amp; save.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtered.map(w => (
            <div key={w.id} style={{ background:"var(--white-warm)", border:"1px solid var(--border-soft)", borderRadius:"var(--r-sm)", padding:"10px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <span style={{ fontFamily:"var(--font-journal)", fontWeight:600, color:"var(--amber-warm)", fontSize:"0.95rem" }}>{w.word}</span>
                  {w.part_of_speech && <span style={{ fontSize:"0.68rem", color:"var(--ghost)", marginLeft:6, fontFamily:"var(--font-data)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{w.part_of_speech}</span>}
                  <div style={{ fontSize:"0.82rem", color:"var(--graphite)", marginTop:2 }}>{w.translation}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:"0.68rem", fontFamily:"var(--font-data)", color:"var(--ghost)" }}>{w.usage_count}×</div>
                  <div style={{ marginTop:4, width:40, height:4, background:"var(--border)", borderRadius:"var(--r-full)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${w.mastery_level}%`, background:"var(--sage)", borderRadius:"var(--r-full)" }} />
                  </div>
                </div>
              </div>
              {w.example && <div style={{ fontSize:"0.75rem", color:"var(--ghost)", fontStyle:"italic", marginTop:6, borderTop:"1px solid var(--border-soft)", paddingTop:6 }}>{w.example}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Grammar Tab ───────────────────────────────────────────────────────────
function GrammarTab({ entries }: { entries: JournalEntry[] }) {
  const corrections = entries.flatMap(e => e.grammar_corrections);
  const errors   = corrections.filter(c => c.severity === "error");
  const warns    = corrections.filter(c => c.severity === "suggestion");
  const praises  = corrections.filter(c => c.severity === "praise");

  if (corrections.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"var(--sp-4) 0", color:"var(--ghost)" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:8 }}>✏️</div>
        <div style={{ fontSize:"0.85rem", fontStyle:"italic" }}>Grammar feedback will appear<br/>after your first entry today.</div>
      </div>
    );
  }

  function CorrectionList({ items, label, color }: { items: typeof corrections; label: string; color: string }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom:"var(--sp-2)" }}>
        <div className="section-label" style={{ marginBottom:6, color }}>{label}</div>
        {items.map((c, i) => (
          <div key={i} style={{ background:"var(--white-warm)", border:`1.5px solid ${color}33`, borderRadius:"var(--r-sm)", padding:"10px 14px", marginBottom:6 }}>
            {c.severity !== "praise" && (
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"var(--font-journal)", textDecoration:"line-through", color:"var(--ghost)", fontSize:"0.88rem" }}>{c.original}</span>
                <span style={{ color:"var(--ghost)" }}>→</span>
                <span style={{ fontFamily:"var(--font-journal)", color, fontWeight:600, fontSize:"0.88rem" }}>{c.corrected}</span>
              </div>
            )}
            <div style={{ fontSize:"0.8rem", color:"var(--slate)", lineHeight:1.5 }}>{c.explanation}</div>
            {c.type && <div style={{ fontSize:"0.65rem", fontFamily:"var(--font-data)", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--ghost)", marginTop:4 }}>{c.type.replace(/_/g," ")}</div>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <CorrectionList items={errors}  label="🔴 Errors"      color="var(--coral)" />
      <CorrectionList items={warns}   label="🟡 Suggestions"  color="var(--amber-warm)" />
      <CorrectionList items={praises} label="🟢 Well done"    color="var(--sage)" />
    </div>
  );
}

// ─── Phrases Tab ───────────────────────────────────────────────────────────
function PhrasesTab({ entries }: { entries: JournalEntry[] }) {
  const words = entries.flatMap(e => e.transcript.toLowerCase().match(/[\w'áéíóúüñ]+/g) ?? []);
  const freq: Record<string,number> = {};
  words.forEach(w => { if (w.length > 3) freq[w] = (freq[w]??0) + 1; });
  const sorted = Object.entries(freq).sort(([,a],[,b]) => b - a).slice(0, 20);

  return (
    <div>
      <div className="section-label" style={{ marginBottom:8 }}>Words You Use Most</div>
      {sorted.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--sp-3)", color:"var(--ghost)", fontSize:"0.85rem", fontStyle:"italic" }}>No entries yet today.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {sorted.map(([word, count]) => (
            <div key={word} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--white-warm)", border:"1px solid var(--border-soft)", borderRadius:"var(--r-sm)", padding:"8px 14px" }}>
              <span style={{ fontFamily:"var(--font-journal)", color:"var(--amber-warm)", fontSize:"0.95rem" }}>{word}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:60, height:4, background:"var(--border)", borderRadius:"var(--r-full)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min((count/(sorted[0]?.[1]??1))*100, 100)}%`, background:"var(--terracotta)", borderRadius:"var(--r-full)" }} />
                </div>
                <span style={{ fontFamily:"var(--font-data)", fontSize:"0.72rem", color:"var(--ghost)", minWidth:20, textAlign:"right" }}>{count}×</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick Ref Tab ─────────────────────────────────────────────────────────
function QuickRefTab() {
  const [verb, setVerb]   = useState("hablar");
  const [tense, setTense] = useState("presente");

  const TENSES = ["presente","pretérito","imperfecto","futuro","condicional","subjuntivo"];
  const PRONOUNS = ["yo","tú","él/ella","nosotros","vosotros","ellos/ellas"];

  // Static conjugation data for common verbs
  const CONJUGATIONS: Record<string, Record<string, string[]>> = {
    hablar: {
      presente:   ["hablo","hablas","habla","hablamos","habláis","hablan"],
      pretérito:  ["hablé","hablaste","habló","hablamos","hablasteis","hablaron"],
      imperfecto: ["hablaba","hablabas","hablaba","hablábamos","hablabais","hablaban"],
      futuro:     ["hablaré","hablarás","hablará","hablaremos","hablaréis","hablarán"],
      condicional:["hablaría","hablarías","hablaría","hablaríamos","hablaríais","hablarían"],
      subjuntivo: ["hable","hables","hable","hablemos","habléis","hablen"],
    },
    ser: {
      presente:   ["soy","eres","es","somos","sois","son"],
      pretérito:  ["fui","fuiste","fue","fuimos","fuisteis","fueron"],
      imperfecto: ["era","eras","era","éramos","erais","eran"],
      futuro:     ["seré","serás","será","seremos","seréis","serán"],
      condicional:["sería","serías","sería","seríamos","seríais","serían"],
      subjuntivo: ["sea","seas","sea","seamos","seáis","sean"],
    },
    estar: {
      presente:   ["estoy","estás","está","estamos","estáis","están"],
      pretérito:  ["estuve","estuviste","estuvo","estuvimos","estuvisteis","estuvieron"],
      imperfecto: ["estaba","estabas","estaba","estábamos","estabais","estaban"],
      futuro:     ["estaré","estarás","estará","estaremos","estaréis","estarán"],
      condicional:["estaría","estarías","estaría","estaríamos","estaríais","estarían"],
      subjuntivo: ["esté","estés","esté","estemos","estéis","estén"],
    },
    tener: {
      presente:   ["tengo","tienes","tiene","tenemos","tenéis","tienen"],
      pretérito:  ["tuve","tuviste","tuvo","tuvimos","tuvisteis","tuvieron"],
      imperfecto: ["tenía","tenías","tenía","teníamos","teníais","tenían"],
      futuro:     ["tendré","tendrás","tendrá","tendremos","tendréis","tendrán"],
      condicional:["tendría","tendrías","tendría","tendríamos","tendríais","tendrían"],
      subjuntivo: ["tenga","tengas","tenga","tengamos","tengáis","tengan"],
    },
    ir: {
      presente:   ["voy","vas","va","vamos","vais","van"],
      pretérito:  ["fui","fuiste","fue","fuimos","fuisteis","fueron"],
      imperfecto: ["iba","ibas","iba","íbamos","ibais","iban"],
      futuro:     ["iré","irás","irá","iremos","iréis","irán"],
      condicional:["iría","irías","iría","iríamos","iríais","irían"],
      subjuntivo: ["vaya","vayas","vaya","vayamos","vayáis","vayan"],
    },
  };

  const rows = CONJUGATIONS[verb]?.[tense];

  return (
    <div>
      <div className="section-label" style={{ marginBottom:8 }}>Conjugation Table</div>
      <div style={{ display:"flex", gap:8, marginBottom:"var(--sp-2)" }}>
        <select className="input" value={verb} onChange={e => setVerb(e.target.value)} style={{ flex:1, padding:"7px 10px", fontSize:"0.82rem" }}>
          {Object.keys(CONJUGATIONS).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="input" value={tense} onChange={e => setTense(e.target.value)} style={{ flex:1, padding:"7px 10px", fontSize:"0.82rem" }}>
          {TENSES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ background:"var(--white-warm)", border:"1px solid var(--border-soft)", borderRadius:"var(--r-md)", overflow:"hidden" }}>
        <div style={{ background:"var(--sand)", padding:"8px 14px", borderBottom:"1px solid var(--border-soft)" }}>
          <span style={{ fontFamily:"var(--font-journal)", fontWeight:700, color:"var(--terracotta)", fontSize:"1.05rem" }}>{verb}</span>
          <span style={{ fontFamily:"var(--font-data)", fontSize:"0.7rem", color:"var(--ghost)", marginLeft:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>{tense}</span>
        </div>
        {rows ? rows.map((conj, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 14px", borderBottom: i < rows.length - 1 ? "1px solid var(--border-soft)" : "none", background: i % 2 === 0 ? "transparent" : "var(--sand)" }}>
            <span style={{ fontSize:"0.78rem", fontFamily:"var(--font-data)", color:"var(--ghost)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{PRONOUNS[i]}</span>
            <span style={{ fontFamily:"var(--font-journal)", color:"var(--amber-warm)", fontWeight:600, fontSize:"0.95rem" }}>{conj}</span>
          </div>
        )) : (
          <div style={{ padding:"var(--sp-2)", textAlign:"center", color:"var(--ghost)", fontSize:"0.85rem", fontStyle:"italic" }}>Not available for this combination</div>
        )}
      </div>

      <div style={{ marginTop:"var(--sp-2)", padding:"12px 14px", background:"var(--lavender-light)", borderRadius:"var(--r-md)", border:"1.5px solid rgba(155,139,196,0.2)" }}>
        <div style={{ fontSize:"0.68rem", fontFamily:"var(--font-data)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--lavender)", marginBottom:6 }}>Tip</div>
        <div style={{ fontSize:"0.8rem", color:"var(--lavender-dark)", lineHeight:1.55 }}>
          {tense === "subjuntivo" && "Use subjunctive for wishes, doubts, and emotions: quiero que tú hagas..."}
          {tense === "pretérito"  && "Preterite is for completed actions with a clear end point."}
          {tense === "imperfecto" && "Imperfect describes ongoing or habitual past actions."}
          {tense === "futuro"     && "Future tense can also express probability in the present."}
          {tense === "presente"   && "Present tense for current actions and general truths."}
          {tense === "condicional"&& "Conditional expresses hypothetical situations: if I were..."}
        </div>
      </div>
    </div>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────
export default function LearningSidebar({ entries, activeTab, onTabChange }: Props) {
  return (
    <div className="card-glass" style={{ padding:"var(--sp-2)", display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", background:"var(--sand)", borderRadius:"var(--r-sm)", padding:4 }}>
        {TABS.map(t => (
          <button key={t.id} className={`sidebar-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => onTabChange(t.id)} style={{ flex:"1 1 auto", display:"flex", alignItems:"center", justifyContent:"center", gap:4, minWidth:0 }}>
            <span style={{ fontSize:"0.85rem" }}>{t.emoji}</span>
            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ maxHeight:"75vh", overflowY:"auto", paddingRight:4 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity:0, y:8 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }}
            transition={{ duration:0.18 }}
          >
            {activeTab === "translate" && <TranslateTab />}
            {activeTab === "words"     && <WordsTab entries={entries} />}
            {activeTab === "grammar"   && <GrammarTab entries={entries} />}
            {activeTab === "phrases"   && <PhrasesTab entries={entries} />}
            {activeTab === "quickref"  && <QuickRefTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
