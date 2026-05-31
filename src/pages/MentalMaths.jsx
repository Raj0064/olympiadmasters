import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SCREENS = {
  SETUP: "setup",
  PLAYING: "playing",
  RESULT: "result",
};

const TIMINGS = {
  correctFeedbackMs: 500,
  wrongFeedbackMs: 900,
  animationMs: 120,
  streakShowMs: 1800,
};

const DIFFICULTY = {
  4: { range: [2, 30], tableRange: [2, 10], label: "Easy", desc: "Numbers up to 30", emoji: "🟢" },
  5: { range: [5, 50], tableRange: [2, 12], label: "Medium", desc: "Numbers up to 50", emoji: "🟡" },
  6: { range: [10, 100], tableRange: [2, 15], label: "Hard", desc: "Numbers up to 100", emoji: "🟠" },
  7: { range: [20, 200], tableRange: [2, 20], label: "Expert", desc: "Numbers up to 200", emoji: "🔴" },
  8: { range: [50, 500], tableRange: [3, 25], label: "Master", desc: "Numbers up to 500", emoji: "💀" },
};

const OPS = [
  { id: "add", symbol: "+", label: "Addition", color: "#22c55e", bg: "#f0fdf4", dark: "#15803d" },
  { id: "sub", symbol: "−", label: "Subtraction", color: "#3b82f6", bg: "#eff6ff", dark: "#1d4ed8" },
  { id: "mul", symbol: "×", label: "Multiply", color: "#f59e0b", bg: "#fffbeb", dark: "#b45309" },
  { id: "div", symbol: "÷", label: "Division", color: "#a855f7", bg: "#faf5ff", dark: "#7e22ce" },
  { id: "mix", symbol: "⚡", label: "Mixed", color: "#ef4444", bg: "#fef2f2", dark: "#b91c1c" },
];

const MODES = [
  { id: "practice", icon: "🧘", label: "Practice", desc: "No timer, no limit", time: null, qLimit: null },
  { id: "speed", icon: "⚡", label: "Speed", desc: "Beat the clock", time: 60, qLimit: null },
  { id: "challenge", icon: "🎯", label: "Challenge", desc: "Fixed questions", time: null, qLimit: 10 },
];

const TIME_OPTIONS = [30, 60, 90, 120];
const QUESTION_COUNTS = [5, 10, 20, 50];

const STREAK_REWARDS = [
  { at: 3, icon: "🔥", msg: "On Fire!" },
  { at: 5, icon: "⚡", msg: "Lightning!" },
  { at: 7, icon: "💎", msg: "Diamond!" },
  { at: 10, icon: "👑", msg: "Unstoppable!" },
  { at: 15, icon: "🦄", msg: "Mythical!" },
  { at: 20, icon: "🌟", msg: "Legendary!" },
];

const ANSWER_TYPE = {
  MCQ: "mcq",
  TEXT: "text",
};

// ─── Audio singleton ───────────────────────────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { }
  }
  return _audioCtx;
}

function playTone(freq, dur = 0.12, type = "sine", vol = 0.18) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (_) { }
}

const sfx = {
  correct: () => {
    playTone(523, 0.08);
    setTimeout(() => playTone(659, 0.08), 80);
    setTimeout(() => playTone(784, 0.14), 160);
  },
  wrong: () => playTone(220, 0.18, "sawtooth", 0.12),
  streak: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(f, 0.1), i * 70)
    );
  },
  start: () => {
    playTone(440, 0.1);
    setTimeout(() => playTone(554, 0.1), 100);
  },
  end: () => {
    [784, 659, 523].forEach((f, i) =>
      setTimeout(() => playTone(f, 0.14), i * 90)
    );
  },
  tick: () => playTone(880, 0.04, "sine", 0.08),
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function makeQuestion(opId, classNum) {
  const {
    range: [rMin, rMax],
    tableRange: [tMin, tMax],
  } = DIFFICULTY[classNum];
  const op = opId === "mix" ? ["add", "sub", "mul", "div"][rand(0, 3)] : opId;
  let a, b, answer, question;

  if (op === "add") {
    a = rand(rMin, rMax);
    b = rand(rMin, rMax);
    answer = a + b;
    question = `${a} + ${b}`;
  } else if (op === "sub") {
    a = rand(rMin, rMax);
    b = rand(rMin, a);
    answer = a - b;
    question = `${a} − ${b}`;
  } else if (op === "mul") {
    a = rand(tMin, tMax);
    b = rand(tMin, tMax);
    answer = a * b;
    question = `${a} × ${b}`;
  } else {
    b = rand(tMin, tMax);
    answer = rand(tMin, tMax);
    a = b * answer;
    question = `${a} ÷ ${b}`;
  }
  return { question, answer, op };
}

