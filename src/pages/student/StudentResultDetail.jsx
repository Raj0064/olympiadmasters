import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getFullExam } from "../../services/exam.service";
import { fetchSubmission } from "../../services/submission.service";
import { MdLeaderboard } from "react-icons/md";
import { HiOutlineArrowLeft } from "react-icons/hi2";


// ✅ Add this import at the top of StudentPerformance.jsx
import {
  safeNum,
  safeDivide,
  formatTime,
} from '../../utils/safeHelpers';

// ── Helpers ───────────────────────────────────────────────

function getPerformance(pct) {
  const p = safeNum(pct);
  if (p >= 90) return {
    emoji: "🏆", label: "Excellent!",
    scoreClass: "text-success", bgClass: "bg-success-bg", borderClass: "border-success/20",
  };
  if (p >= 75) return {
    emoji: "🌟", label: "Great Job!",
    scoreClass: "text-info", bgClass: "bg-info-bg", borderClass: "border-info/20",
  };
  if (p >= 50) return {
    emoji: "💪", label: "Good Effort!",
    scoreClass: "text-warning", bgClass: "bg-warning-bg", borderClass: "border-warning/20",
  };
  return {
    emoji: "📚", label: "Keep Practicing!",
    scoreClass: "text-danger", bgClass: "bg-danger-bg", borderClass: "border-danger/20",
  };
}

function scoreColor(pct) {
  const p = safeNum(pct);
  if (p >= 75) return {
    text: "text-success", bg: "bg-success-bg",
    border: "border-success/15", svg: "var(--color-success)",
  };
  if (p >= 50) return {
    text: "text-warning", bg: "bg-warning-bg",
    border: "border-warning/15", svg: "var(--color-warning)",
  };
  return {
    text: "text-danger", bg: "bg-danger-bg",
    border: "border-danger/15", svg: "var(--color-danger)",
  };
}

// ── Score Ring ────────────────────────────────────────────

function ScoreRing({ percentage, score, total }) {
  // Safe clamp 0-100
  const pct = Math.min(Math.max(safeNum(percentage), 0), 100);
  const safeScore = safeNum(score);
  const safeTotal = safeNum(total);

  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const c = scoreColor(pct);

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80" cy="80" r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="12"
        />
        <circle
          cx="80" cy="80" r={r}
          fill="none"
          stroke={c.svg}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Show marks prominently */}
        <span className={`text-2xl font-black tabular-nums ${c.text}`}>
          {safeScore}/{safeTotal}
        </span>
        <span className="text-xs text-text-faint font-medium mt-0.5">
          marks
        </span>
        <span className={`text-lg font-bold tabular-nums mt-1 ${c.text}`}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

// ── Answer Grid ───────────────────────────────────────────

