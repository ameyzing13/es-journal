"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TalkingPoint } from "@/lib/types";

interface Props {
  points: TalkingPoint[];
  followUpQuestion: string;
  onSelectPrompt: (text: string) => void;
  onUpdate: (points: TalkingPoint[]) => void;
}

export default function TalkingPointCards({ points, followUpQuestion, onSelectPrompt, onUpdate }: Props) {
  const [loadingDeeper, setLoadingDeeper] = useState<string | null>(null);

  const visible = points.filter(p => !p.dismissed);

  const dismiss = (id: string) => {
    onUpdate(points.map(p => p.id === id ? { ...p, dismissed: true } : p));
  };

  const goDeeper = async (point: TalkingPoint) => {
    if (point.deeperText) {
      onSelectPrompt(point.deeperText);
      return;
    }
    setLoadingDeeper(point.id);
    try {
      const res = await fetch("/api/respond/deeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talkingPoint: point.text }),
      });
      const data = await res.json();
      const deeper = data.deeper ?? point.text;
      onUpdate(points.map(p => p.id === point.id ? { ...p, deeperText: deeper } : p));
      onSelectPrompt(deeper);
    } catch {
      onSelectPrompt(point.text);
    } finally {
      setLoadingDeeper(null);
    }
  };

  if (visible.length === 0 && !followUpQuestion) return null;

  return (
    <div>
      {/* Talking points */}
      {visible.length > 0 && (
        <div style={{ marginBottom: "var(--sp-2)" }}>
          <div className="section-label" style={{ marginBottom: "var(--sp-1)" }}>💡 Keep Going…</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <AnimatePresence>
              {visible.map((point, i) => (
                <motion.div
                  key={point.id}
                  className="talking-card"
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  transition={{ delay: i * 0.07, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => onSelectPrompt(point.text)}
                >
                  <div className="card-text">{point.text}</div>
                  <div className="card-actions">
                    <button
                      className="btn-deeper"
                      onClick={e => { e.stopPropagation(); goDeeper(point); }}
                      disabled={loadingDeeper === point.id}
                    >
                      {loadingDeeper === point.id ? "…" : "Go deeper →"}
                    </button>
                    <button
                      className="btn-dismiss"
                      onClick={e => { e.stopPropagation(); dismiss(point.id); }}
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Follow-up question */}
      {followUpQuestion && (
        <motion.div
          className="follow-up-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          onClick={() => onSelectPrompt(followUpQuestion)}
          style={{ cursor: "pointer" }}
        >
          <span style={{ fontSize:"0.72rem", fontFamily:"var(--font-data)", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--lavender)", fontStyle:"normal", display:"block", marginBottom:6 }}>
            ✨ María asks…
          </span>
          &ldquo;{followUpQuestion}&rdquo;
        </motion.div>
      )}
    </div>
  );
}
