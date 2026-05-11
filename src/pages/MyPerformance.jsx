import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getBatch } from "../services/batch.service";
import { getExam } from "../services/exam.service";
import {
  fetchStudentSubmissions,
  fetchExamSubmissions,
} from "../services/submission.service";
import { getStudent } from "../services/student.service";

import Button from "../components/ui/button.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Badge from "../components/ui/Badge.jsx";
import Card from "../components/ui/Card.jsx";
import { MdLeaderboard } from "react-icons/md";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatDate(date) {
  if (!date) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// First name + last initial only — e.g. "Aryan S."
function privateName(fullName) {
  if (!fullName) return "Student";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function scoreBadgeVariant(pct) {
  if (pct >= 90) return "success";
  if (pct >= 75) return "info";
  if (pct >= 50) return "warning";
  return "danger";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <Card className="flex-1 p-5 text-center">
      <p className="text-2xl font-black tabular-nums text-text-dark">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-text-muted">{label}</p>
    </Card>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────
const MEDAL_CLS = {
  1: "bg-amber-50 border-amber-200 text-amber-600",
  2: "bg-slate-50  border-slate-200  text-slate-500",
  3: "bg-orange-50 border-orange-200 text-orange-600",
};

function LeaderboardRow({ entry, isMe }) {
  const rankCls =
    MEDAL_CLS[entry.rank] ?? "bg-background border-border text-text-faint";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-150 ${isMe
        ? "border-primary/25 bg-primary/5 shadow-sm"
        : "border-border bg-surface hover:border-border-strong"
        }`}
    >
      {/* Rank */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${rankCls}`}
      >
        {entry.rank}
      </div>

      {/* Name + time */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${isMe ? "text-primary" : "text-text-dark"
            }`}
        >
          {privateName(entry.name)}
          {isMe && (
            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary/70">
              You
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-text-faint">
          {formatTime(entry.timeTaken)}
        </p>
      </div>

      {/* Score + % */}
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-bold tabular-nums ${isMe ? "text-primary" : "text-text-dark"
            }`}
        >
          {entry.score}/{entry.totalMarks}
        </p>
        <p
          className={`text-[11px] font-medium tabular-nums ${entry.percentage >= 75
            ? "text-success"
            : entry.percentage >= 50
              ? "text-warning"
              : "text-danger"
            }`}
        >
          {entry.percentage?.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyPerformance() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Page-level state
  const [completedExams, setCompletedExams] = useState([]); // [{ exam, submission }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Leaderboard state
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError] = useState("");

  // ── Load completed exams ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // 1. Get batch to know which exams belong to this student's batch
        const batch = await getBatch(userProfile.batchId);
        if (!batch) throw new Error("Batch not found.");
        const batchExamIds = new Set(batch.examIds || []);
        if (batchExamIds.size === 0) return;

        // 2. All submissions for this student (uses existing service)
        const submissions = await fetchStudentSubmissions(currentUser.uid);

        // 3. Keep only submissions for exams in this batch
        const relevant = submissions.filter((s) => batchExamIds.has(s.examId));
        if (relevant.length === 0) return;

        // 4. Fetch exam details for each submission
        const examResults = await Promise.all(
          relevant.map(async (sub) => {
            const exam = await getExam(sub.examId);
            if (!exam) return null;
            return { exam, submission: sub };
          })
        );

        // 5. Filter nulls + sort most recent first
        const list = examResults
          .filter(Boolean)
          .sort((a, b) => {
            const aMs = a.submission.submittedAt?.toMillis?.() ?? 0;
            const bMs = b.submission.submittedAt?.toMillis?.() ?? 0;
            return bMs - aMs;
          });

        setCompletedExams(list);

        // Default leaderboard to most recent exam
        if (list.length > 0) setSelectedExamId(list[0].exam.id);
      } catch (err) {
        console.error(err);
        setError("Failed to load performance data.");
      } finally {
        setLoading(false);
      }
    }

    if (userProfile?.batchId) load();
    else setLoading(false);
  }, [userProfile, currentUser.uid]);

  // ── Load leaderboard when selected exam changes ──────────────────────────────
  useEffect(() => {
    if (!selectedExamId) return;

    async function loadLeaderboard() {
      setLbLoading(true);
      setLbError("");
      try {
        // 1. All submissions for this exam (uses existing service)
        const subs = await fetchExamSubmissions(selectedExamId);

        // 2. Fetch student profiles in parallel (uses existing service)
        const uids = [...new Set(subs.map((s) => s.userId))];
        const profilePairs = await Promise.all(
          uids.map(async (uid) => {
            const profile = await getStudent(uid);
            return [uid, profile];
          })
        );
        const profiles = Object.fromEntries(profilePairs);

        // 3. Build leaderboard entries
        const entries = subs.map((s) => ({
          userId: s.userId,
          name: profiles[s.userId]?.name ?? "Student",
          score: s.score ?? 0,
          totalMarks: s.totalMarks ?? 0,
          percentage: s.percentage ?? 0,
          timeTaken: s.timeTaken ?? 0,
        }));

        // 4. Sort: score desc → timeTaken asc (tiebreaker)
        entries.sort((a, b) =>
          b.score !== a.score ? b.score - a.score : a.timeTaken - b.timeTaken
        );

        // 5. Assign ranks — ties share rank, next rank skips (1, 2, 2, 4...)
        let rank = 1;
        entries.forEach((e, i) => {
          if (i > 0) {
            const prev = entries[i - 1];
            if (e.score !== prev.score || e.timeTaken !== prev.timeTaken)
              rank = i + 1;
          }
          e.rank = rank;
        });

        setLeaderboard(entries);
      } catch (err) {
        console.error(err);
        setLbError("Failed to load leaderboard.");
      } finally {
        setLbLoading(false);
      }
    }

    loadLeaderboard();
  }, [selectedExamId]);

  // ── Summary stats (from student's own submissions only) ──────────────────────
  const total = completedExams.length;
  const avgPct =
    total > 0
      ? (
        completedExams.reduce(
          (sum, { submission }) => sum + (submission.percentage ?? 0),
          0
        ) / total
      ).toFixed(1)
      : null;
  const bestPct =
    total > 0
      ? Math.max(
        ...completedExams.map(({ submission }) => submission.percentage ?? 0)
      ).toFixed(1)
      : null;

  const myEntry = leaderboard.find((e) => e.userId === currentUser.uid);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen justify-center bg-background">
        <Loader text="Loading performance..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-dark">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary">
              My Performance
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              {userProfile?.name} • Grade {userProfile?.grade}
            </p>
          </div>
          <button
            onClick={() =>
              navigate(`/leaderboard?type=batch&batchId=${userProfile?.batchId}`)
            }
            className="flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <MdLeaderboard className="text-base" />
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-5 py-8">

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-danger/15 bg-danger-bg px-5 py-4 text-sm text-danger">
            {error}
          </div>
        )}

        {/* ── Overview ────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-text-dark">
            Overview
          </h2>
          <div className="flex gap-3">
            <StatCard label="Exams attempted" value={total || "0"} />
            <StatCard label="Average score" value={avgPct ? `${avgPct}%` : "—"} />
            <StatCard label="Best score" value={bestPct ? `${bestPct}%` : "—"} />
          </div>
        </section>

        {/* ── Results ─────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-text-dark">
            Results
          </h2>

          {completedExams.length === 0 ? (
            <EmptyState title="No completed exams yet" />
          ) : (
            <Card className="overflow-hidden p-0">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-background px-5 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-faint">Exam</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-faint w-20 text-center">Score</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-faint w-20 text-center">Percentage</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-faint w-20 text-center">Details</p>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-border">
                {completedExams.map(({ exam, submission }) => {
                  const pct = submission.percentage ?? 0;
                  const totalMarks = submission.totalMarks || exam.totalMarks;
                  const date = submission.submittedAt?.toDate?.() ?? exam.scheduledAt?.toDate?.();

                  return (
                    <div
                      key={exam.id}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-background"
                    >
                      {/* Exam name + date */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-dark">
                          {exam.title}
                        </p>
                        {date && (
                          <p className="mt-0.5 text-[11px] text-text-faint">
                            {formatDate(date)}
                          </p>
                        )}
                      </div>

                      {/* Score */}
                      <div className="w-20 text-center">
                        <p className="text-sm font-bold tabular-nums text-text-dark">
                          {submission.score}/{totalMarks}
                        </p>
                      </div>

                      {/* Percentage */}
                      <div className="w-20 text-center">
                        <Badge variant={scoreBadgeVariant(pct)}>
                          {pct.toFixed(1)}%
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="w-20 text-center">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/results/${exam.id}`)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>

        {/* ── Leaderboard ─────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-text-dark">
              Leaderboard
            </h2>

            {completedExams.length > 0 && (
              <select
                value={selectedExamId ?? ""}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-dark transition-colors focus:border-primary focus:outline-none"
              >
                {completedExams.map(({ exam }) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {completedExams.length === 0 ? (
            <EmptyState title="Complete an exam to see the leaderboard" />
          ) : lbLoading ? (
            <div className="flex justify-center py-10">
              <Loader text="Loading leaderboard..." />
            </div>
          ) : lbError ? (
            <div className="rounded-2xl border border-danger/15 bg-danger-bg px-5 py-4 text-sm text-danger">
              {lbError}
            </div>
          ) : (
            <div className="space-y-3">

              {/* My rank pin */}
              {myEntry && (
                <Card className="border-primary/20 bg-primary/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        Your rank
                      </p>
                      <p className="mt-1 text-4xl font-black tabular-nums text-primary">
                        #{myEntry.rank}
                        <span className="ml-2 text-sm font-medium text-text-muted">
                          of {leaderboard.length}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-5">
                      <div className="text-center">
                        <p className="text-xl font-black tabular-nums text-text-dark">
                          {myEntry.score}/{myEntry.totalMarks}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-faint">score</p>
                      </div>
                      <div className="w-px bg-border" />
                      <div className="text-center">
                        <p
                          className={`text-xl font-black tabular-nums ${myEntry.percentage >= 75
                            ? "text-success"
                            : myEntry.percentage >= 50
                              ? "text-warning"
                              : "text-danger"
                            }`}
                        >
                          {myEntry.percentage?.toFixed(1)}%
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-faint">percentage</p>
                      </div>
                      <div className="w-px bg-border" />
                      <div className="text-center">
                        <p className="text-xl font-black text-text-dark">
                          {formatTime(myEntry.timeTaken)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-faint">time taken</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Full ranked list */}
              <Card className="p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-faint">
                  All students · {leaderboard.length} attempted
                </p>

                {leaderboard.length === 0 ? (
                  <EmptyState title="No submissions yet" />
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => (
                      <LeaderboardRow
                        key={entry.userId}
                        entry={entry}
                        isMe={entry.userId === currentUser.uid}
                      />
                    ))}
                  </div>
                )}
              </Card>

            </div>
          )}
        </section>
      </main>
    </div>
  );
}