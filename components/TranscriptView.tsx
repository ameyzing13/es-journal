"use client";
import { useState, useCallback } from "react";
import type { GrammarCorrection, ConfidenceWord } from "@/lib/types";

interface TranslationState {
  word: string;
  translation: string | null;
  pos: string | null;
  example: string | null;
  loading: boolean;
  x: number;
  y: number;
}

interface Props {
  transcript: string;
  corrections: GrammarCorrection[];
  confidenceData: ConfidenceWord[];
  isAIText?: boolean; // when true, words are clickable for translation
}

export default function TranscriptView({ transcript, corrections, confidenceData, isAIText = false }: Props) {
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [translation, setTranslation] = useState<TranslationState | null>(null);

  // Build a map of problematic words → correction
  const correctionMap: Record<string, GrammarCorrection> = {};
  corrections.forEach(c => {
    // Try to find the span of the original phrase in the transcript
    c.original.split(" ").forEach(word => {
      const key = word.toLowerCase().replace(/[.,!?]/g, "");
      if (!correctionMap[key]) correctionMap[key] = c;
    });
  });

  // Build a map of word → confidence for low-confidence words
  const confidenceMap: Record<string, number> = {};
  confidenceData.forEach(c => {
    if (c.confidence < 0.75) {
      confidenceMap[c.word.toLowerCase()] = c.confidence;
    }
  });

  const handleWordClick = useCallback(async (word: string, e: React.MouseEvent) => {
    if (!isAIText) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const clean = word.replace(/[.,!?¡¿«»""]/g, "");

    setTranslation({ word: clean, translation: null, pos: null, example: null, loading: true, x: rect.left, y: rect.top });

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: clean, context: transcript }),
      });
      const data = await res.json();
      setTranslation(prev => prev ? { ...prev, translation: data.translation, pos: data.part_of_speech, example: data.example, loading: false } : null);
    } catch {
      setTranslation(null);
    }
  }, [isAIText, transcript]);

  // Tokenise into words, preserving spaces and punctuation
  const tokens = transcript.match(/[\w'áéíóúüñÁÉÍÓÚÜÑ]+|[^\w'áéíóúüñÁÉÍÓÚÜÑ]+/g) ?? [];

  return (
    <div style={{ position: "relative" }}>
      <p
        className={isAIText ? "" : "drop-cap"}
        style={{
          fontFamily: "var(--font-journal)",
          fontSize: "1.05rem",
          lineHeight: 1.85,
          color: "var(--graphite)",
          margin: 0,
          wordBreak: "break-word",
        }}
      >
        {tokens.map((token, i) => {
          const isWord = /[\w'áéíóúüñÁÉÍÓÚÜÑ]/.test(token);
          if (!isWord) return <span key={i}>{token}</span>;

          const key = token.toLowerCase().replace(/[.,!?]/g, "");
          const correction = correctionMap[key];
          const conf = confidenceMap[key];

          let cls = "";
          if (correction) {
            cls += ` annotation annotation-${correction.severity === "praise" ? "correct" : correction.severity === "suggestion" ? "warn" : "error"}`;
          }
          if (conf !== undefined && !correction) {
            cls += " confidence-low";
          }
          if (isAIText) cls += " word-translatable";

          const tooltipKey = `${i}-${token}`;

          return (
            <span
              key={i}
              className={cls.trim()}
              onClick={isAIText ? (e) => handleWordClick(token, e) : undefined}
              onMouseEnter={() => correction && setActiveAnnotation(tooltipKey)}
              onMouseLeave={() => setActiveAnnotation(null)}
              title={conf !== undefined && !correction ? `Low confidence (${Math.round(conf * 100)}%)` : undefined}
              style={{ position: "relative" }}
            >
              {token}
              {correction && activeAnnotation === tooltipKey && (
                <div className="annotation-tooltip" style={{ zIndex: 50 }}>
                  {correction.severity !== "praise" && (
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{correction.original}</span>
                      {" → "}
                      <strong style={{ color: "#7DD3B0" }}>{correction.corrected}</strong>
                    </div>
                  )}
                  {correction.explanation}
                </div>
              )}
            </span>
          );
        })}
      </p>

      {/* Translation tooltip */}
      {translation && (
        <>
          <div
            style={{ position:"fixed", inset:0, zIndex:149 }}
            onClick={() => setTranslation(null)}
          />
          <div
            className="translation-tooltip"
            style={{
              left: Math.min(translation.x, window.innerWidth - 300),
              top:  translation.y - 130,
              zIndex: 150,
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div className="trans-word">{translation.word}</div>
                {translation.pos && <div className="trans-pos">{translation.pos}</div>}
              </div>
              <button
                onClick={() => setTranslation(null)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ghost)", fontSize:"1.1rem", lineHeight:1, padding:"0 0 0 8px" }}
              >×</button>
            </div>
            {translation.loading ? (
              <div style={{ marginTop:8, height:16, borderRadius:4 }} className="skeleton" />
            ) : (
              <>
                <div className="trans-meaning">{translation.translation}</div>
                {translation.example && (
                  <div style={{ marginTop:8, fontSize:"0.78rem", color:"var(--ghost)", fontStyle:"italic", borderTop:"1px solid var(--border-soft)", paddingTop:8 }}>
                    {translation.example}
                  </div>
                )}
                <button
                  style={{ marginTop:10, width:"100%", padding:"6px 0", background:"var(--sage-light)", border:"1.5px solid rgba(122,158,118,0.3)", borderRadius:"var(--r-full)", fontSize:"0.75rem", fontFamily:"var(--font-data)", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--sage-dark)", cursor:"pointer" }}
                  onClick={async () => {
                    if (translation.translation) {
                      await fetch("/api/vocabulary", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ word: translation.word, translation: translation.translation, part_of_speech: translation.pos ?? "", example: translation.example ?? "" }) });
                      setTranslation(null);
                    }
                  }}
                >
                  + Save to Vocab List
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