function generateMCQOptions(answer) {
  const opts = new Set([answer]);
  const magnitude = Math.max(1, Math.floor(Math.abs(answer) * 0.15));
  let attempts = 0;

  while (opts.size < 4 && attempts < 50) {
    const offset = rand(1, Math.max(magnitude, 5)) * (Math.random() > 0.5 ? 1 : -1);
    const candidate = answer + offset;
    if (candidate >= 0 && candidate !== answer) {
      opts.add(candidate);
    }
    attempts++;
  }

  while (opts.size < 4) {
    opts.add(Math.abs(answer + opts.size * 2 + 1));
  }

  return [...opts].sort(() => Math.random() - 0.5);
}

// ─── localStorage ──────────────────────────────────────────────────────────────
function getHS(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function setHS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch { }
}

function getHighScore(opId, classNum, modeId) {
  return getHS(`hs_${opId}_${classNum}_${modeId}`) || { score: 0, acc: 0, streak: 0 };
}

function saveHighScore(opId, classNum, modeId, data) {
  const prev = getHighScore(opId, classNum, modeId);
  const next = {
    score: Math.max(prev.score, data.score),
    acc: Math.max(prev.acc, data.acc),
    streak: Math.max(prev.streak, data.streak),
  };
  setHS(`hs_${opId}_${classNum}_${modeId}`, next);
  return next;
}

function getSessionHistory() {
  return getHS("session_history") || [];
}

function saveSession(session) {
  const hist = getSessionHistory();
  hist.unshift(session);
  if (hist.length > 20) hist.length = 20;
  setHS("session_history", hist);
}

// ─── Theme Context ─────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

function useTheme() {
  return useContext(ThemeContext);
}

function getTheme(dark) {
  return dark
    ? {
      page: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)",
      card: "#1e293b",
      cardShadow: "0 24px 80px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
      text: "#f1f5f9",
      sub: "#94a3b8",
      border: "#334155",
      pillBg: "#0f172a",
      pillBorder: "#334155",
      statBg: "#0f172a",
      inputBg: "#0f172a",
      qBoxBg: "#0f172a",
      modeTile: "#0f172a",
      accTrack: "#0f172a",
      dark: true,
    }
    : {
      page: "linear-gradient(145deg, #eef2ff 0%, #fdf4ff 100%)",
      card: "#fff",
      cardShadow: "0 24px 80px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.04)",
      text: "#0f172a",
      sub: "#94a3b8",
      border: "#e2e8f0",
      pillBg: "#f8fafc",
      pillBorder: "#e2e8f0",
      statBg: "#f8fafc",
      inputBg: "#fff",
      qBoxBg: "#f8fafc",
      modeTile: "#f8fafc",
      accTrack: "#f1f5f9",
      dark: false,
    };
}

