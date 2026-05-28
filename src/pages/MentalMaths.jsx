import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ────────────────────────────────────────────────────────────────────
const DIFFICULTY = {
  4: { range: [2, 30], tableRange: [2, 10] },
  5: { range: [5, 50], tableRange: [2, 12] },
  6: { range: [10, 100], tableRange: [2, 15] },
  7: { range: [20, 200], tableRange: [2, 20] },
  8: { range: [50, 500], tableRange: [3, 25] },
};

const OPS = [
  { id: "add", symbol: "+", label: "Addition", color: "#22c55e", bg: "#f0fdf4" },
  { id: "sub", symbol: "−", label: "Subtraction", color: "#3b82f6", bg: "#eff6ff" },
  { id: "mul", symbol: "×", label: "Multiply", color: "#f59e0b", bg: "#fffbeb" },
  { id: "div", symbol: "÷", label: "Division", color: "#a855f7", bg: "#faf5ff" },
  { id: "mix", symbol: "⚡", label: "Mixed", color: "#ef4444", bg: "#fef2f2" },
];

const MODES = [
  { id: "practice", icon: "🧘", label: "Practice", desc: "No timer", time: null, qLimit: null },
  { id: "speed", icon: "⚡", label: "Speed", desc: "60 seconds", time: 60, qLimit: null },
  { id: "challenge", icon: "🎯", label: "Challenge", desc: "10 questions", time: null, qLimit: 10 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function makeQuestion(opId, classNum) {
  const { range: [rMin, rMax], tableRange: [tMin, tMax] } = DIFFICULTY[classNum];
  const op = opId === "mix" ? ["add", "sub", "mul", "div"][rand(0, 3)] : opId;
  let a, b, answer, question;

  if (op === "add") {
    a = rand(rMin, rMax); b = rand(rMin, rMax);
    answer = a + b; question = `${a} + ${b}`;
  } else if (op === "sub") {
    a = rand(rMin, rMax); b = rand(rMin, a);
    answer = a - b; question = `${a} − ${b}`;
  } else if (op === "mul") {
    a = rand(tMin, tMax); b = rand(tMin, tMax);
    answer = a * b; question = `${a} × ${b}`;
  } else {
    b = rand(tMin, tMax); answer = rand(tMin, tMax);
    a = b * answer;
    question = `${a} ÷ ${b}`;
  }
  return { question, answer };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function MentalMaths() {
  const [screen, setScreen] = useState("setup");  // setup | playing | result
  const [classNum, setClassNum] = useState(6);
  const [opId, setOpId] = useState("mix");
  const [modeId, setModeId] = useState("challenge");
  const [animIn, setAnimIn] = useState(false);

  const [current, setCurrent] = useState(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);  // null | "correct" | "wrong"
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [shake, setShake] = useState(false);
  const [pulse, setPulse] = useState(false);

  const inputRef = useRef(null);
  const startRef = useRef(null);
  const fbTimeout = useRef(null);

  const selectedOp = OPS.find(o => o.id === opId);
  const selectedMode = MODES.find(m => m.id === modeId);

  // ─── Navigate screens with animation ──────────────────────────────────────
  const goTo = (s) => { setAnimIn(false); setTimeout(() => { setScreen(s); setAnimIn(true); }, 120); };

  useEffect(() => { setAnimIn(true); }, []);

  // ─── Start ─────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    setScore(0); setTotal(0); setStreak(0); setBestStreak(0);
    setInput(""); setFeedback(null); setElapsed(0);
    setTimeLeft(selectedMode.time || 60);
    startRef.current = Date.now();
    setCurrent(makeQuestion(opId, classNum));
    goTo("playing");
  }, [opId, classNum, selectedMode]);

  // ─── End ───────────────────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    clearTimeout(fbTimeout.current);
    setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000));
    goTo("result");
  }, []);

  // ─── Timers ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return;
    if (selectedMode.time) {
      if (timeLeft <= 0) { endGame(); return; }
      const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(id);
    } else {
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000));
      }, 500);
      return () => clearInterval(id);
    }
  }, [screen, timeLeft, selectedMode, endGame]);

  // ─── Focus input ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen === "playing" && !feedback) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [screen, current, feedback]);

  // ─── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback(() => {
    if (feedback !== null || !current) return;
    const val = parseInt(input.trim(), 10);
    if (isNaN(val)) { setShake(true); setTimeout(() => setShake(false), 400); return; }

    const isCorrect = val === current.answer;
    const newTotal = total + 1;
    const newScore = isCorrect ? score + 1 : score;
    const newStreak = isCorrect ? streak + 1 : 0;
    const newBest = Math.max(bestStreak, newStreak);

    setTotal(newTotal); setScore(newScore);
    setStreak(newStreak); setBestStreak(newBest);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setPulse(true);

    fbTimeout.current = setTimeout(() => {
      setPulse(false);
      if (selectedMode.qLimit && newTotal >= selectedMode.qLimit) { endGame(); return; }
      setInput(""); setFeedback(null);
      setCurrent(makeQuestion(opId, classNum));
    }, isCorrect ? 480 : 1400);
  }, [feedback, current, input, total, score, streak, bestStreak, opId, classNum, selectedMode, endGame]);

  useEffect(() => () => clearTimeout(fbTimeout.current), []);

  // ──────────────────────────────────────────────────────────────────────────
  // SETUP SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "setup") return (
    <div style={S.page}>
      <style>{css}</style>
      <div style={{ ...S.card, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(16px)", transition: "all 0.35s cubic-bezier(.22,1,.36,1)" }}>
        <div style={S.hero}>
          <div style={S.heroIcon}>🧮</div>
          <h1 style={S.heroTitle}>Mental Maths</h1>
          <p style={S.heroSub}>Train fast. Think faster.</p>
        </div>

        <Label>Class</Label>
        <div style={S.pillRow}>
          {[4, 5, 6, 7, 8].map(c => (
            <button key={c} style={{ ...S.pill, ...(classNum === c ? { ...S.pillOn, background: selectedOp.color, borderColor: selectedOp.color } : {}) }}
              onClick={() => setClassNum(c)}>Class {c}</button>
          ))}
        </div>

        <Label>Operation</Label>
        <div style={S.opGrid}>
          {OPS.map(op => (
            <button key={op.id}
              style={{ ...S.opTile, background: opId === op.id ? op.color : op.bg, color: opId === op.id ? "#fff" : "#334155", borderColor: opId === op.id ? op.color : "transparent", transform: opId === op.id ? "scale(1.05)" : "scale(1)" }}
              onClick={() => setOpId(op.id)}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{op.symbol}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>{op.label}</span>
            </button>
          ))}
        </div>

        <Label>Mode</Label>
        <div style={S.modeRow}>
          {MODES.map(m => (
            <button key={m.id}
              style={{ ...S.modeTile, ...(modeId === m.id ? { background: "#0f172a", borderColor: "#0f172a", color: "#fff" } : {}) }}
              onClick={() => setModeId(m.id)}>
              <span style={{ fontSize: 26 }}>{m.icon}</span>
              <strong style={{ fontSize: 13 }}>{m.label}</strong>
              <span style={{ fontSize: 11, opacity: 0.6 }}>{m.desc}</span>
            </button>
          ))}
        </div>

        <button style={{ ...S.startBtn, background: selectedOp.color }} onClick={startGame} className="bounce-hover">
          Start Practice →
        </button>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PLAYING SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "playing") {
    const pct = selectedMode.time ? (timeLeft / selectedMode.time) * 100
      : selectedMode.qLimit ? (total / selectedMode.qLimit) * 100 : null;
    const urgent = selectedMode.time && timeLeft <= 10;

    return (
      <div style={S.page}>
        <style>{css}</style>
        <div style={{ ...S.card, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(16px)", transition: "all 0.35s cubic-bezier(.22,1,.36,1)" }}>

          {/* Progress bar */}
          {pct !== null && (
            <div style={S.progressTrack}>
              <div style={{ ...S.progressFill, width: `${pct}%`, background: urgent ? "#ef4444" : selectedOp.color, transition: "width 0.8s linear" }} />
            </div>
          )}

          {/* Stats row */}
          <div style={S.statsRow}>
            <Stat label="Score" value={score} color={selectedOp.color} />
            {selectedMode.time
              ? <Stat label={urgent ? "⚠️ Hurry!" : "Time"} value={`${timeLeft}s`} color={urgent ? "#ef4444" : "#64748b"} big />
              : <Stat label="Time" value={`${elapsed}s`} color="#64748b" />
            }
            {selectedMode.qLimit
              ? <Stat label="Left" value={`${total}/${selectedMode.qLimit}`} color="#64748b" />
              : <Stat label="Total" value={total} color="#64748b" />
            }
            <Stat label="Streak" value={streak >= 3 ? `${streak}🔥` : streak} color={streak >= 5 ? "#f59e0b" : "#64748b"} />
          </div>

          {/* Question box */}
          <div style={{
            ...S.qBox,
            borderColor: feedback === "correct" ? "#22c55e" : feedback === "wrong" ? "#ef4444" : "#e2e8f0",
            background: feedback === "correct" ? "#f0fdf4" : feedback === "wrong" ? "#fef2f2" : "#f8fafc",
            animation: pulse ? "pop 0.35s ease" : shake ? "shake 0.35s ease" : "none",
          }}>
            <div style={S.qText}>{current?.question} = ?</div>
            {feedback === "wrong" && (
              <div style={S.hint}>✓ Answer is <strong>{current?.answer}</strong></div>
            )}
          </div>

          {/* Input row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              disabled={feedback !== null}
              placeholder="Your answer…"
              style={{
                ...S.input,
                borderColor: feedback === "correct" ? "#22c55e" : feedback === "wrong" ? "#ef4444" : selectedOp.color,
                opacity: feedback !== null ? 0.7 : 1,
              }}
            />
            <button
              onClick={submit}
              disabled={feedback !== null || !input.trim()}
              style={{ ...S.enterBtn, background: feedback === "correct" ? "#22c55e" : feedback === "wrong" ? "#ef4444" : selectedOp.color }}>
              {feedback === "correct" ? "✓" : feedback === "wrong" ? "✗" : "↵"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", margin: "0 0 20px" }}>
            {feedback === "correct" ? "✓ Correct! Next up…"
              : feedback === "wrong" ? "Study the answer, then move on"
                : "Press Enter or tap ↵"}
          </p>

          <button style={S.quitBtn} onClick={endGame}>End Session</button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RESULT SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  const acc = total > 0 ? Math.round((score / total) * 100) : 0;
  const medal = acc >= 90 ? "🥇" : acc >= 70 ? "🥈" : acc >= 50 ? "🥉" : "💪";
  const msg = acc >= 90 ? "Outstanding!" : acc >= 70 ? "Great job!" : acc >= 50 ? "Good effort!" : "Keep going!";
  const qps = elapsed > 0 ? (score / elapsed).toFixed(1) : "—";

  return (
    <div style={S.page}>
      <style>{css}</style>
      <div style={{ ...S.card, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(16px)", transition: "all 0.35s cubic-bezier(.22,1,.36,1)", textAlign: "center" }}>

        <div style={{ fontSize: 64, marginBottom: 4 }}>{medal}</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>{msg}</h2>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 28 }}>
          {selectedOp.label === "Mixed" ? "Mixed" : selectedOp.label} · Class {classNum} · {selectedMode.label}
        </p>

        <div style={S.statsGrid}>
          <BigStat label="Score" value={`${score}/${total}`} color={selectedOp.color} />
          <BigStat label="Accuracy" value={`${acc}%`} color={acc >= 70 ? "#22c55e" : "#f59e0b"} />
          <BigStat label="Best Streak" value={`${bestStreak}🔥`} color="#f59e0b" />
          <BigStat label="Speed" value={`${qps}/s`} color="#3b82f6" />
        </div>

        {/* Accuracy bar */}
        <div style={S.accTrack}>
          <div style={{ ...S.accFill, width: `${acc}%`, background: selectedOp.color }} />
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 28 }}>
          {score} correct · {total - score} wrong · {elapsed}s total
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...S.startBtn, flex: 1, background: selectedOp.color }} onClick={startGame}>
            Play Again
          </button>
          <button style={{ ...S.startBtn, flex: 1, background: "#334155" }} onClick={() => goTo("setup")}>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small components ──────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>{children}</p>
);
const Stat = ({ label, value, color, big }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
    <span style={{ fontSize: big ? 20 : 20, fontWeight: 800, color: color || "#0f172a" }}>{value}</span>
    <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{label}</span>
  </div>
);
const BigStat = ({ label, value, color }) => (
  <div style={{ background: "#f8fafc", borderRadius: 14, padding: "16px 8px" }}>
    <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{label}</div>
  </div>
);

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", background: "linear-gradient(145deg, #eef2ff 0%, #fdf4ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "'DM Sans', 'Nunito', sans-serif" },
  card: { background: "#fff", borderRadius: 28, padding: "28px 24px", width: "100%", maxWidth: 460, boxShadow: "0 24px 80px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.04)" },
  hero: { textAlign: "center", marginBottom: 28 },
  heroIcon: { fontSize: 52, marginBottom: 6 },
  heroTitle: { fontSize: 30, fontWeight: 900, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.03em" },
  heroSub: { fontSize: 14, color: "#94a3b8", margin: 0 },
  pillRow: { display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" },
  pill: { padding: "8px 14px", borderRadius: 999, border: "2px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#475569", transition: "all 0.18s" },
  pillOn: { color: "#fff" },
  opGrid: { display: "flex", gap: 8, marginBottom: 22 },
  opTile: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 4px", borderRadius: 14, border: "2px solid transparent", cursor: "pointer", fontWeight: 700, transition: "all 0.18s" },
  modeRow: { display: "flex", gap: 8, marginBottom: 24 },
  modeTile: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "12px 6px", borderRadius: 14, border: "2px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", color: "#334155", transition: "all 0.18s" },
  startBtn: { width: "100%", padding: "15px", borderRadius: 16, border: "none", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: "0.01em", transition: "filter 0.15s", filter: "brightness(1)" },
  // Playing
  progressTrack: { height: 5, background: "#f1f5f9", borderRadius: 999, marginBottom: 20, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  statsRow: { display: "flex", padding: "12px 0", borderRadius: 14, background: "#f8fafc", marginBottom: 20 },
  qBox: { border: "2px solid", borderRadius: 22, padding: "36px 24px", textAlign: "center", marginBottom: 18, transition: "background 0.3s, border-color 0.3s" },
  qText: { fontSize: 44, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", fontFamily: "'Georgia', 'DM Serif Display', serif" },
  hint: { marginTop: 10, fontSize: 16, color: "#ef4444", fontWeight: 600 },
  input: { flex: 1, padding: "14px 18px", borderRadius: 14, border: "2px solid", fontSize: 22, fontWeight: 800, textAlign: "center", outline: "none", color: "#0f172a", fontFamily: "inherit", transition: "border-color 0.2s" },
  enterBtn: { width: 56, borderRadius: 14, border: "none", color: "#fff", fontSize: 22, cursor: "pointer", fontWeight: 800, transition: "background 0.2s" },
  quitBtn: { display: "block", margin: "0 auto", background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 12, textDecoration: "underline" },
  // Result
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  accTrack: { height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", marginBottom: 8 },
  accFill: { height: "100%", borderRadius: 999, transition: "width 1.2s cubic-bezier(.22,1,.36,1)" },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
.bounce-hover:hover { filter: brightness(1.08) !important; transform: translateY(-1px); }
@keyframes pop   { 0%{transform:scale(1)} 40%{transform:scale(1.04)} 100%{transform:scale(1)} }
@keyframes shake { 0%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} 100%{transform:translateX(0)} }
`;