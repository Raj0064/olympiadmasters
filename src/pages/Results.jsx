import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFullExam } from "../services/exam.service";
import { fetchSubmission } from "../services/submission.service";
import { MdLeaderboard } from "react-icons/md";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function getPerformance(pct) {
  if (pct >= 90) return { emoji: "🏆", label: "Excellent!", scoreClass: "text-success", bgClass: "bg-success-bg", borderClass: "border-success/20" };
  if (pct >= 75) return { emoji: "🌟", label: "Great Job!", scoreClass: "text-info", bgClass: "bg-info-bg", borderClass: "border-info/20" };
  if (pct >= 50) return { emoji: "💪", label: "Good Effort!", scoreClass: "text-warning", bgClass: "bg-warning-bg", borderClass: "border-warning/20" };
  return { emoji: "📚", label: "Keep Practicing!", scoreClass: "text-danger", bgClass: "bg-danger-bg", borderClass: "border-danger/20" };
}

function scoreColor(pct) {
  if (pct >= 75) return { text: "text-success", bg: "bg-success-bg", border: "border-success/15", svg: "var(--color-success)" };
  if (pct >= 50) return { text: "text-warning", bg: "bg-warning-bg", border: "border-warning/15", svg: "var(--color-warning)" };
  return { text: "text-danger", bg: "bg-danger-bg", border: "border-danger/15", svg: "var(--color-danger)" };
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ percentage, score, total }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const c = scoreColor(percentage);

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-border)" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={r}
          fill="none" stroke={c.svg} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black tabular-nums ${c.text}`}>{percentage}%</span>
        <span className="text-xs text-text-faint font-medium mt-1">{score}/{total} marks</span>
      </div>
    </div>
  );
}

// ─── Answer Grid (NEW) ───────────────────────────────────────────────────────
function AnswerGrid({ questions, answers, onJump }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => {
        const ans = answers?.[q.id];
        const skipped = !ans;
        const correct = ans === q.correctAnswer;

        const cls = skipped
          ? "bg-background border border-border text-text-faint hover:border-border-strong"
          : correct
            ? "bg-success-bg border border-success/25 text-success hover:bg-success/15"
            : "bg-danger-bg border border-danger/25 text-danger hover:bg-danger/15";

        return (
          <button
            key={q.id}
            onClick={() => onJump(q.id)}
            title={`Q${i + 1} · ${skipped ? "Skipped" : correct ? "Correct" : "Wrong"}`}
            className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all duration-150 hover:scale-110 ${cls}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

// ─── Filter Tabs (NEW) ────────────────────────────────────────────────────────
function FilterTabs({ active, onChange, counts }) {
  const tabs = [
    { key: "all", label: "All", activeClass: "bg-text-dark text-surface" },
    { key: "wrong", label: "Wrong", activeClass: "bg-danger text-white" },
    { key: "skipped", label: "Skipped", activeClass: "bg-text-muted text-white" },
    { key: "correct", label: "Correct", activeClass: "bg-success text-white" },
  ];

  return (
    <div className="flex gap-1.5 flex-wrap">
      {tabs.map(({ key, label, activeClass }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
            active === key
              ? activeClass
              : "bg-surface border border-border text-text-muted hover:border-border-strong hover:text-text-dark",
          ].join(" ")}
        >
          {label}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${active === key ? "bg-white/25 text-inherit" : "bg-background text-text-faint"
            }`}>
            {counts[key]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ name, correct, total, marks, totalMarks }) {
  const pct = totalMarks > 0 ? Math.round((marks / totalMarks) * 100) : 0;
  const c = scoreColor(pct);

  return (
    <div className={`bg-surface border ${c.border} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-text-dark truncate pr-2">{name}</p>
        <span className={`text-xs font-bold ${c.text}`}>{pct}%</span>
      </div>
      <div className="w-full bg-background rounded-full h-1.5 mb-2 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: c.svg }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-faint">
        <span>{correct}/{total} correct</span>
        <span>{marks}/{totalMarks} marks</span>
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({ question, originalIndex, studentAnswer }) {
  const isSkipped = !studentAnswer;
  const isCorrect = studentAnswer === question.correctAnswer;

  const status = isSkipped
    ? { label: "Skipped", icon: "—", text: "text-text-faint", bg: "bg-background", border: "border-border", dot: "bg-border-strong" }
    : isCorrect
      ? { label: "Correct", icon: "✓", text: "text-success", bg: "bg-success-bg", border: "border-success/20", dot: "bg-success" }
      : { label: "Wrong", icon: "✗", text: "text-danger", bg: "bg-danger-bg", border: "border-danger/20", dot: "bg-danger" };

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">

      {/* ── Header strip ── */}
      <div className={`${status.bg} border-b ${status.border} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${status.dot}`}>
            {status.icon}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-dark">Q{originalIndex + 1}</span>
            {question.sectionName && (
              <span className="text-[10px] text-text-faint bg-background border border-border rounded-full px-2 py-0.5">
                {question.sectionName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.bg} ${status.border} ${status.text}`}>
            {status.label}
          </span>
          <span className="text-[10px] text-text-faint font-medium">{question.marks || 1}m</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-4 space-y-3.5">

        {/* Question text */}
        {question.text && (
          <p className="text-sm text-text-dark leading-relaxed font-medium">{question.text}</p>
        )}

        {/* Question image */}
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt={`Q${originalIndex + 1}`}
            className="rounded-xl max-h-52 w-auto object-contain border border-border"
          />
        )}

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(question.options).map(([key, val]) => {
            const isStudentPick = studentAnswer === key;
            const isCorrectOption = question.correctAnswer === key;

            let rowCls = "bg-background border-border text-text-muted";
            let labelCls = "border-border-strong text-text-faint bg-transparent";
            let trailIcon = null;

            if (isCorrectOption) {
              rowCls = "bg-success-bg border-success/25 text-success font-medium";
              labelCls = "border-success/30 bg-success/10 text-success";
              trailIcon = <span className="text-success text-xs font-bold flex-shrink-0 ml-2">✓</span>;
            }
            if (isStudentPick && !isCorrect) {
              rowCls = "bg-danger-bg border-danger/25 text-danger font-medium";
              labelCls = "border-danger/30 bg-danger/10 text-danger";
              trailIcon = <span className="text-danger text-xs font-bold flex-shrink-0 ml-2">✗</span>;
            }

            return (
              <div key={key} className={`flex items-center px-3.5 py-2.5 rounded-xl border text-sm ${rowCls}`}>
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${labelCls}`}>
                  {key}
                </span>
                <span className="ml-2 flex-1 truncate">{val}</span>
                {trailIcon}
              </div>
            );
          })}
        </div>

        {/* Wrong answer callout */}
        {!isCorrect && !isSkipped && (
          <div className="flex items-center gap-2 text-xs text-text-faint px-0.5">
            <span>Your answer:</span>
            <span className="font-bold text-danger">
              ({studentAnswer}) {question.options?.[studentAnswer]}
            </span>
          </div>
        )}

        {/* Explanation — only for wrong/skipped */}
        {!isCorrect && (question.explanation || question.explanationImageUrl) && (
          <div className="bg-info-bg border border-info/20 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">💡</span>
              <p className="text-[10px] font-bold text-info uppercase tracking-widest">Explanation</p>
            </div>
            {question.explanation && (
              <p className="text-sm text-text-dark leading-relaxed">{question.explanation}</p>
            )}
            {question.explanationImageUrl && (
              <img
                src={question.explanationImageUrl}
                alt="Explanation"
                className="rounded-lg max-h-40 object-contain mt-2.5 border border-info/20"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Results Page ────────────────────────────────────────────────────────
export default function Results() {
  const { examId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const questionRefs = useRef({});
  const reviewRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [fullExam, sub] = await Promise.all([
          getFullExam(examId),
          fetchSubmission(currentUser.uid, examId),
        ]);
        if (!sub) throw new Error("Submission not found.");
        setExam(fullExam);
        setSubmission(sub);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [examId, currentUser.uid]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-text-faint">Loading results…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !exam || !submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-surface rounded-2xl border border-border p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">⚠️</span>
          </div>
          <p className="text-sm text-text-muted mb-5">{error || "Could not load results."}</p>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Compute ──────────────────────────────────────────────────────────────────
  const totalMarks = submission.totalMarks || exam.totalMarks ||
    exam.questions.reduce((s, q) => s + (q.marks || 1), 0);
  const percentage = totalMarks > 0 ? Math.round((submission.score / totalMarks) * 100) : 0;
  const performance = getPerformance(percentage);

  // Enrich questions with section name
  const enriched = exam.questions.map((q) => ({
    ...q,
    sectionName: exam.sections?.find((s) => s.id === q.sectionId)?.name || "",
  }));

  // Section stats
  const sectionStats = (exam.sections || [])
    .map((sec) => {
      const qs = enriched.filter((q) => q.sectionId === sec.id);
      let correct = 0, marks = 0, secTotal = 0;
      qs.forEach((q) => {
        const m = q.marks || 1;
        secTotal += m;
        if (submission.answers?.[q.id] === q.correctAnswer) { correct++; marks += m; }
      });
      return { name: sec.name, correct, total: qs.length, marks, totalMarks: secTotal };
    })
    .filter((s) => s.total > 0);

  // Filter counts
  const counts = enriched.reduce(
    (acc, q) => {
      const a = submission.answers?.[q.id];
      if (!a) acc.skipped++;
      else if (a === q.correctAnswer) acc.correct++;
      else acc.wrong++;
      acc.all++;
      return acc;
    },
    { all: 0, correct: 0, wrong: 0, skipped: 0 }
  );

  // Filtered list for review
  const filtered = enriched.filter((q) => {
    const a = submission.answers?.[q.id];
    if (filter === "skipped") return !a;
    if (filter === "correct") return a && a === q.correctAnswer;
    if (filter === "wrong") return a && a !== q.correctAnswer;
    return true;
  });

  // Jump from answer grid → question card
  const jumpTo = (qId) => {
    setFilter("all");
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      questionRefs.current[qId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const resultsPublished = exam.isResultPublished;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky Header ─────────────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-text-dark truncate">{exam.title}</h1>
            <p className="text-[11px] text-text-faint mt-0.5">Exam Results</p>
          </div>

          <button
            onClick={() =>
              navigate(
                `/leaderboard?type=exam&examId=${examId}&batchId=${exam.batchId}`
              )
            }
            className="flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <MdLeaderboard className="text-base" />
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs font-semibold text-primary hover:opacity-70 transition flex-shrink-0"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-10">

        {/* ── Score Card ────────────────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">

          {/* Performance banner */}
          <div className={`${performance.bgClass} border-b ${performance.borderClass} px-5 py-3 flex items-center justify-center gap-2`}>
            <span className="text-lg">{performance.emoji}</span>
            <span className={`text-sm font-bold ${performance.scoreClass}`}>{performance.label}</span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">

            {/* Ring */}
            <ScoreRing percentage={percentage} score={submission.score} total={totalMarks} />

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { val: submission.correct, label: "Correct", cls: "bg-success-bg border-success/10 text-success" },
                { val: submission.wrong, label: "Wrong", cls: "bg-danger-bg  border-danger/10  text-danger" },
                { val: submission.skipped, label: "Skipped", cls: "bg-background border-border     text-text-faint" },
              ].map(({ val, label, cls }) => (
                <div key={label} className={`text-center p-3 rounded-xl border ${cls}`}>
                  <p className="text-2xl font-black tabular-nums">{val}</p>
                  <p className="text-[10px] font-semibold opacity-75 mt-0.5 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-border">
              {[
                { icon: "⏱", text: formatTime(submission.timeTaken) },
                { icon: "📝", text: `${exam.questions.length} questions` },
                { icon: "🎯", text: `${totalMarks} marks` },
              ].map(({ icon, text }, i, arr) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-text-faint">
                    <span>{icon}</span><span>{text}</span>
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-3 bg-border" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Answer Grid ───────────────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
            <p className="text-xs font-bold text-text-faint uppercase tracking-widest">Answer Overview</p>
            <div className="flex items-center gap-3 text-[10px] text-text-faint">
              {[
                { color: "bg-success", label: "Correct" },
                { color: "bg-danger", label: "Wrong" },
                { color: "bg-border-strong", label: "Skipped" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <AnswerGrid
            questions={enriched}
            answers={submission.answers}
            onJump={resultsPublished ? jumpTo : undefined}
          />
          {!resultsPublished && (
            <p className="text-[10px] text-text-faint mt-3">Detailed review available after teacher publishes results.</p>
          )}
        </div>

        {/* ── Section Breakdown ─────────────────────────────────────────────────── */}
        {sectionStats.length > 1 && (
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-4 sm:p-5">
            <p className="text-xs font-bold text-text-faint uppercase tracking-widest mb-3.5">Section Breakdown</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sectionStats.map((s, i) => <SectionCard key={i} {...s} />)}
            </div>
          </div>
        )}

        {/* ── Question Review ───────────────────────────────────────────────────── */}
        {!resultsPublished ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-warning-bg rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-sm font-semibold text-text-dark">Review Not Available Yet</p>
            <p className="text-xs text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">
              Your teacher will publish the detailed answer review soon. Check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-3" ref={reviewRef}>

            {/* Filter header */}
            <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
              <p className="text-xs font-bold text-text-faint uppercase tracking-widest">
                Question Review
              </p>
              <FilterTabs active={filter} onChange={setFilter} counts={counts} />
            </div>

            {/* Empty state for filter */}
            {filtered.length === 0 && (
              <div className="bg-surface border border-border rounded-2xl p-10 text-center">
                <p className="text-sm text-text-muted">
                  No {filter === "all" ? "" : filter} questions to show.
                </p>
              </div>
            )}

            {/* Question cards */}
            {filtered.map((q) => (
              <div key={q.id} ref={(el) => (questionRefs.current[q.id] = el)}>
                <QuestionCard
                  question={q}
                  originalIndex={enriched.indexOf(q)}
                  studentAnswer={submission.answers?.[q.id]}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────────────── */}

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition"
        >
          Back to Dashboard
        </button>

      </div>
    </div>
  );
}