function AnswerGrid({ questions, answers, onJump }) {
  if (!questions?.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => {
        if (!q?.id) return null;

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
            onClick={() => onJump?.(q.id)}
            disabled={!onJump}
            title={`Q${i + 1} · ${skipped ? "Skipped" : correct ? "Correct" : "Wrong"}`}
            className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all duration-150 ${onJump ? "hover:scale-110 cursor-pointer" : "cursor-default"
              } ${cls}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

// ── Filter Tabs ───────────────────────────────────────────

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
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
            active === key
              ? activeClass
              : "bg-surface border border-border text-text-muted hover:border-border-strong hover:text-text-dark",
          ].join(" ")}
        >
          {label}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${active === key
              ? "bg-white/25 text-inherit"
              : "bg-background text-text-faint"
            }`}>
            {safeNum(counts?.[key])}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────

function SectionCard({ name, correct, total, marks, totalMarks }) {
  const safeMarks = safeNum(marks);
  const safeTotalMarks = safeNum(totalMarks);
  const safeCorrect = safeNum(correct);
  const safeTotal = safeNum(total);

  const pct = safeNum(
    Math.round(safeDivide(safeMarks, safeTotalMarks) * 100)
  );
  const c = scoreColor(pct);

  return (
    <div className={`bg-surface border ${c.border} rounded-xl p-4 `}>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-text-dark truncate pr-2">
          {name || "Section"}
        </p>
        <span className={`text-xs font-bold ${c.text}`}>
          {safeMarks}/{safeTotalMarks}m
        </span>
      </div>
      <div className="w-full bg-background rounded-full h-1.5 mb-2 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: c.svg,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-faint">
        <span>{safeCorrect}/{safeTotal} correct</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────

function QuestionCard({ question, originalIndex, studentAnswer }) {
  if (!question) return null;

  const isSkipped = !studentAnswer;
  const isCorrect = studentAnswer === question.correctAnswer;

  const status = isSkipped
    ? {
      label: "Skipped", icon: "—",
      text: "text-text-faint", bg: "bg-background",
      border: "border-border", dot: "bg-border-strong",
      shadow: "shadow-sm",
    }
    : isCorrect
      ? {
        label: "Correct", icon: "✓",
        text: "text-success", bg: "bg-success-bg",
        border: "border-success", dot: "bg-success",
        shadow: "shadow-sm shadow-success/10",
      }
      : {
        label: "Wrong", icon: "✗",
        text: "text-danger", bg: "bg-danger-bg",
        border: "border-danger/70", dot: "bg-danger",
        shadow: "shadow-sm shadow-danger/10",
      };

  const options = question.options || {};
  const hasOptions = Object.keys(options).length > 0;
  const marks = safeNum(question.marks, 1);

  return (
    <div className={`bg-surface border border-border rounded-2xl overflow-hidden shadow-md ${status.shadow}`}>

      {/* Header */}
      <div className={`${status.bg} border-b ${status.border} px-4 py-2.5 flex items-center justify-between `}>
        <div className="flex items-center gap-2.5">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${status.dot}`}>
            {status.icon}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-dark">
              Question {originalIndex + 1}
            </span>
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
          {/* Marks earned / total */}
          <span className="text-[10px] text-text-faint font-medium">
            {isCorrect ? marks : 0}/{marks}m
          </span>
        </div>
      </div>

      {/* Body */}
      <div className={`px-4 py-4 space-y-3.5`}>

        {/* Question text */}
        {question.text && (
          <p className="text-sm text-text-dark leading-relaxed font-medium whitespace-pre-wrap wrap-break-word ">
            {question.text}
          </p>
        )}

        {/* Question image */}
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt={`Question ${originalIndex + 1}`}
            className="rounded-xl max-h-52 w-auto object-contain border border-border"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}

        {/* No content fallback */}
        {!question.text && !question.imageUrl && (
          <p className="text-sm text-text-faint italic">
            Question content not available
          </p>
        )}

        {/* Options */}
        {hasOptions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(options).map(([key, val]) => {
              const isStudentPick = studentAnswer === key;
              const isCorrectOption = question.correctAnswer === key;

              let rowCls = "bg-background border-border text-text-muted";
              let labelCls = "border-border-strong text-text-faint bg-transparent";
              let trailIcon = null;

              if (isCorrectOption) {
                rowCls = "bg-success-bg border-success/25 text-success font-medium";
                labelCls = "border-success/30 bg-success/10 text-success";
                trailIcon = (
                  <span className="text-success text-xs font-bold flex-shrink-0 ml-2">✓</span>
                );
              }
              if (isStudentPick && !isCorrect) {
                rowCls = "bg-danger-bg border-danger/25 text-danger font-medium";
                labelCls = "border-danger/30 bg-danger/10 text-danger";
                trailIcon = (
                  <span className="text-danger text-xs font-bold flex-shrink-0 ml-2">✗</span>
                );
              }

              return (
                <div
                  key={key}
                  className={`flex items-center px-3.5 py-2.5 rounded-xl border text-sm ${rowCls}`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${labelCls}`}>
                    {key}
                  </span>
                  <span className="ml-2 flex-1 min-w-0 break-words">
                    {val || "—"}
                  </span>
                  {trailIcon}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-faint italic">
            Options not available
          </p>
        )}

        {/* Wrong answer callout */}
        {!isCorrect && !isSkipped && studentAnswer && (
          <div className="flex items-center gap-2 text-xs text-text-faint px-0.5">
            <span>Your answer:</span>
            <span className="font-bold text-danger">
              ({studentAnswer}){" "}
              {options?.[studentAnswer] || "Unknown option"}
            </span>
          </div>
        )}

        {/* Correct answer for skipped */}
        {isSkipped && question.correctAnswer && (
          <div className="flex items-center gap-2 text-xs text-text-faint px-0.5">
            <span>Correct answer:</span>
            <span className="font-bold text-success">
              ({question.correctAnswer}){" "}
              {options?.[question.correctAnswer] || ""}
            </span>
          </div>
        )}

        {/* Explanation */}
        {!isCorrect && (question.explanation || question.explanationImageUrl) && (
          <div className="bg-info-bg border border-info/20 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">💡</span>
              <p className="text-[10px] font-bold text-info uppercase tracking-widest">
                Explanation
              </p>
            </div>
            {question.explanation && (
              <p className="text-sm text-text-dark leading-relaxed">
                {question.explanation}
              </p>
            )}
            {question.explanationImageUrl && (
              <img
                src={question.explanationImageUrl}
                alt="Explanation"
                className="rounded-lg max-h-40 object-contain mt-2.5 border border-info/20"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Results Page ─────────────────────────────────────

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
    // Guard
    if (!examId || !currentUser?.uid) {
      setError("Missing exam or user information.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [fullExam, sub] = await Promise.all([
          getFullExam(examId),
          fetchSubmission(currentUser.uid, examId),
        ]);

        if (cancelled) return;

        if (!fullExam) {
          setError("Exam not found.");
          return;
        }
        if (!sub) {
          setError("Submission not found.");
          return;
        }

        // Ensure questions array
        if (!Array.isArray(fullExam.questions)) {
          fullExam.questions = [];
        }

        setExam(fullExam);
        setSubmission(sub);
      } catch (err) {
        console.error("Results load error:", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load results.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => { cancelled = true; };
  }, [examId, currentUser?.uid]);

  // ── Loading ──
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

  // ── Error ──
  if (error || !exam || !submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-surface rounded-2xl border border-border p-8 text-center max-w-sm w-full space-y-4">
          <div className="w-12 h-12 bg-danger-bg rounded-full flex items-center justify-center mx-auto">
            <span className="text-xl">⚠️</span>
          </div>
          <p className="text-sm text-text-muted">
            {error || "Could not load results."}
          </p>
          <button
            onClick={() => navigate("/student")}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Compute marks (safe) ──
  const questions = Array.isArray(exam.questions) ? exam.questions : [];

  // Total marks — priority: submission → exam field → sum of question marks
  const totalMarks = safeNum(
    submission.totalMarks ||
    exam.totalMarks ||
    questions.reduce((s, q) => s + safeNum(q?.marks, 1), 0)
  );

  const score = safeNum(submission.score);

  // Percentage — derive from marks, not stored percentage
  const percentage = Math.min(
    safeNum(Math.round(safeDivide(score, totalMarks) * 100)),
    100
  );

  const correctCount = safeNum(submission.correct);
  const wrongCount = safeNum(submission.wrong);
  const skippedCount = safeNum(submission.skipped);
  const timeTaken = safeNum(submission.timeTaken);

  const performance = getPerformance(percentage);

  // Enrich questions with section names
  const enriched = questions
    .filter((q) => q && q.id)
    .map((q) => ({
      ...q,
      sectionName:
        exam.sections?.find((s) => s?.id === q.sectionId)?.name || "",
    }));

  // Section stats
  const sectionStats = (exam.sections || [])
    .filter((s) => s?.id)
    .map((sec) => {
      const qs = enriched.filter((q) => q.sectionId === sec.id);
      let correct = 0, marks = 0, secTotal = 0;
      qs.forEach((q) => {
        const m = safeNum(q.marks, 1);
        secTotal += m;
        if (submission.answers?.[q.id] === q.correctAnswer) {
          correct++;
          marks += m;
        }
      });
      return {
        name: sec.name || "Section",
        correct,
        total: qs.length,
        marks,
        totalMarks: secTotal,
      };
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

  // Filtered questions
  const filtered = enriched.filter((q) => {
    const a = submission.answers?.[q.id];
    if (filter === "skipped") return !a;
    if (filter === "correct") return a && a === q.correctAnswer;
    if (filter === "wrong") return a && a !== q.correctAnswer;
    return true;
  });

  // Jump to question
  function jumpTo(qId) {
    setFilter("all");
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      questionRefs.current?.[qId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  }

  const resultsPublished = !!exam.isResultPublished;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky Header ── */}
      <div className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background transition-colors cursor-pointer shrink-0"
            title="Back to Dashboard"
          >
            <HiOutlineArrowLeft className="w-4 h-4 text-text-muted" />
          </button>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-text-dark truncate">
              {exam.title || "Exam Results"}
            </h1>
            <p className="text-[11px] text-text-faint mt-0.5">
              {score}/{totalMarks} marks · {percentage}%
            </p>
          </div>

          {/* Leaderboard — only if published + batchId */}
          {resultsPublished && exam.batchId && (
            <button
              onClick={() =>
                navigate(
                  `/leaderboard?type=exam&examId=${examId}&batchId=${exam.batchId}`
                )
              }
              title="View Leaderboard"
              className="flex items-center justify-center border border-border text-text-muted hover:text-text-dark hover:border-border-strong px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <MdLeaderboard className="text-base" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-10">

        {/* ── Score Card ── */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">

          {/* Performance banner */}
          <div className={`${performance.bgClass} border-b ${performance.borderClass} px-5 py-3 flex items-center justify-center gap-2`}>
            <span className="text-lg">{performance.emoji}</span>
            <span className={`text-sm font-bold ${performance.scoreClass}`}>
              {performance.label}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">

            {/* Ring — shows marks prominently */}
            <ScoreRing
              percentage={percentage}
              score={score}
              total={totalMarks}
            />

            {/* Correct / Wrong / Skipped */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  val: correctCount,
                  label: "Correct",
                  cls: "bg-success-bg border-success/10 text-success",
                },
                {
                  val: wrongCount,
                  label: "Wrong",
                  cls: "bg-danger-bg border-danger/10 text-danger",
                },
                {
                  val: skippedCount,
                  label: "Skipped",
                  cls: "bg-background border-border text-text-faint",
                },
              ].map(({ val, label, cls }) => (
                <div
                  key={label}
                  className={`text-center p-3 rounded-xl border ${cls}`}
                >
                  <p className="text-2xl font-black tabular-nums">{val}</p>
                  <p className="text-[10px] font-semibold opacity-75 mt-0.5 uppercase tracking-wide">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-border flex-wrap">
              {[
                {
                  icon: "⏱",
                  text: timeTaken > 0 ? formatTime(timeTaken) : "—",
                },
                {
                  icon: "📝",
                  text: `${enriched.length} question${enriched.length !== 1 ? "s" : ""}`,
                },
                {
                  icon: "🎯",
                  text: `${totalMarks} mark${totalMarks !== 1 ? "s" : ""}`,
                },
              ].map(({ icon, text }, i, arr) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-text-faint">
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px h-3 bg-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Answer Grid ── */}
        {enriched.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
              <p className="text-xs font-bold text-text-faint uppercase tracking-widest">
                Answer Overview
              </p>
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
              answers={submission.answers || {}}
              onJump={resultsPublished ? jumpTo : undefined}
            />
            {!resultsPublished && (
              <p className="text-[10px] text-text-faint mt-3">
                Detailed review available after teacher publishes results.
              </p>
            )}
          </div>
        )}

        {/* ── Section Breakdown ── */}
        {sectionStats.length > 1 && (
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-4 sm:p-5">
            <p className="text-xs font-bold text-text-faint uppercase tracking-widest mb-3.5">
              Section Breakdown
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sectionStats.map((s, i) => (
                <SectionCard key={i} {...s} />
              ))}
            </div>
          </div>
        )}

        {/* ── Question Review ── */}
        {!resultsPublished ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-warning-bg rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-sm font-semibold text-text-dark">
              Review Not Available Yet
            </p>
            <p className="text-xs text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">
              Your teacher will publish the detailed answer review soon.
              Check back later.
            </p>
          </div>
        ) : enriched.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-text-muted">
              No questions available for review.
            </p>
          </div>
        ) : (
          <div className="space-y-3" ref={reviewRef}>
            {/* Filter header */}
            <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
              <p className="text-xs font-bold text-text-faint uppercase tracking-widest">
                Question Review
              </p>
              <FilterTabs
                active={filter}
                onChange={setFilter}
                counts={counts}
              />
            </div>

            {/* Empty filter state */}
            {filtered.length === 0 && (
              <div className="bg-surface border border-border rounded-2xl p-10 text-center">
                <p className="text-sm text-text-muted">
                  No {filter === "all" ? "" : filter} questions to show.
                </p>
              </div>
            )}

            {/* Question cards */}
            {filtered.map((q) => (
              <div
                key={q.id}
                ref={(el) => {
                  if (el) questionRefs.current[q.id] = el;
                }}
              >
                <QuestionCard
                  question={q}
                  originalIndex={enriched.indexOf(q)}
                  studentAnswer={submission.answers?.[q.id]}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Back Button ── */}
        <button
          onClick={() => navigate("/student")}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}