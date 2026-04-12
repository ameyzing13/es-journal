"use client";
import { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  isRecording: boolean;
}

export default function WaveformVisualizer({ stream, isRecording }: Props) {
  const barsRef   = useRef<HTMLDivElement[]>([]);
  const rafRef    = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef    = useRef<AudioContext | null>(null);

  const BAR_COUNT = 24;

  useEffect(() => {
    if (!stream || !isRecording) {
      // Reset bars
      barsRef.current.forEach(bar => { if (bar) bar.style.transform = "scaleY(0.15)"; });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const freq = data[Math.floor(i * data.length / BAR_COUNT)] ?? 0;
        const scale = 0.15 + (freq / 255) * 0.85;
        bar.style.transform = `scaleY(${scale})`;
        bar.style.opacity   = String(0.4 + scale * 0.6);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      ctx.close();
    };
  }, [stream, isRecording]);

  return (
    <div className="waveform" style={{ height: 56 }}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={el => { if (el) barsRef.current[i] = el; }}
          style={{
            width: 4,
            height: 32,
            borderRadius: "var(--r-full)",
            background: `var(--terracotta)`,
            transformOrigin: "center",
            transform: "scaleY(0.15)",
            opacity: 0.4,
            transition: "transform 0.04s ease",
            // Slight variation in height for visual interest
            marginTop: Math.sin(i * 0.5) * 4,
          }}
        />
      ))}
    </div>
  );
}
