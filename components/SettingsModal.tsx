"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { AppSettings, Persona, DifficultyLevel, LanguageMode, Theme } from "@/lib/types";
import { DEFAULT_SETTINGS, DEFAULT_PERSONAS } from "@/lib/types";

interface Props { onClose: () => void; }

const DIFF_LEVELS: DifficultyLevel[] = ["A1","A2","B1","B2","C1","C2"];
const LANG_MODES: { value: LanguageMode; label: string }[] = [
  { value:"spanish", label:"🇪🇸 Spanish only" },
  { value:"mixed",   label:"🌐 Mixed (EN + ES)" },
  { value:"english", label:"🇬🇧 English explanations" },
];
const THEMES: { value: Theme; label: string }[] = [
  { value:"light", label:"☀️ Light" },
  { value:"dark",  label:"🌙 Dark"  },
  { value:"auto",  label:"🖥️ Auto"  },
];

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("sj-settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}
function loadPersonas(): Persona[] {
  if (typeof window === "undefined") return DEFAULT_PERSONAS;
  try {
    const raw = localStorage.getItem("sj-personas");
    return raw ? JSON.parse(raw) : DEFAULT_PERSONAS;
  } catch { return DEFAULT_PERSONAS; }
}
function saveSettings(s: AppSettings) {
  localStorage.setItem("sj-settings", JSON.stringify(s));
  document.documentElement.setAttribute("data-theme", s.theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : s.theme);
}
function savePersonas(p: Persona[]) {
  localStorage.setItem("sj-personas", JSON.stringify(p));
}

type Tab = "general" | "personas" | "shortcuts" | "export";

export default function SettingsModal({ onClose }: Props) {
  const [tab, setTab]         = useState<Tab>("general");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [personas, setPersonas] = useState<Persona[]>(loadPersonas());
  const [editPersonaId, setEditPersonaId] = useState<string | null>(null);
  const [listeningKey, setListeningKey]   = useState(false);
  const [saved, setSaved]                 = useState(false);

  const update = (patch: Partial<AppSettings>) => setSettings(s => ({ ...s, ...patch }));

  const handleSave = () => {
    saveSettings(settings);
    savePersonas(personas);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  // Key capture for PTT
  useEffect(() => {
    if (!listeningKey) return;
    const down = (e: KeyboardEvent) => {
      e.preventDefault();
      setListeningKey(false);
      const label = e.key === " " ? "Space" : e.key === "`" ? "`" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      update({ pttKey: e.code, pttKeyLabel: label });
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [listeningKey]);

  const editPersona = personas.find(p => p.id === editPersonaId);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ padding:"var(--sp-3)" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"var(--sp-3)" }}>
          <h2 style={{ margin:0, fontFamily:"var(--font-ui)", fontSize:"1.2rem", fontWeight:700 }}>⚙️ Settings</h2>
          <button onClick={onClose} className="btn btn-icon btn" style={{ fontSize:"1.2rem" }}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", gap:4, background:"var(--sand)", borderRadius:"var(--r-sm)", padding:4, marginBottom:"var(--sp-3)" }}>
          {(["general","personas","shortcuts","export"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`sidebar-tab ${tab === t ? "active" : ""}`} style={{ flex:1, textTransform:"capitalize", padding:"8px 6px" }}>{t}</button>
          ))}
        </div>

        {/* ── General ── */}
        {tab === "general" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-3)" }}>
            {/* Difficulty */}
            <div>
              <div className="section-label" style={{ marginBottom:8 }}>Difficulty Level</div>
              <div style={{ display:"flex", gap:6 }}>
                {DIFF_LEVELS.map(l => (
                  <button key={l}
                    onClick={() => update({ difficultyLevel: l })}
                    style={{
                      flex:1, padding:"8px 0", borderRadius:"var(--r-sm)", border:"1.5px solid",
                      fontFamily:"var(--font-data)", fontWeight:700, fontSize:"0.82rem", cursor:"pointer",
                      borderColor: settings.difficultyLevel === l ? "var(--terracotta)" : "var(--border)",
                      background:  settings.difficultyLevel === l ? "var(--terracotta-light)" : "var(--white-warm)",
                      color:       settings.difficultyLevel === l ? "var(--terracotta-dark)" : "var(--ghost)",
                      transition:"all 0.15s",
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Language mode */}
            <div>
              <div className="section-label" style={{ marginBottom:8 }}>AI Response Language</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {LANG_MODES.map(m => (
                  <button key={m.value}
                    onClick={() => update({ languageMode: m.value })}
                    style={{
                      padding:"10px 14px", borderRadius:"var(--r-sm)", border:"1.5px solid", textAlign:"left",
                      fontFamily:"var(--font-ui)", fontSize:"0.88rem", cursor:"pointer",
                      borderColor: settings.languageMode === m.value ? "var(--terracotta)" : "var(--border)",
                      background:  settings.languageMode === m.value ? "var(--terracotta-light)" : "var(--white-warm)",
                      color:       settings.languageMode === m.value ? "var(--terracotta-dark)" : "var(--graphite)",
                      transition:"all 0.15s",
                    }}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <div className="section-label" style={{ marginBottom:8 }}>Theme</div>
              <div style={{ display:"flex", gap:6 }}>
                {THEMES.map(t => (
                  <button key={t.value}
                    onClick={() => update({ theme: t.value })}
                    style={{
                      flex:1, padding:"10px 0", borderRadius:"var(--r-sm)", border:"1.5px solid",
                      fontFamily:"var(--font-ui)", fontSize:"0.82rem", cursor:"pointer",
                      borderColor: settings.theme === t.value ? "var(--terracotta)" : "var(--border)",
                      background:  settings.theme === t.value ? "var(--terracotta-light)" : "var(--white-warm)",
                      color:       settings.theme === t.value ? "var(--terracotta-dark)" : "var(--ghost)",
                    }}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <div className="section-label" style={{ marginBottom:8 }}>Font Size — {settings.fontSize}px</div>
              <input type="range" min={13} max={22} value={settings.fontSize}
                onChange={e => update({ fontSize: Number(e.target.value) })}
                style={{ width:"100%", accentColor:"var(--terracotta)" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", color:"var(--ghost)", fontFamily:"var(--font-data)", marginTop:4 }}>
                <span>Small</span><span>Large</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Personas ── */}
        {tab === "personas" && !editPersona && (
          <div>
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
              {personas.map(p => (
                <div key={p.id} className={`persona-card ${settings.activePersonaId === p.id ? "active" : ""}`}
                  style={{ "--persona-accent": p.accent_color } as React.CSSProperties}
                  onClick={() => update({ activePersonaId: p.id })}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:44, height:44, borderRadius:"var(--r-full)", background: p.accent_color + "22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem", flexShrink:0 }}>{p.avatar_emoji}</div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:"0.95rem", color:"var(--graphite)", display:"flex", alignItems:"center", gap:8 }}>
                          {p.name}
                          {settings.activePersonaId === p.id && <span className="badge badge-terra">Active</span>}
                        </div>
                        <div style={{ fontSize:"0.8rem", color:"var(--ghost)", marginTop:2 }}>{p.origin}</div>
                        <div style={{ fontSize:"0.8rem", color:"var(--slate)", marginTop:4 }}>{p.description}</div>
                      </div>
                    </div>
                    <button className="btn btn-ghost" style={{ padding:"5px 10px", fontSize:"0.78rem", flexShrink:0 }}
                      onClick={e => { e.stopPropagation(); setEditPersonaId(p.id); }}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ marginTop:"var(--sp-2)", width:"100%" }}
              onClick={() => {
                const newP: Persona = {
                  id: crypto.randomUUID(),
                  name:"New Persona", description:"Custom AI persona", origin:"",
                  accent_color:"#9B8BC4", avatar_emoji:"🤖",
                  language_mode:"spanish", is_default:false,
                  system_prompt:'Respond to Spanish journal entries as a helpful language coach.\n\nReturn ONLY valid JSON:\n{"response":"","grammar_corrections":[],"vocab_suggestions":[],"tone_feedback":"","register_feedback":"casual","talking_points":[],"follow_up_question":"","fluency_score":70,"complexity_score":65,"combined_score":68}',
                };
                setPersonas(p => [...p, newP]);
                setEditPersonaId(newP.id);
              }}>
              + New Persona
            </button>
          </div>
        )}

        {/* Persona editor */}
        {tab === "personas" && editPersona && (
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
            <button className="btn btn-ghost" style={{ alignSelf:"flex-start" }} onClick={() => setEditPersonaId(null)}>← Back</button>

            {[
              { label:"Name",        key:"name",        type:"text"     },
              { label:"Origin",      key:"origin",      type:"text"     },
              { label:"Description", key:"description", type:"text"     },
              { label:"Avatar Emoji",key:"avatar_emoji",type:"text"     },
            ].map(f => (
              <div key={f.key}>
                <div className="section-label" style={{ marginBottom:6 }}>{f.label}</div>
                <input className="input" value={(editPersona as unknown as Record<string,string>)[f.key] ?? ""} onChange={e => setPersonas(ps => ps.map(p => p.id === editPersona.id ? { ...p, [f.key]: e.target.value } : p))} />
              </div>
            ))}

            <div>
              <div className="section-label" style={{ marginBottom:6 }}>Accent Color</div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="color" value={editPersona.accent_color}
                  onChange={e => setPersonas(ps => ps.map(p => p.id === editPersona.id ? { ...p, accent_color: e.target.value } : p))}
                  style={{ width:40, height:40, border:"none", borderRadius:"var(--r-sm)", cursor:"pointer" }} />
                <span style={{ fontSize:"0.82rem", color:"var(--ghost)", fontFamily:"var(--font-data)" }}>{editPersona.accent_color}</span>
              </div>
            </div>

            <div>
              <div className="section-label" style={{ marginBottom:6 }}>System Prompt</div>
              <textarea className="input" value={editPersona.system_prompt} rows={8}
                onChange={e => setPersonas(ps => ps.map(p => p.id === editPersona.id ? { ...p, system_prompt: e.target.value } : p))}
                style={{ fontFamily:"var(--font-data)", fontSize:"0.78rem" }} />
              <div style={{ fontSize:"0.72rem", color:"var(--ghost)", marginTop:6, lineHeight:1.5 }}>
                Must return JSON with: response, grammar_corrections, vocab_suggestions, tone_feedback, register_feedback, talking_points, follow_up_question, fluency_score, complexity_score, combined_score
              </div>
            </div>

            {!editPersona.is_default && (
              <button className="btn" style={{ background:"var(--coral-light)", color:"var(--coral)", border:"1.5px solid rgba(232,107,95,0.3)", padding:"10px" }}
                onClick={() => {
                  setPersonas(ps => ps.filter(p => p.id !== editPersona.id));
                  if (settings.activePersonaId === editPersona.id) update({ activePersonaId: "maria" });
                  setEditPersonaId(null);
                }}>
                Delete Persona
              </button>
            )}
          </div>
        )}

        {/* ── Shortcuts ── */}
        {tab === "shortcuts" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
            <div>
              <div className="section-label" style={{ marginBottom:8 }}>Push-to-Talk Key</div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ flex:1, background:"var(--sand)", border:"1.5px solid var(--border)", borderRadius:"var(--r-sm)", padding:"10px 14px", fontFamily:"var(--font-data)", fontSize:"0.88rem", color:"var(--graphite)" }}>
                  {listeningKey ? "Press any key…" : <kbd style={{ background:"var(--white-warm)", border:"1px solid var(--border)", padding:"3px 10px", borderRadius:4, fontFamily:"var(--font-data)", fontSize:"0.9rem" }}>{settings.pttKeyLabel}</kbd>}
                </div>
                <button className="btn btn-secondary" onClick={() => setListeningKey(true)} disabled={listeningKey} style={{ flexShrink:0 }}>
                  {listeningKey ? "Listening…" : "Change key"}
                </button>
              </div>
            </div>
            <div style={{ background:"var(--sand)", borderRadius:"var(--r-md)", padding:"var(--sp-2)" }}>
              <div className="section-label" style={{ marginBottom:8 }}>Keyboard Shortcuts</div>
              {[
                [`${settings.pttKeyLabel}`,     "Start / stop recording"],
                ["Escape",                       "Clear active prompt"],
                ["Ctrl/Cmd + Enter",             "Submit in translate box"],
              ].map(([key, action]) => (
                <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid var(--border-soft)" }}>
                  <span style={{ fontSize:"0.85rem", color:"var(--slate)" }}>{action}</span>
                  <kbd style={{ background:"var(--white-warm)", border:"1px solid var(--border)", padding:"3px 10px", borderRadius:4, fontFamily:"var(--font-data)", fontSize:"0.78rem" }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Export ── */}
        {tab === "export" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
            <div style={{ background:"var(--sand)", borderRadius:"var(--r-md)", padding:"var(--sp-3)", textAlign:"center" }}>
              <div style={{ fontSize:"3rem", marginBottom:8 }}>📄</div>
              <div style={{ fontFamily:"var(--font-journal)", fontStyle:"italic", color:"var(--slate)", marginBottom:"var(--sp-2)" }}>Export all your journal entries</div>
              <button className="btn btn-primary" style={{ marginBottom:8, width:"100%" }}
                onClick={async () => {
                  const res = await fetch("/api/journal/export?format=text");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "spanish-journal.txt"; a.click();
                  URL.revokeObjectURL(url);
                }}>
                Export as Text
              </button>
              <button className="btn btn-secondary" style={{ width:"100%", opacity:0.5 }}>
                Export as PDF (coming soon)
              </button>
            </div>
          </div>
        )}

        {/* Save button */}
        <div style={{ marginTop:"var(--sp-3)", display:"flex", gap:"var(--sp-1)", justifyContent:"flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <motion.button
            className="btn btn-primary"
            onClick={handleSave}
            animate={saved ? { scale:[1, 1.05, 1] } : {}}
            style={{ minWidth:100 }}
          >
            {saved ? "✓ Saved!" : "Save Settings"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
