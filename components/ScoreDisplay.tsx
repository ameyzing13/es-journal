"use client";
import { motion } from "framer-motion";

interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
}

function getScoreColor(score: number) {
  if (score >= 85) return "var(--lavender)";
  if (score >= 65) return "var(--sage)";
  if (score >= 45) return "var(--amber-warm)";
  return "var(--coral)";
}

export function ScoreRing({ score, label, size = 64 }: ScoreRingProps) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = getScoreColor(score);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
        {/* Progress */}
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="score-value" style={{ color }}>
        <div style={{ fontSize: size * 0.22, lineHeight:1 }}>{score}</div>
        <div style={{ fontSize: size * 0.14, color: "var(--ghost)", fontFamily:"var(--font-data)", letterSpacing:"0.04em" }}>{label}</div>
      </div>
    </div>
  );
}

interface ScoreRowProps {
  fluency: number;
  complexity: number;
  combined: number;
}

export function ScoreRow({ fluency, complexity, combined }: ScoreRowProps) {
  return (
    <div style={{ display:"flex", gap:"var(--sp-3)", alignItems:"center", flexWrap:"wrap" }}>
      <ScoreRing score={combined}    label="Overall"    size={72} />
      <div style={{ flex:1, minWidth:160 }}>
        <ScoreBar label="Fluency"    score={fluency}    />
        <ScoreBar label="Complexity" score={complexity} />
      </div>
      <div>
        <ScoreLabel score={combined} />
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = getScoreColor(score);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:"0.72rem", fontFamily:"var(--font-data)", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--ghost)" }}>{label}</span>
        <span style={{ fontSize:"0.72rem", fontFamily:"var(--font-data)", fontWeight:700, color }}>{score}</span>
      </div>
      <div style={{ height:5, background:"var(--border)", borderRadius:"var(--r-full)", overflow:"hidden" }}>
        <motion.div
          style={{ height:"100%", background:color, borderRadius:"var(--r-full)" }}
          initial={{ width:0 }}
          animate={{ width:`${score}%` }}
          transition={{ duration:1, ease:"easeOut", delay:0.3 }}
        />
      </div>
    </div>
  );
}

function ScoreLabel({ score }: { score: number }) {
  const labels = [
    [85, "🌟 Excellent"],
    [65, "✅ Good"],
    [45, "📈 Growing"],
    [0,  "🌱 Starter"],
  ] as const;
  const found = labels.find(([min]) => score >= min);
  const [, text] = found ?? labels[labels.length - 1];
  const color = getScoreColor(score);
  return (
    <div style={{
      background: color + "22",
      border: `1.5px solid ${color}44`,
      borderRadius: "var(--r-full)",
      padding: "5px 14px",
      fontSize: "0.8rem",
      fontFamily: "var(--font-data)",
      fontWeight: 700,
      color,
      whiteSpace:"nowrap",
    }}>
      {text}
    </div>
  );
}
