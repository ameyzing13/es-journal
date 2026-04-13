"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { JournalEntry, TalkingPoint } from "@/lib/types";
import TranscriptView from "./TranscriptView";
import TalkingPointCards from "./TalkingPointCards";
import { ScoreRow } from "./ScoreDisplay";

interface Props {
  entry: JournalEntry;
  index: number;
  personaAccentColor: string;
  personaEmoji: string;
  personaName: string;
  onSelectPrompt: (text: string) => void;
  onUpdate: (updated: JournalEntry) => void;
  onDelete: (id: string) => void;
}

export default function EntryCard({ entry, index, personaAccentColor, personaEmoji, personaName, onSelectPrompt, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded]       = useState(true);
  const [starred, setStarred]         = useState(entry.is_starred);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const time = new Date(entry.created_at).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });

  const toggleStar = async () => {
    setStarred(!starred);
    onUpdate({ ...entry, is_starred: !starred });
    await fetch(`/api/journal/entry/${entry.id}`, {
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ is_starred: !starred }),
    });
  };

  const handleDelete = async () => {
    await fetch(`/api/journal/entry/${entry.id}`, { method:"DELETE" });
    onDelete(entry.id);
  };

  return (
    <motion.div
      className="entry-card"
      style={{ "--persona-accent": personaAccentColor } as React.CSSProperties}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Entry header */}
      <div style={{ padding:"14px 20px 14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom: expanded ? "1px solid var(--border-soft)" : "none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"var(--r-full)", background: personaAccentColor + "22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>
            {personaEmoji}
          </div>
          <div>
            <div style={{ fontFamily:"var(--font-data)", fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--ghost)" }}>
              Entry {index + 1} · {time}
            </div>
            <div style={{ display:"flex", gap:6, marginTop:3, flexWrap:"wrap" }}>
              {entry.words_spoken > 0 && (
                <span className="badge badge-terra">{entry.words_spoken} words</span>
              )}
              {entry.wpm > 0 && (
                <span className="badge badge-amber">{Math.round(entry.wpm)} WPM</span>
              )}
              {entry.duration_seconds > 0 && (
                <span className="badge badge-lavender">
                  {entry.duration_seconds >= 60
                    ? `${Math.floor(entry.duration_seconds/60)}m ${entry.duration_seconds%60}s`
                    : `${entry.duration_seconds}s`}
                </span>
              )}
              {entry.combined_score > 0 && (
                <span className="badge" style={{ background: entry.combined_score >= 75 ? "var(--sage-light)" : entry.combined_score >= 50 ? "var(--amber-light)" : "var(--coral-light)", color: entry.combined_score >= 75 ? "var(--sage-dark)" : entry.combined_score >= 50 ? "var(--amber-warm)" : "var(--coral)" }}>
                  {entry.combined_score}/100
                </span>
              )}
              {entry.template_used && <span className="badge badge-lavender">{entry.template_used}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.2rem", lineHeight:1, transition:"transform 0.15s" }}
            onClick={toggleStar}
            title={starred ? "Unstar" : "Star entry"}
          >
            {starred ? "⭐" : "☆"}
          </button>
          {/* Delete button */}
          {confirmDelete ? (
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:"0.72rem", color:"var(--coral)", fontFamily:"var(--font-data)", fontWeight:700 }}>Delete?</span>
              <button
                className="btn"
                style={{ padding:"3px 8px", fontSize:"0.72rem", background:"var(--coral)", color:"#fff", border:"none", borderRadius:"var(--r-sm)" }}
                onClick={handleDelete}
              >Yes</button>
              <button
                className="btn btn-ghost"
                style={{ padding:"3px 8px", fontSize:"0.72rem" }}
                onClick={() => setConfirmDelete(false)}
              >No</button>
            </div>
          ) : (
            <button
              style={{ background:"none", border:"none", cursor:"pointer", lineHeight:1, transition:"opacity 0.15s", opacity:0.45, padding:"2px 4px" }}
              onClick={() => setConfirmDelete(true)}
              title="Delete entry"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:15, height:15, color:"var(--slate)" }}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          )}
          <button
            className="btn btn-ghost"
            style={{ padding:"4px 10px", fontSize:"0.78rem" }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding:"20px 24px 24px" }}>
          {/* Transcript */}
          <div style={{ marginBottom:"var(--sp-3)" }}>
            <div className="section-label" style={{ marginBottom:8 }}>🎙️ Your Entry</div>
            <TranscriptView
              transcript={entry.transcript}
              corrections={entry.grammar_corrections}
              confidenceData={entry.confidence_data}
              isAIText={false}
            />
          </div>

          {/* Scores */}
          {entry.combined_score > 0 && (
            <div style={{ marginBottom:"var(--sp-3)", padding:"16px", background:"var(--sand)", borderRadius:"var(--r-md)" }}>
              <ScoreRow
                fluency={entry.fluency_score}
                complexity={entry.complexity_score}
                combined={entry.combined_score}
              />
            </div>
          )}

          {/* Tone feedback */}
          {(entry.tone_feedback || entry.register_feedback) && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"var(--sp-2)" }}>
              {entry.register_feedback && (
                <span className="tone-pill">📢 {entry.register_feedback}</span>
              )}
              {entry.tone_feedback && (
                <span style={{ fontSize:"0.82rem", color:"var(--slate)", fontStyle:"italic" }}>{entry.tone_feedback}</span>
              )}
            </div>
          )}

          {/* Vocabulary suggestions */}
          {entry.vocab_suggestions.length > 0 && (
            <div style={{ marginBottom:"var(--sp-3)" }}>
              <div className="section-label" style={{ marginBottom:8 }}>✨ Level Up Your Vocab</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {entry.vocab_suggestions.map((v, i) => (
                  <div key={i} className="vocab-card">
                    <span className="v-arrow">→</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
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
            </div>
          )}

          {/* AI Response */}
          {entry.ai_response && (
            <div style={{ marginBottom:"var(--sp-3)" }}>
              <div style={{
                background: `linear-gradient(135deg, ${personaAccentColor}12, ${personaAccentColor}08)`,
                border: `1.5px solid ${personaAccentColor}30`,
                borderRadius:"var(--r-md)",
                padding:"18px 20px",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:"1.1rem" }}>{personaEmoji}</span>
                  <span style={{ fontFamily:"var(--font-data)", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color: personaAccentColor }}>
                    {personaName}
                  </span>
                </div>
                <TranscriptView
                  transcript={entry.ai_response}
                  corrections={[]}
                  confidenceData={[]}
                  isAIText={true}
                />
              </div>
            </div>
          )}

          {/* Talking points + follow-up */}
          <TalkingPointCards
            points={entry.talking_points}
            followUpQuestion={entry.follow_up_question}
            onSelectPrompt={onSelectPrompt}
            onUpdate={(pts) => onUpdate({ ...entry, talking_points: pts as TalkingPoint[] })}
          />
        </div>
      )}
    </motion.div>
  );
}