// ─── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const pieces = useMemo(
    () =>
      active
        ? Array.from({ length: 40 }, (_, i) => ({
          id: i,
          color: ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899"][i % 7],
          left: `${rand(2, 98)}%`,
          delay: `${(i * 0.04).toFixed(2)}s`,
          dur: `${(0.9 + Math.random() * 0.5).toFixed(2)}s`,
          size: rand(7, 14),
          rotate: rand(0, 360),
        }))
        : [],
    [active]
  );

  if (!active) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: "-20px",
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.id % 3 === 0 ? "50%" : 2,
            animation: `confettiFall ${p.dur} ${p.delay} ease-in forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Streak Toast ──────────────────────────────────────────────────────────────
function StreakToast({ reward }) {
  if (!reward) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff",
        padding: "12px 28px",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 16,
        zIndex: 9998,
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        animation: "slideDown 0.35s cubic-bezier(.22,1,.36,1)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 24 }}>{reward.icon}</span> {reward.msg}
    </div>
  );
}

// ─── Icon Button ───────────────────────────────────────────────────────────────
function IconBtn({ children, onClick, title, active }) {
  const T = useTheme();
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        border: `1.5px solid ${active ? OPS[0].color : T.border}`,
        background: active ? `${OPS[0].color}15` : T.dark ? "#0f172a" : "#f8fafc",
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SLabel({ children }) {
  const T = useTheme();
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.dark ? "#64748b" : "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 8px",
      }}
    >
      {children}
    </p>
  );
}

// ─── Play Stat ─────────────────────────────────────────────────────────────────
function PStat({ label, value, color }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: color || T.text }}>{value}</span>
      <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{label}</span>
    </div>
  );
}

// ─── Big Stat Card ─────────────────────────────────────────────────────────────
function BIG({ label, value, color }) {
  const T = useTheme();
  return (
    <div style={{ background: T.dark ? "#0f172a" : "#f8fafc", borderRadius: 14, padding: "16px 8px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Virtual Numpad ────────────────────────────────────────────────────────────
function Numpad({ onKey, disabled }) {
  const T = useTheme();

  const btn = (label, val) => (
    <button
      key={label}
      onClick={() => !disabled && onKey(val)}
      aria-label={val === "back" ? "Backspace" : val === "-" ? "Negative" : `Number ${label}`}
      style={{
        padding: "14px 0",
        borderRadius: 12,
        border: "none",
        background: T.dark ? "#1e293b" : "#f1f5f9",
        color: T.dark ? "#f1f5f9" : "#0f172a",
        fontSize: 20,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s, transform 0.1s",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
      onPointerDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.93)";
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Number pad"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 8,
        marginBottom: 10,
      }}
    >
      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => btn(String(n), String(n)))}
      {btn("⌫", "back")}
      {btn("0", "0")}
      {btn("−", "-")}
    </div>
  );
}

// ─── MCQ Options ───────────────────────────────────────────────────────────────
function MCQOptions({ options, onSelect, feedback, correctAnswer, selectedVal, color }) {
  const T = useTheme();
  const labels = ["A", "B", "C", "D"];

  return (
    <div
      role="group"
      aria-label="Answer choices"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginBottom: 14,
      }}
    >
      {options.map((opt, i) => {
        const isSelected = selectedVal === opt;
        const isCorrect = opt === correctAnswer;
        const showCorrect = feedback !== null && isCorrect;
        const showWrong = feedback === "wrong" && isSelected && !isCorrect;

        const bg = showCorrect
          ? "#22c55e"
          : showWrong
            ? "#ef4444"
            : isSelected
              ? color
              : T.dark
                ? "#1e293b"
                : "#f1f5f9";

        const col = showCorrect || showWrong || isSelected ? "#fff" : T.dark ? "#f1f5f9" : "#0f172a";

        return (
          <button
            key={i}
            onClick={() => feedback === null && onSelect(opt)}
            disabled={feedback !== null}
            aria-label={`Option ${labels[i]}: ${opt}`}
            style={{
              padding: "16px 10px",
              borderRadius: 14,
              border: `2px solid ${showCorrect
                  ? "#22c55e"
                  : showWrong
                    ? "#ef4444"
                    : isSelected
                      ? color
                      : "transparent"
                }`,
              background: bg,
              color: col,
              fontSize: 22,
              fontWeight: 800,
              cursor: feedback !== null ? "default" : "pointer",
              transition: "all 0.18s",
              boxShadow: isSelected ? `0 4px 16px ${color}44` : "none",
              WebkitTapHighlightColor: "transparent",
              transform: showCorrect ? "scale(1.03)" : showWrong ? "scale(0.97)" : "scale(1)",
            }}
          >
            {labels[i]}. {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Question History ──────────────────────────────────────────────────────────
function HistoryPanel({ history }) {
  const T = useTheme();
  if (!history.length) return null;

  return (
    <div
      style={{
        background: T.dark ? "#0f172a" : "#f8fafc",
        borderRadius: 14,
        padding: "10px 14px",
        marginBottom: 14,
        maxHeight: 200,
        overflowY: "auto",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        Recent Questions
      </p>
      {[...history]
        .reverse()
        .slice(0, 8)
        .map((h, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "3px 0",
              borderBottom: i < 7 ? `1px solid ${T.border}` : "none",
            }}
          >
            <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
              {h.question} = {h.answer}
            </span>
            <span style={{ fontSize: 14 }}>
              {h.correct ? "✅" : `❌ (${h.yourAnswer})`}
            </span>
          </div>
        ))}
    </div>
  );
}

// ─── Accuracy Ring ─────────────────────────────────────────────────────────────
function AccuracyRing({ percent, color, size = 100 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto 16px" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 900, color }}>{percent}%</span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>accuracy</span>
      </div>
    </div>
  );
}

// ─── Page Wrapper ──────────────────────────────────────────────────────────────
function PageWrapper({ children, animIn }) {
  const T = useTheme();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.page,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        fontFamily: "'DM Sans','Nunito',sans-serif",
      }}
    >
      <style>{globalCss}</style>
      <div
        style={{
          background: T.card,
          borderRadius: 28,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 480,
          boxShadow: T.cardShadow,
          opacity: animIn ? 1 : 0,
          transform: animIn ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.35s cubic-bezier(.22,1,.36,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETUP SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function SetupScreen({ config, setConfig, onStart }) {
  const T = useTheme();
  const { classNum, opId, modeId, qCount, speedTime, ansType, soundOn, darkMode } = config;
  const selectedOp = OPS.find((o) => o.id === opId);

  const set = (key) => (val) => setConfig((c) => ({ ...c, [key]: val }));

  const hs = getHighScore(opId, classNum, modeId);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 36 }}>🧮</div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: T.text,
              margin: "2px 0 0",
              letterSpacing: "-0.03em",
            }}
          >
            Mental Maths
          </h1>
          <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>Train fast. Think faster.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <IconBtn onClick={() => set("soundOn")(!soundOn)} title={soundOn ? "Sound On" : "Sound Off"}>
            {soundOn ? "🔊" : "🔇"}
          </IconBtn>
          <IconBtn onClick={() => set("darkMode")(!darkMode)} title="Toggle Dark Mode">
            {darkMode ? "☀️" : "🌙"}
          </IconBtn>
        </div>
      </div>

      {/* Difficulty */}
      <SLabel>Difficulty</SLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {[4, 5, 6, 7, 8].map((c) => (
          <button
            key={c}
            onClick={() => set("classNum")(c)}
            aria-pressed={classNum === c}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: `2px solid ${classNum === c ? selectedOp.color : T.pillBorder}`,
              background: classNum === c ? selectedOp.color : T.pillBg,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              color: classNum === c ? "#fff" : T.sub,
              transition: "all 0.18s",
            }}
          >
            {DIFFICULTY[c].emoji} {DIFFICULTY[c].label}
            <span style={{ fontSize: 10, display: "block", opacity: 0.75 }}>
              {DIFFICULTY[c].desc}
            </span>
          </button>
        ))}
      </div>

      {/* Operation */}
      <SLabel>Operation</SLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {OPS.map((op) => (
          <button
            key={op.id}
            onClick={() => set("opId")(op.id)}
            aria-pressed={opId === op.id}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "12px 4px",
              borderRadius: 14,
              border: `2px solid ${opId === op.id ? op.color : "transparent"}`,
              background: opId === op.id ? op.color : op.bg,
              color: opId === op.id ? "#fff" : "#334155",
              cursor: "pointer",
              fontWeight: 700,
              transition: "all 0.18s",
              transform: opId === op.id ? "scale(1.05)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: 20 }}>{op.symbol}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{op.label}</span>
          </button>
        ))}
      </div>

      {/* Mode */}
      <SLabel>Mode</SLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => set("modeId")(m.id)}
            aria-pressed={modeId === m.id}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "12px 6px",
              borderRadius: 14,
              border: `2px solid ${modeId === m.id ? selectedOp.color : T.border}`,
              background: modeId === m.id ? selectedOp.color + "18" : T.modeTile,
              color: modeId === m.id ? (T.dark ? "#fff" : selectedOp.dark) : T.text,
              cursor: "pointer",
              transition: "all 0.18s",
            }}
          >
            <span style={{ fontSize: 24 }}>{m.icon}</span>
            <strong style={{ fontSize: 12 }}>{m.label}</strong>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Challenge: Q count */}
      {modeId === "challenge" && (
        <div style={{ marginBottom: 14 }}>
          <SLabel>Questions</SLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => set("qCount")(n)}
                aria-pressed={qCount === n}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 12,
                  border: `2px solid ${qCount === n ? selectedOp.color : T.border}`,
                  background: qCount === n ? selectedOp.color : T.pillBg,
                  color: qCount === n ? "#fff" : T.sub,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.18s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Speed: Time picker */}
      {modeId === "speed" && (
        <div style={{ marginBottom: 14 }}>
          <SLabel>Time Limit</SLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => set("speedTime")(t)}
                aria-pressed={speedTime === t}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 12,
                  border: `2px solid ${speedTime === t ? selectedOp.color : T.border}`,
                  background: speedTime === t ? selectedOp.color : T.pillBg,
                  color: speedTime === t ? "#fff" : T.sub,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.18s",
                }}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Answer style */}
      <SLabel>Answer Style</SLabel>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {[
          { id: ANSWER_TYPE.TEXT, icon: "⌨️", label: "Type Answer" },
          { id: ANSWER_TYPE.MCQ, icon: "🔘", label: "Multiple Choice" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => set("ansType")(a.id)}
            aria-pressed={ansType === a.id}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px",
              borderRadius: 14,
              border: `2px solid ${ansType === a.id ? selectedOp.color : T.border}`,
              background: ansType === a.id ? selectedOp.color : T.pillBg,
              color: ansType === a.id ? "#fff" : T.text,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.18s",
            }}
          >
            <span>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* High score preview */}
      {hs.score > 0 && (
        <div
          style={{
            background: T.statBg,
            borderRadius: 14,
            padding: "10px 16px",
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>🏆 Personal Best</span>
          <span style={{ fontSize: 12, color: selectedOp.color, fontWeight: 800 }}>
            Score {hs.score} · {hs.acc}% · Streak {hs.streak}🔥
          </span>
        </div>
      )}

      <button
        style={{
          width: "100%",
          padding: "15px",
          borderRadius: 16,
          border: "none",
          color: "#fff",
          fontWeight: 800,
          fontSize: 15,
          cursor: "pointer",
          background: `linear-gradient(135deg, ${selectedOp.color} 0%, ${selectedOp.dark} 100%)`,
          letterSpacing: "0.01em",
          transition: "filter 0.15s, transform 0.15s",
          boxShadow: `0 4px 20px ${selectedOp.color}44`,
        }}
        className="bounce-hover"
        onClick={onStart}
      >
        Start Practice →
      </button>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAYING SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function PlayingScreen({ config, onEnd }) {
  const T = useTheme();
  const { classNum, opId, modeId, qCount, speedTime, ansType, soundOn } = config;

  const selectedOp = OPS.find((o) => o.id === opId);
  const effectiveTime = modeId === "speed" ? speedTime : null;
  const effectiveQLimit = modeId === "challenge" ? qCount : null;

  const [current, setCurrent] = useState(null);
  const [mcqOptions, setMcqOptions] = useState([]);
  const [input, setInput] = useState("");
  const [selectedMCQ, setSelectedMCQ] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(effectiveTime || 60);
  const [elapsed, setElapsed] = useState(0);
  const [shake, setShake] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [history, setHistory] = useState([]);
  const [streakReward, setStreakReward] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef(null);
  const startRef = useRef(null);
  const fbTimeout = useRef(null);
  const rewardTimeout = useRef(null);
  const endedRef = useRef(false);

  const sound = useCallback((fn) => soundOn && fn(), [soundOn]);

  // ── Initialize ──
  useEffect(() => {
    startRef.current = Date.now();
    endedRef.current = false;
    const q = makeQuestion(opId, classNum);
    setCurrent(q);
    if (ansType === ANSWER_TYPE.MCQ) setMcqOptions(generateMCQOptions(q.answer));
    sound(sfx.start);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Next question ──
  const nextQuestion = useCallback(() => {
    const q = makeQuestion(opId, classNum);
    setCurrent(q);
    if (ansType === ANSWER_TYPE.MCQ) setMcqOptions(generateMCQOptions(q.answer));
    setInput("");
    setSelectedMCQ(null);
    setFeedback(null);
  }, [opId, classNum, ansType]);

  // ── End game ──
  const doEnd = useCallback(
    (finalScore, finalTotal, finalBest) => {
      if (endedRef.current) return;
      endedRef.current = true;
      clearTimeout(fbTimeout.current);
      clearTimeout(rewardTimeout.current);
      const el = Math.floor((Date.now() - (startRef.current || Date.now())) / 1000);
      sound(sfx.end);
      onEnd({
        score: finalScore ?? score,
        total: finalTotal ?? total,
        bestStreak: finalBest ?? bestStreak,
        elapsed: el,
        history,
      });
    },
    [score, total, bestStreak, history, sound, onEnd]
  );

  // ── Timer ──
  useEffect(() => {
    if (isPaused) return;
    if (effectiveTime) {
      if (timeLeft <= 0) {
        doEnd();
        return;
      }
      if (timeLeft <= 5) sound(sfx.tick);
      const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(id);
    } else {
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000));
      }, 500);
      return () => clearInterval(id);
    }
  }, [timeLeft, effectiveTime, isPaused, doEnd, sound]);

  // ── Focus ──
  useEffect(() => {
    if (!feedback && ansType === ANSWER_TYPE.TEXT) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [current, feedback, ansType]);

  // ── Submit ──
  const submit = useCallback(
    (overrideVal) => {
      if (feedback !== null || !current || endedRef.current) return;
      const raw = overrideVal !== undefined ? String(overrideVal) : input.trim();
      const val = parseInt(raw, 10);
      if (isNaN(val)) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
        return;
      }

      const isCorrect = val === current.answer;
      const newTotal = total + 1;
      const newScore = isCorrect ? score + 1 : score;
      const newStreak = isCorrect ? streak + 1 : 0;
      const newBest = Math.max(bestStreak, newStreak);

      setTotal(newTotal);
      setScore(newScore);
      setStreak(newStreak);
      setBestStreak(newBest);
      setFeedback(isCorrect ? "correct" : "wrong");

      if (isCorrect) {
        setPulse(true);
        sound(sfx.correct);
      } else {
        sound(sfx.wrong);
      }

      if (navigator.vibrate) navigator.vibrate(isCorrect ? [30] : [60, 40, 60]);

      setHistory((h) => [
        ...h,
        {
          question: current.question,
          answer: current.answer,
          correct: isCorrect,
          yourAnswer: val,
        },
      ]);

      const reward = STREAK_REWARDS.slice()
        .reverse()
        .find((r) => newStreak === r.at);
      if (reward) {
        setStreakReward(reward);
        sound(sfx.streak);
        clearTimeout(rewardTimeout.current);
        rewardTimeout.current = setTimeout(() => setStreakReward(null), TIMINGS.streakShowMs);
      }

      fbTimeout.current = setTimeout(
        () => {
          setPulse(false);
          if (effectiveQLimit && newTotal >= effectiveQLimit) {
            doEnd(newScore, newTotal, newBest);
            return;
          }
          nextQuestion();
        },
        isCorrect ? TIMINGS.correctFeedbackMs : TIMINGS.wrongFeedbackMs
      );
    },
    [feedback, current, input, total, score, streak, bestStreak, sound, effectiveQLimit, doEnd, nextQuestion]
  );

  const selectMCQ = useCallback(
    (val) => {
      if (feedback !== null) return;
      setSelectedMCQ(val);
      submit(val);
    },
    [feedback, submit]
  );

  const handleNumpad = useCallback(
    (key) => {
      if (feedback !== null) return;
      if (key === "back") {
        setInput((s) => s.slice(0, -1));
        return;
      }
      if (key === "-") {
        setInput((s) => (s.startsWith("-") ? s.slice(1) : "-" + s));
        return;
      }
      setInput((s) => (s + key).slice(0, 6));
    },
    [feedback]
  );

  // Keyboard shortcut for pause
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setIsPaused((p) => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Cleanup
  useEffect(
    () => () => {
      clearTimeout(fbTimeout.current);
      clearTimeout(rewardTimeout.current);
    },
    []
  );

  const pct = effectiveTime
    ? (timeLeft / effectiveTime) * 100
    : effectiveQLimit
      ? (total / effectiveQLimit) * 100
      : null;
  const urgent = effectiveTime && timeLeft <= 10;

  return (
    <>
      <StreakToast reward={streakReward} />

      {/* Progress bar */}
      {pct !== null && (
        <div
          style={{
            height: 5,
            background: T.accTrack,
            borderRadius: 999,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              width: `${pct}%`,
              background: urgent ? "#ef4444" : selectedOp.color,
              transition: "width 0.8s linear",
            }}
          />
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <IconBtn onClick={() => setIsPaused((p) => !p)} title={isPaused ? "Resume" : "Pause (Esc)"}>
            {isPaused ? "▶️" : "⏸️"}
          </IconBtn>
          <IconBtn onClick={() => setShowHistory((s) => !s)} title="History" active={showHistory}>
            📋
          </IconBtn>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {streak >= 3 && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#f59e0b",
                animation: "pop 0.35s ease",
              }}
            >
              {streak}🔥
            </span>
          )}
          <span style={{ fontSize: 12, color: T.sub }}>
            {selectedOp.symbol} {DIFFICULTY[classNum].label}
          </span>
        </div>
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 52 }}>⏸️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "12px 0 8px" }}>
            Paused
          </h2>
          <p style={{ color: T.sub, marginBottom: 8, fontSize: 13 }}>
            Score: {score}/{total} · Streak: {streak}🔥
          </p>
          <p style={{ color: T.sub, marginBottom: 24, fontSize: 12 }}>Press Esc or tap to resume</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              style={{
                padding: "13px 36px",
                borderRadius: 14,
                border: "none",
                background: selectedOp.color,
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
              onClick={() => setIsPaused(false)}
            >
              Resume →
            </button>
            <button
              style={{
                padding: "13px 24px",
                borderRadius: 14,
                border: `2px solid ${T.border}`,
                background: "transparent",
                color: T.sub,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
              onClick={() => doEnd()}
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {!isPaused && (
        <>
          {showHistory && <HistoryPanel history={history} />}

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              padding: "12px 0",
              borderRadius: 14,
              background: T.statBg,
              marginBottom: 16,
            }}
          >
            <PStat label="Score" value={score} color={selectedOp.color} />
            {effectiveTime ? (
              <PStat
                label={urgent ? "⚠️ Time" : "Time"}
                value={`${timeLeft}s`}
                color={urgent ? "#ef4444" : T.sub}
              />
            ) : (
              <PStat label="Time" value={`${elapsed}s`} color={T.sub} />
            )}
            {effectiveQLimit ? (
              <PStat label="Progress" value={`${total}/${effectiveQLimit}`} color={T.sub} />
            ) : (
              <PStat label="Total" value={total} color={T.sub} />
            )}
            <PStat label="Best🔥" value={bestStreak} color={bestStreak >= 5 ? "#f59e0b" : T.sub} />
          </div>

          {/* Question box */}
          <div
            role="status"
            aria-live="polite"
            aria-label={`Question: ${current?.question} equals what?`}
            style={{
              border: `2px solid ${feedback === "correct" ? "#22c55e" : feedback === "wrong" ? "#ef4444" : T.border
                }`,
              background:
                feedback === "correct" ? "#f0fdf4" : feedback === "wrong" ? "#fef2f2" : T.qBoxBg,
              borderRadius: 22,
              padding: "32px 24px",
              textAlign: "center",
              marginBottom: 16,
              transition: "background 0.3s, border-color 0.3s",
              animation: pulse ? "pop 0.35s ease" : shake ? "shake 0.35s ease" : "none",
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: T.text,
                letterSpacing: "-0.03em",
                fontFamily: "Georgia, serif",
              }}
            >
              {current?.question} = ?
            </div>
            {feedback === "wrong" && (
              <div style={{ marginTop: 10, fontSize: 16, color: "#ef4444", fontWeight: 600 }}>
                ✓ Answer is <strong>{current?.answer}</strong>
              </div>
            )}
          </div>

          {/* Answer input */}
          {ansType === ANSWER_TYPE.MCQ ? (
            <MCQOptions
              options={mcqOptions}
              onSelect={selectMCQ}
              feedback={feedback}
              correctAnswer={current?.answer}
              selectedVal={selectedMCQ}
              color={selectedOp.color}
            />
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  disabled={feedback !== null}
                  placeholder="Your answer…"
                  aria-label="Type your answer"
                  style={{
                    flex: 1,
                    padding: "14px 18px",
                    borderRadius: 14,
                    border: `2px solid ${feedback === "correct"
                        ? "#22c55e"
                        : feedback === "wrong"
                          ? "#ef4444"
                          : selectedOp.color
                      }`,
                    fontSize: 22,
                    fontWeight: 800,
                    textAlign: "center",
                    outline: "none",
                    color: T.text,
                    background: T.inputBg,
                    fontFamily: "inherit",
                    transition: "border-color 0.2s",
                    opacity: feedback !== null ? 0.7 : 1,
                  }}
                />
                <button
                  onClick={() => submit()}
                  disabled={feedback !== null || !input.trim()}
                  aria-label="Submit answer"
                  style={{
                    width: 56,
                    borderRadius: 14,
                    border: "none",
                    color: "#fff",
                    fontSize: 22,
                    cursor: feedback !== null || !input.trim() ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    transition: "background 0.2s",
                    background:
                      feedback === "correct"
                        ? "#22c55e"
                        : feedback === "wrong"
                          ? "#ef4444"
                          : selectedOp.color,
                  }}
                >
                  {feedback === "correct" ? "✓" : feedback === "wrong" ? "✗" : "↵"}
                </button>
              </div>
              <Numpad onKey={handleNumpad} disabled={feedback !== null} />
            </>
          )}

          <p
            style={{ textAlign: "center", fontSize: 12, color: T.sub, margin: "0 0 16px" }}
            role="status"
          >
            {feedback === "correct"
              ? "✓ Correct! Next up…"
              : feedback === "wrong"
                ? "Study the answer, then move on"
                : ansType === ANSWER_TYPE.MCQ
                  ? "Tap the correct answer"
                  : "Press Enter or tap ↵"}
          </p>

          <button
            style={{
              display: "block",
              margin: "0 auto",
              background: "none",
              border: "none",
              color: "#cbd5e1",
              cursor: "pointer",
              fontSize: 12,
              textDecoration: "underline",
            }}
            onClick={() => doEnd()}
          >
            End Session
          </button>
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RESULT SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function ResultScreen({ config, result, onRestart, onSettings }) {
  const T = useTheme();
  const { opId, classNum, modeId } = config;
  const selectedOp = OPS.find((o) => o.id === opId);
  const selectedMode = MODES.find((m) => m.id === modeId);

  const { score, total, bestStreak, elapsed, history } = result;
  const acc = total > 0 ? Math.round((score / total) * 100) : 0;
  const medal = acc >= 90 ? "🥇" : acc >= 70 ? "🥈" : acc >= 50 ? "🥉" : "💪";
  const msg =
    acc >= 90
      ? "Outstanding!"
      : acc >= 70
        ? "Great job!"
        : acc >= 50
          ? "Good effort!"
          : "Keep going!";
  const qps = elapsed > 0 ? (score / elapsed).toFixed(1) : "—";

  const [confetti, setConfetti] = useState(false);
  const [highScore, setHighScore] = useState(null);
  const [newRecord, setNewRecord] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    const saved = saveHighScore(opId, classNum, modeId, { score, acc, streak: bestStreak });
    setHighScore(saved);
    const isNew = score > 0 && (score >= saved.score || acc >= saved.acc || bestStreak >= saved.streak);
    setNewRecord(isNew);
    if (acc >= 80) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3500);
    }

    // Save session
    saveSession({
      date: new Date().toISOString(),
      opId,
      classNum,
      modeId,
      score,
      total,
      acc,
      bestStreak,
      elapsed,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wrongOnes = history.filter((h) => !h.correct);

  return (
    <>
      <Confetti active={confetti} />

      {newRecord && (
        <div
          style={{
            background: "linear-gradient(90deg,#f59e0b,#ef4444)",
            color: "#fff",
            borderRadius: 12,
            padding: "8px 16px",
            marginBottom: 16,
            fontWeight: 800,
            fontSize: 13,
            animation: "slideDown 0.4s ease",
            textAlign: "center",
          }}
        >
          🎉 New Personal Record!
        </div>
      )}

      {/* Accuracy ring */}
      <AccuracyRing percent={acc} color={acc >= 70 ? "#22c55e" : acc >= 50 ? "#f59e0b" : "#ef4444"} />

      <div style={{ fontSize: 48, textAlign: "center", marginBottom: 4 }}>{medal}</div>
      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: T.text,
          margin: "0 0 4px",
          textAlign: "center",
        }}
      >
        {msg}
      </h2>
      <p style={{ color: T.sub, fontSize: 13, marginBottom: 24, textAlign: "center" }}>
        {selectedOp.label} · {DIFFICULTY[classNum].label} · {selectedMode?.label}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <BIG label="Score" value={`${score}/${total}`} color={selectedOp.color} />
        <BIG label="Accuracy" value={`${acc}%`} color={acc >= 70 ? "#22c55e" : "#f59e0b"} />
        <BIG label="Best Streak" value={`${bestStreak}🔥`} color="#f59e0b" />
        <BIG label="Speed" value={`${qps}/s`} color="#3b82f6" />
      </div>

      {/* Accuracy bar */}
      <div
        style={{
          height: 8,
          background: T.accTrack,
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            width: `${acc}%`,
            background: selectedOp.color,
            transition: "width 1.2s cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: T.sub, marginBottom: 16, textAlign: "center" }}>
        {score} correct · {total - score} wrong · {elapsed}s
      </p>

      {/* High score */}
      {highScore && highScore.score > 0 && (
        <div
          style={{
            background: T.statBg,
            borderRadius: 14,
            padding: "10px 16px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>🏆 All-time Best</span>
          <span style={{ fontSize: 12, color: selectedOp.color, fontWeight: 800 }}>
            Score {highScore.score} · {highScore.acc}% · Streak {highScore.streak}🔥
          </span>
        </div>
      )}

      {/* Wrong answers review */}
      {wrongOnes.length > 0 && (
        <div
          style={{
            background: "#fef2f2",
            borderRadius: 14,
            padding: "10px 14px",
            marginBottom: 14,
            textAlign: "left",
            border: "1px solid #fecaca",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#ef4444",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            ❌ Review Mistakes ({wrongOnes.length})
          </p>
          {wrongOnes.slice(0, showAllHistory ? undefined : 5).map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                borderBottom: i < wrongOnes.length - 1 ? "1px solid #fecaca" : "none",
              }}
            >
              <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
                {h.question} = {h.answer}
              </span>
              <span style={{ fontSize: 13, color: "#dc2626" }}>You: {h.yourAnswer}</span>
            </div>
          ))}
          {wrongOnes.length > 5 && (
            <button
              onClick={() => setShowAllHistory((s) => !s)}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {showAllHistory ? "Show less" : `Show all ${wrongOnes.length} mistakes`}
            </button>
          )}
        </div>
      )}

      {/* Full history */}
      {history.length > 0 && (
        <div
          style={{
            background: T.statBg,
            borderRadius: 14,
            padding: "10px 14px",
            marginBottom: 20,
            textAlign: "left",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.sub,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            All Answers
          </p>
          {[...history].reverse().map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 0",
                borderBottom: i < history.length - 1 ? `1px solid ${T.border}` : "none",
              }}
            >
              <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
                {h.question} = {h.answer}
              </span>
              <span style={{ fontSize: 13 }}>{h.correct ? "✅" : `❌ ${h.yourAnswer}`}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          style={{
            flex: 1,
            padding: "15px",
            borderRadius: 16,
            border: "none",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
            background: `linear-gradient(135deg, ${selectedOp.color} 0%, ${selectedOp.dark} 100%)`,
            boxShadow: `0 4px 20px ${selectedOp.color}44`,
          }}
          onClick={onRestart}
        >
          Play Again
        </button>
        <button
          style={{
            flex: 1,
            padding: "15px",
            borderRadius: 16,
            border: "none",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
            background: "#334155",
          }}
          onClick={onSettings}
        >
          Settings
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function MentalMaths() {
  const [screen, setScreen] = useState(SCREENS.SETUP);
  const [animIn, setAnimIn] = useState(true);
  const [result, setResult] = useState(null);

  const [config, setConfig] = useState({
    classNum: 6,
    opId: "mix",
    modeId: "challenge",
    qCount: 10,
    speedTime: 60,
    ansType: ANSWER_TYPE.TEXT,
    soundOn: true,
    darkMode: false,
  });

  const theme = useMemo(() => getTheme(config.darkMode), [config.darkMode]);

  // Dark mode body sync
  useEffect(() => {
    document.body.style.background = config.darkMode ? "#0f172a" : "";
    return () => {
      document.body.style.background = "";
    };
  }, [config.darkMode]);

  const goTo = useCallback((s) => {
    setAnimIn(false);
    setTimeout(() => {
      setScreen(s);
      setAnimIn(true);
    }, TIMINGS.animationMs);
  }, []);

  const handleStart = useCallback(() => {
    setResult(null);
    goTo(SCREENS.PLAYING);
  }, [goTo]);

  const handleEnd = useCallback(
    (res) => {
      setResult(res);
      goTo(SCREENS.RESULT);
    },
    [goTo]
  );

  const handleRestart = useCallback(() => {
    setResult(null);
    goTo(SCREENS.PLAYING);
  }, [goTo]);

  const handleSettings = useCallback(() => {
    goTo(SCREENS.SETUP);
  }, [goTo]);

  return (
    <ThemeContext.Provider value={theme}>
      <PageWrapper animIn={animIn}>
        {screen === SCREENS.SETUP && (
          <SetupScreen config={config} setConfig={setConfig} onStart={handleStart} />
        )}
        {screen === SCREENS.PLAYING && (
          <PlayingScreen key={Date.now()} config={config} onEnd={handleEnd} />
        )}
        {screen === SCREENS.RESULT && result && (
          <ResultScreen
            config={config}
            result={result}
            onRestart={handleRestart}
            onSettings={handleSettings}
          />
        )}
      </PageWrapper>
    </ThemeContext.Provider>
  );
}

// ─── Global CSS ────────────────────────────────────────────────────────────────
const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
.bounce-hover:hover { filter: brightness(1.08) !important; transform: translateY(-1px); }
@keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.05)} 100%{transform:scale(1)} }
@keyframes shake { 0%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} 100%{transform:translateX(0)} }
@keyframes slideDown { from{opacity:0;transform:translate(-50%,-16px)} to{opacity:1;transform:translate(-50%,0)} }
@keyframes confettiFall { 0%{opacity:1;transform:translateY(-20px) rotate(0deg)} 100%{opacity:0;transform:translateY(100vh) rotate(720deg)} }
`;