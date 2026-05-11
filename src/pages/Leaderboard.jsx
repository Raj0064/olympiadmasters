// pages/Leaderboard.jsx
// Route: /leaderboard?type=exam&examId=xxx&batchId=xxx
//         /leaderboard?type=batch&batchId=xxx

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getExam } from "../services/exam.service";
import { getBatch, getBatches } from "../services/batch.service";
import {
  buildExamLeaderboard,
  buildBatchLeaderboard,
} from "../services/leaderboard.service";

import Button from "../components/ui/Button.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Card from "../components/ui/Card.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// "Aryan Shah" → "Aryan S."  (privacy for students)
function privateName(fullName) {
  if (!fullName) return "Student";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// ─── Medal config (top 3) ─────────────────────────────────────────────────────
const MEDALS = {
  1: {
    emoji: "🥇",
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    podiumH: "h-20",
    label: "1st",
  },
  2: {
    emoji: "🥈",
    bg: "bg-slate-50",
    border: "border-slate-300",
    text: "text-slate-500",
    podiumH: "h-14",
    label: "2nd",
  },
  3: {
    emoji: "🥉",
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-600",
    podiumH: "h-10",
    label: "3rd",
  },
};

function pctColor(pct) {
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 75) return "text-blue-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-500";
}

// ─── Podium ───────────────────────────────────────────────────────────────────
function Podium({ top3, isAdmin, currentUserId }) {
  // Display order: 2nd | 1st | 3rd
  const ordered = [top3[1], top3[0], top3[2]];

  return (
    <div className="flex items-end justify-center gap-4 py-2">
      {ordered.map((entry, idx) => {
        if (!entry) return <div key={idx} className="w-28" />;
        const m = MEDALS[entry.rank];
        const isMe = entry.userId === currentUserId;
        const name = isAdmin
          ? entry.name
          : privateName(entry.name);
        const pct =
          entry.percentage !== undefined
            ? entry.percentage
            : entry.avgPercentage;

        return (
          <div key={entry.userId} className="flex flex-col items-center gap-2">
            {/* Info card */}
            <div
              className={`w-28 rounded-2xl border-2 px-3 py-3 text-center transition-transform ${m.bg} ${m.border} ${isMe ? "ring-2 ring-primary/40 ring-offset-1" : ""
                } ${entry.rank === 1 ? "scale-105" : ""}`}
            >
              <p className="text-2xl leading-none">{m.emoji}</p>
              <p
                className={`mt-1.5 truncate text-xs font-bold ${m.text}`}
                title={name}
              >
                {name}
                {isMe && <span className="ml-1 text-primary">★</span>}
              </p>
              <p className={`mt-1 text-sm font-black tabular-nums ${pctColor(pct)}`}>
                {pct?.toFixed(0)}%
              </p>
            </div>

            {/* Podium block */}
            <div
              className={`w-28 rounded-t-xl border-t-2 border-x-2 ${m.border} ${m.bg} ${m.podiumH} flex items-center justify-center`}
            >
              <span className={`text-base font-black ${m.text}`}>{m.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, valueClass = "text-text-dark" }) {
  return (
    <Card className="flex-1 min-w-[80px] p-4 text-center">
      <p className={`text-xl font-black tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
    </Card>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────
function LeaderboardRow({ entry, isMe, isAdmin, type }) {
  const medal = MEDALS[entry.rank];
  const name = isAdmin ? entry.name : privateName(entry.name);

  const rankCell = medal ? (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-base ${medal.bg} ${medal.border}`}
    >
      {medal.emoji}
    </span>
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xs font-black text-text-faint">
      {entry.rank}
    </span>
  );

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${isMe
          ? "border-2 border-primary/30 bg-primary/5 shadow-sm"
          : "border border-border bg-surface hover:bg-background"
        }`}
    >
      {/* Rank badge */}
      {rankCell}

      {/* Name + secondary info */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${isMe ? "text-primary" : "text-text-dark"
            }`}
        >
          {name}
          {isMe && (
            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary/70">
              You
            </span>
          )}
        </p>

        <p className="mt-0.5 text-[11px] text-text-faint">
          {type === "exam"
            ? formatTime(entry.timeTaken)
            : `${entry.examsAttempted}/${entry.totalExams} exams · avg ${formatTime(entry.avgTimeTaken)}`}
        </p>
      </div>

      {/* Score / % */}
      <div className="shrink-0 text-right">
        {type === "exam" ? (
          <>
            <p
              className={`text-sm font-bold tabular-nums ${isMe ? "text-primary" : "text-text-dark"
                }`}
            >
              {entry.score}/{entry.totalMarks}
            </p>
            <p className={`text-[11px] font-semibold tabular-nums ${pctColor(entry.percentage)}`}>
              {entry.percentage?.toFixed(1)}%
            </p>
          </>
        ) : (
          <>
            <p
              className={`text-sm font-bold tabular-nums ${isMe ? "text-primary" : pctColor(entry.avgPercentage)
                }`}
            >
              {entry.avgPercentage?.toFixed(1)}%
            </p>
            <p className="text-[11px] text-text-faint">avg</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── My Rank Pin ──────────────────────────────────────────────────────────────
function MyRankPin({ entry, total, type }) {
  return (
    <Card className="border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Your rank
          </p>
          <p className="mt-1 text-4xl font-black tabular-nums text-primary">
            #{entry.rank}
            <span className="ml-2 text-sm font-medium text-text-muted">
              of {total}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-5">
          {type === "exam" ? (
            <>
              <div className="text-center">
                <p className="text-xl font-black text-text-dark">
                  {entry.score}/{entry.totalMarks}
                </p>
                <p className="mt-0.5 text-[10px] text-text-faint">score</p>
              </div>
              <div className="w-px self-stretch bg-border" />
              <div className="text-center">
                <p className={`text-xl font-black ${pctColor(entry.percentage)}`}>
                  {entry.percentage?.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-[10px] text-text-faint">percentage</p>
              </div>
              <div className="w-px self-stretch bg-border" />
              <div className="text-center">
                <p className="text-xl font-black text-text-dark">
                  {formatTime(entry.timeTaken)}
                </p>
                <p className="mt-0.5 text-[10px] text-text-faint">time taken</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className={`text-xl font-black ${pctColor(entry.avgPercentage)}`}>
                  {entry.avgPercentage?.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-[10px] text-text-faint">avg score</p>
              </div>
              <div className="w-px self-stretch bg-border" />
              <div className="text-center">
                <p className="text-xl font-black text-text-dark">
                  {entry.examsAttempted}/{entry.totalExams}
                </p>
                <p className="mt-0.5 text-[10px] text-text-faint">exams done</p>
              </div>
              {entry.avgTimeTaken && (
                <>
                  <div className="w-px self-stretch bg-border" />
                  <div className="text-center">
                    <p className="text-xl font-black text-text-dark">
                      {formatTime(entry.avgTimeTaken)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-faint">avg time</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const type = searchParams.get("type");       // "exam" | "batch"
  const examId = searchParams.get("examId");
  const paramBatchId = searchParams.get("batchId");

  const isAdmin = userProfile?.role === "admin";

  // Meta
  const [exam, setExam] = useState(null);
  const [batch, setBatch] = useState(null);
  const [allBatches, setAllBatches] = useState([]);
  const [activeBatchId, setActiveBatchId] = useState(paramBatchId);

  // Leaderboard data
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Load meta (exam title, batch name, admin batch list) ──────────────────
  useEffect(() => {
    async function loadMeta() {
      try {
        const tasks = [getBatch(activeBatchId).then(setBatch)];
        if (type === "exam" && examId) tasks.push(getExam(examId).then(setExam));
        if (isAdmin && type === "batch") tasks.push(getBatches().then(setAllBatches));
        await Promise.all(tasks);
      } catch (err) {
        console.error("Meta load error:", err);
      }
    }
    if (activeBatchId) loadMeta();
  }, [activeBatchId, examId, type, isAdmin]);

  // ── Load leaderboard entries ───────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        let data = [];
        if (type === "exam" && examId) {
          data = await buildExamLeaderboard(examId);
        } else if (type === "batch" && activeBatchId) {
          data = await buildBatchLeaderboard(activeBatchId);
        } else {
          throw new Error("Missing required params.");
        }
        setEntries(data);
      } catch (err) {
        console.error("Leaderboard load error:", err);
        setError("Failed to load leaderboard. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, examId, activeBatchId]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const top3 = entries.filter((e) => e.rank <= 3);
  const myEntry = entries.find((e) => e.userId === currentUser?.uid);

  const stats = (() => {
    if (!entries.length) return null;
    if (type === "exam") {
      const avg = entries.reduce((s, e) => s + e.percentage, 0) / entries.length;
      const passed = entries.filter((e) => e.percentage >= 50).length;
      return {
        students: entries.length,
        avg: `${avg.toFixed(1)}%`,
        highest: `${Math.max(...entries.map((e) => e.percentage)).toFixed(1)}%`,
        passed: `${passed}/${entries.length}`,
      };
    } else {
      const avg =
        entries.reduce((s, e) => s + e.avgPercentage, 0) / entries.length;
      return {
        students: entries.length,
        avg: `${avg.toFixed(1)}%`,
        highest: `${Math.max(...entries.map((e) => e.avgPercentage)).toFixed(1)}%`,
      };
    }
  })();

  const pageTitle =
    type === "exam"
      ? exam?.title ?? "Exam Leaderboard"
      : `${batch?.name ?? "Batch"} Leaderboard`;

  const pageSubtitle =
    type === "exam"
      ? `Batch: ${batch?.name ?? "—"} · ${entries.length} attempted`
      : `Grade ${batch?.grade ?? "—"} · All exams combined`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text-dark">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{type === "exam" ? "📝" : "🏫"}</span>
              <h1 className="truncate text-lg font-bold tracking-tight text-primary">
                {pageTitle}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">{pageSubtitle}</p>
          </div>

          <div className="ml-4 flex shrink-0 items-center gap-2">
            {/* Admin: batch switcher (batch leaderboard only) */}
            {isAdmin && type === "batch" && allBatches.length > 0 && (
              <select
                value={activeBatchId ?? ""}
                onChange={(e) => setActiveBatchId(e.target.value)}
                className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-dark focus:border-primary focus:outline-none"
              >
                {allBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
              ← Back
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-danger/15 bg-danger-bg px-5 py-4 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader text="Loading leaderboard..." />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No results yet"
            description={
              type === "exam"
                ? "No students have submitted this exam."
                : "No submissions found for this batch."
            }
          />
        ) : (
          <>
            {/* My rank pin — students only */}
            {!isAdmin && myEntry && (
              <MyRankPin entry={myEntry} total={entries.length} type={type} />
            )}

            {/* Stats row */}
            {stats && (
              <div className="flex flex-wrap gap-3">
                <StatCard label="Students" value={stats.students} />
                <StatCard
                  label="Avg Score"
                  value={stats.avg}
                  valueClass="text-blue-600"
                />
                <StatCard
                  label="Highest"
                  value={stats.highest}
                  valueClass="text-emerald-600"
                />
                {stats.passed && (
                  <StatCard
                    label="Passed"
                    value={stats.passed}
                    valueClass="text-amber-600"
                  />
                )}
              </div>
            )}

            {/* Podium — only if 2+ entries */}
            {top3.length >= 2 && (
              <Card className="overflow-hidden p-4">
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-text-faint">
                  🏆 Top Performers
                </p>
                <Podium
                  top3={top3}
                  isAdmin={isAdmin}
                  currentUserId={currentUser?.uid}
                />
              </Card>
            )}

            {/* Full rankings list */}
            <Card className="p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-faint">
                Full Rankings · {entries.length} students
              </p>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    isMe={entry.userId === currentUser?.uid}
                    isAdmin={isAdmin}
                    type={type}
                  />
                ))}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}