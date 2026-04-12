"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { JournalEntry, AppSettings, Persona } from "@/lib/types";
import { DEFAULT_SETTINGS, DEFAULT_PERSONAS, ENTRY_TEMPLATES } from "@/lib/types";
import EntryCard from "./EntryCard";
import WaveformVisualizer from "./WaveformVisualizer";
import LearningSidebar from "./LearningSidebar";
import SettingsModal from "./SettingsModal";
import { ToastContainer, useToast } from "./Toast";

type RecordState = "idle" | "recording" | "transcribing" | "responding";

function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("sj-settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}
function getActivePersona(settings: AppSettings): Persona {
  if (typeof window === "undefined") return DEFAULT_PERSONAS[0];
  try {
    const raw = localStorage.getItem("sj-personas");
    const personas: Persona[] = raw ? JSON.parse(raw) : DEFAULT_PERSONAS;
    return personas.find(p => p.id === settings.activePersonaId) ?? DEFAULT_PERSONAS[0];
  } catch { return DEFAULT_PERSONAS[0]; }
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday:"long", year:"numeric", month:"long", day:"numeric"
  });
}

export default function JournalPage({ date }: { date: string }) {
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useToast();

  const [entries, setEntries]         = useState<JournalEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [settings, setSettings]             = useState<AppSettings>(DEFAULT_SETTINGS);
  const [persona, setPersona]               = useState<Persona>(DEFAULT_PERSONAS[0]);
  const [sidebarTab, setSidebarTab]         = useState<string>("translate");
  const [showSidebar, setShowSidebar]       = useState(false);

  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const streamRef    = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load settings & entries
  useEffect(() => {
    const s = getSettings();
    setSettings(s);
    setPersona(getActivePersona(s));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/journal/${date}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries ?? []);
        }
      } catch { /* offline */ }
      setLoading(false);
    })();
  }, [date]);

  // Theme sync
  useEffect(() => {
    const theme = settings.theme === "auto"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : settings.theme;
    document.documentElement.setAttribute("data-theme", theme);
  }, [settings.theme]);

  // PTT key listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === settings.pttKey && !e.repeat && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        if (recordState === "idle") startRecording();
        else if (recordState === "recording") stopRecording();
      }
      if (e.key === "Escape") setActivePrompt(null);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [recordState, settings.pttKey]);

  // ── Recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      streamRef.current = stream;
      setAudioStream(stream);

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find(m => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecRef.current = rec;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => processRecording();
      rec.start(100);
      setRecordState("recording");
    } catch {
      showToast("🎤 Microphone access denied — check browser settings", "error");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setAudioStream(null);
    setRecordState("transcribing");
  }, []);

  const processRecording = useCallback(async () => {
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const mimeType = chunksRef.current[0]?.type ?? "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const ext  = mimeType.includes("ogg") ? "ogg" : "webm";

    // 1. Transcribe
    setRecordState("transcribing");
    let transcript = "";
    let confidenceData: JournalEntry["confidence_data"] = [];
    let wpm = 0;

    try {
      const fd = new FormData();
      fd.append("audio", blob, `recording.${ext}`);
      const r = await fetch("/api/transcribe", { method:"POST", body: fd });
      const d = await r.json();
      transcript    = d.transcript ?? "";
      confidenceData = d.confidence_data ?? [];
      wpm           = d.wpm ?? 0;
    } catch {
      showToast("Transcription failed — check your OpenAI API key", "error");
      setRecordState("idle");
      return;
    }

    if (!transcript.trim()) {
      showToast("No speech detected — try again", "error");
      setRecordState("idle");
      return;
    }

    // 2. AI response
    setRecordState("responding");
    let aiData: Partial<JournalEntry> = {};

    try {
      const s = getSettings();
      const p = getActivePersona(s);
      const r = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          prompt: activePrompt,
          systemPrompt: p.system_prompt,
          difficultyLevel: s.difficultyLevel,
          languageMode: p.language_mode,
        }),
      });
      aiData = await r.json();
    } catch {
      showToast("AI response failed — check your DeepSeek API key", "error");
    }

    // 3. Build entry
    const wordsSpoken = transcript.trim().split(/\s+/).length;
    const entry: JournalEntry = {
      id:               crypto.randomUUID(),
      date,
      transcript,
      duration_seconds: duration,
      words_spoken:     wordsSpoken,
      wpm:              wpm || (duration > 0 ? Math.round((wordsSpoken / duration) * 60) : 0),
      fluency_score:    aiData.fluency_score    ?? 0,
      complexity_score: aiData.complexity_score ?? 0,
      combined_score:   aiData.combined_score   ?? 0,
      ai_response:          aiData.ai_response          ?? "",
      grammar_corrections:  aiData.grammar_corrections  ?? [],
      vocab_suggestions:    aiData.vocab_suggestions    ?? [],
      tone_feedback:        aiData.tone_feedback        ?? "",
      register_feedback:    aiData.register_feedback    ?? "",
      talking_points:       (aiData.talking_points ?? []).map((t, i) => ({ id:`tp-${i}`, text: typeof t === "string" ? t : (t as {text?:string}).text ?? "", dismissed:false })),
      follow_up_question:   aiData.follow_up_question   ?? "",
      confidence_data:      confidenceData,
      tags:            [],
      mood:            "",
      template_used:   activeTemplate ?? "",
      persona_name:    persona.name,
      language_mode:   persona.language_mode,
      difficulty_level: settings.difficultyLevel,
      is_starred:      false,
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    };

    // 4. Save
    try {
      await fetch(`/api/journal/${date}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry }),
      });
    } catch { /* ignore save errors in offline mode */ }

    setEntries(prev => [...prev, entry]);
    setActivePrompt(null);
    setActiveTemplate(null);
    setRecordState("idle");
    showToast("✨ Entry saved!", "success");
  }, [date, activePrompt, activeTemplate, persona, settings]);

  const updateEntry = (updated: JournalEntry) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  // ── Render ────────────────────────────────────────────────────────────
  const isProcessing = recordState === "transcribing" || recordState === "responding";

  const recordBtnClass = `record-btn ${recordState === "recording" ? "recording" : ""} ${isProcessing ? "processing" : ""}`;

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", fontSize: settings.fontSize }}>
      {/* Top bar */}
      <header className="top-bar" style={{ padding:"0 var(--sp-3)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", gap:"var(--sp-2)" }}>
          <button className="btn btn-ghost" onClick={() => router.push("/")} style={{ gap:6, flexShrink:0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width:16, height:16 }}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>

          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"var(--font-ui)", fontWeight:700, fontSize:"1rem", color:"var(--graphite)" }}>{fmtDate(date)}</div>
            <div style={{ fontSize:"0.7rem", color:"var(--ghost)", fontFamily:"var(--font-data)", letterSpacing:"0.07em", marginTop:1 }}>
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"} · {persona.avatar_emoji} {persona.name}
            </div>
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => { setShowSidebar(!showSidebar); setSidebarTab("translate"); }} title="Quick Translate" style={{ display:"none" }}>🌐</button>
            <button className="btn btn-icon btn" onClick={() => setSettingsOpen(true)} title="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:18, height:18 }}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div
        className="journal-layout"
        style={{ maxWidth:1200, margin:"0 auto", padding:"var(--sp-3)", display:"grid", gridTemplateColumns:"1fr 320px", gap:"var(--sp-3)", alignItems:"start" }}
      >
        {/* ── Left: Journal column ── */}
        <div>
          {/* Entry templates */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"var(--sp-3)", overflowX:"auto", paddingBottom:4 }}>
            {ENTRY_TEMPLATES.map(t => (
              <button
                key={t.id}
                className={`template-pill ${activeTemplate === t.id ? "active" : ""}`}
                onClick={() => {
                  if (activeTemplate === t.id) { setActiveTemplate(null); setActivePrompt(null); }
                  else { setActiveTemplate(t.id); setActivePrompt(t.prompt); }
                }}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Skeleton loading */}
          {loading && (
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
              {[120, 90, 140].map((h, i) => (
                <div key={i} className="skeleton" style={{ height:h, borderRadius:"var(--r-md)" }} />
              ))}
            </div>
          )}

          {/* Past entries */}
          {!loading && entries.length === 0 && recordState === "idle" && (
            <motion.div
              style={{ textAlign:"center", padding:"var(--sp-8) var(--sp-4)", color:"var(--ghost)" }}
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            >
              <div style={{ fontSize:"4rem", marginBottom:"var(--sp-2)" }}>📝</div>
              <div style={{ fontFamily:"var(--font-journal)", fontSize:"1.15rem", fontStyle:"italic", color:"var(--slate)", lineHeight:1.7 }}>
                This page is blank…<br/>
                Press <kbd style={{ background:"var(--sand)", border:"1px solid var(--border)", padding:"1px 6px", borderRadius:4, fontSize:"0.9em" }}>{settings.pttKeyLabel}</kbd> or tap the mic to start speaking.
              </div>
              {persona && (
                <div style={{ marginTop:"var(--sp-3)", display:"inline-flex", alignItems:"center", gap:8, background:"var(--white-warm)", border:"1.5px solid var(--border-soft)", borderRadius:"var(--r-full)", padding:"8px 16px" }}>
                  <span>{persona.avatar_emoji}</span>
                  <span style={{ fontSize:"0.82rem", color:"var(--slate)", fontFamily:"var(--font-data)", fontWeight:700 }}>
                    {persona.name} from {persona.origin} is ready
                  </span>
                </div>
              )}
            </motion.div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-3)" }}>
            {entries.map((entry, i) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                index={i}
                personaAccentColor={persona.accent_color}
                personaEmoji={persona.avatar_emoji}
                personaName={persona.name}
                onSelectPrompt={(text) => setActivePrompt(text)}
                onUpdate={updateEntry}
              />
            ))}
          </div>

          {/* ── Recording area ── */}
          <div style={{ marginTop:"var(--sp-4)", paddingTop:"var(--sp-3)", borderTop: entries.length > 0 ? "1px dashed var(--border)" : "none" }}>
            {/* Active prompt display */}
            <AnimatePresence>
              {activePrompt && (
                <motion.div
                  initial={{ opacity:0, y:12, scale:0.97 }}
                  animate={{ opacity:1, y:0, scale:1 }}
                  exit={{ opacity:0, y:-8, scale:0.97 }}
                  style={{
                    background:"var(--lavender-light)",
                    border:"1.5px solid rgba(155,139,196,0.3)",
                    borderRadius:"var(--r-md)",
                    padding:"14px 20px",
                    marginBottom:"var(--sp-3)",
                    display:"flex",
                    alignItems:"flex-start",
                    justifyContent:"space-between",
                    gap:12,
                  }}
                >
                  <div>
                    <div style={{ fontSize:"0.68rem", fontFamily:"var(--font-data)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--lavender)", marginBottom:6 }}>💬 Respond to this prompt</div>
                    <div style={{ fontFamily:"var(--font-journal)", fontSize:"1rem", fontStyle:"italic", color:"var(--lavender-dark)", lineHeight:1.65 }}>{activePrompt}</div>
                  </div>
                  <button onClick={() => { setActivePrompt(null); setActiveTemplate(null); }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ghost)", fontSize:"1.2rem", flexShrink:0, marginTop:2 }}>×</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Waveform */}
            <AnimatePresence>
              {recordState === "recording" && (
                <motion.div
                  initial={{ opacity:0, scaleY:0.5 }} animate={{ opacity:1, scaleY:1 }} exit={{ opacity:0, scaleY:0.5 }}
                  style={{ marginBottom:"var(--sp-2)", display:"flex", justifyContent:"center" }}
                >
                  <WaveformVisualizer stream={audioStream} isRecording={true} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status labels */}
            {isProcessing && (
              <div style={{ textAlign:"center", marginBottom:"var(--sp-2)" }}>
                <div style={{ display:"flex", justifyContent:"center", gap:5, marginBottom:8 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"var(--terracotta)", animation:`bounce-dot 1.2s ease-in-out infinite`, animationDelay:`${i*0.2}s` }} />
                  ))}
                </div>
                <div style={{ fontFamily:"var(--font-data)", fontSize:"0.78rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ghost)" }}>
                  {recordState === "transcribing" ? "Transcribing your Spanish…" : `${persona.name} is thinking…`}
                </div>
                {recordState === "responding" && (
                  <div className="ai-shimmer" style={{ marginTop:12, borderRadius:"var(--r-md)", height:80 }} />
                )}
              </div>
            )}

            {/* Big record button */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--sp-2)" }}>
              <button
                className={recordBtnClass}
                onClick={() => recordState === "idle" ? startRecording() : recordState === "recording" ? stopRecording() : null}
                disabled={isProcessing}
                title={recordState === "idle" ? "Start recording" : "Stop recording"}
              >
                {recordState === "recording" ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width:30, height:30 }}>
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                ) : isProcessing ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:32, height:32 }}>
                    <path d="M12 2a10 10 0 110 20A10 10 0 0112 2z" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:32, height:32 }}>
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>

              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-data)", fontSize:"0.78rem", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color: recordState === "recording" ? "var(--coral)" : "var(--ghost)" }}>
                  {recordState === "idle"        && `Press ${settings.pttKeyLabel} or tap to record`}
                  {recordState === "recording"   && `Recording… press ${settings.pttKeyLabel} to stop`}
                  {recordState === "transcribing" && "Transcribing…"}
                  {recordState === "responding"  && `${persona.name} is responding…`}
                </div>
                {recordState === "idle" && (
                  <div style={{ fontSize:"0.72rem", color:"var(--ghost)", marginTop:4, fontFamily:"var(--font-data)" }}>
                    {persona.avatar_emoji} {persona.name} · {settings.difficultyLevel} · {settings.languageMode}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Learning Sidebar ── */}
        <div className="learning-sidebar" style={{ position:"sticky", top:76 }}>
          <LearningSidebar
            entries={entries}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
          />
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => {
            setSettingsOpen(false);
            const s = getSettings();
            setSettings(s);
            setPersona(getActivePersona(s));
          }}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
