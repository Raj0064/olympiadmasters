// pages/Leaderboard.jsx
// /leaderboard?type=exam&examId=xxx&batchId=xxx
// /leaderboard?type=batch&batchId=xxx

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getExam } from '../services/exam.service';
import { getBatch, getBatches, getBatchExams, getBatchStudents } from '../services/batch.service';
import { buildExamLeaderboard } from '../services/leaderboard.service';
import { fetchExamSubmissions } from '../services/submission.service';
import Skeleton from '../components/ui/Skeleton.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctColor(pct) {
  if (pct >= 85) return 'text-emerald-600';
  if (pct >= 70) return 'text-blue-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-500';
}

function pctBg(pct) {
  if (pct >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (pct >= 70) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function bandLabel(pct) {
  if (pct >= 85) return 'Excellent';
  if (pct >= 70) return 'Good';
  if (pct >= 50) return 'Needs Practice';
  return 'Critical';
}

function privateName(name) {
  if (!name) return 'Student';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function getTrend(scores) {
  // scores: array of pct values in chronological order, null = not attempted
  const attempted = scores.filter(s => s !== null);
  if (attempted.length < 2) return '→';
  const last = attempted[attempted.length - 1];
  const prev = attempted[attempted.length - 2];
  if (last > prev + 1) return '↑';
  if (last < prev - 1) return '↓';
  return '→';
}

function trendColor(t) {
  if (t === '↑') return 'text-emerald-600 font-bold';
  if (t === '↓') return 'text-red-500 font-bold';
  return 'text-slate-400';
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, valueClass = '' }) {
  return (
    <div className="flex-1 min-w-[80px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-center shadow-sm">
      <p className={`text-xl font-black tabular-nums ${valueClass || 'text-slate-800'}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Table Shell ──────────────────────────────────────────────────────────────

function TableShell({ head, children, footer }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {head.map((h, i) => (
                <th
                  key={i}
                  className="py-2.5 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
      {footer && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Table ───────────────────────────────────────────────────────────

function TableSkeleton({ cols = 5, rows = 8 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[...Array(cols)].map((_, i) => (
                <th key={i} className="py-2.5 px-4">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...Array(rows)].map((_, i) => (
              <tr key={i}>
                {[...Array(cols)].map((_, j) => (
                  <td key={j} className="py-3 px-4">
                    <Skeleton className={`h-3 ${j === 1 ? 'w-32' : 'w-14'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Exam View ────────────────────────────────────────────────────────────────

function ExamView({ examId, batchId, isAdmin, currentUserId }) {
  const [entries, setEntries] = useState([]);
  const [students, setStudents] = useState([]);
  const [exam, setExam] = useState(null);
  const [view, setView] = useState('detailed'); // 'detailed' | 'simplified'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!examId) return;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const tasks = [buildExamLeaderboard(examId), getExam(examId)];
        if (batchId) tasks.push(getBatchStudents(batchId));
        const [lb, examData, batchStudents] = await Promise.all(tasks);
        setExam(examData);
        setEntries(lb);
        setStudents(batchStudents ?? []);
      } catch (e) {
        console.error(e);
        setError('Failed to load exam results.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [examId, batchId]);

  if (error) return <p className="text-sm text-red-600 py-4">{error}</p>;

  // Build full list: attempted (from leaderboard) + not-attempted (from batch students)
  const attemptedIds = new Set(entries.map(e => e.userId));
  const notAttempted = students.filter(s => !attemptedIds.has(s.id));

  const attempted = entries.length;
  const total = students.length || attempted;
  const notDone = students.length ? students.length - attempted : 0;
  const avgPct = attempted ? entries.reduce((s, e) => s + e.percentage, 0) / attempted : 0;
  const topStudent = entries[0];
  const below40 = entries.filter(e => e.percentage < 40).length;

  const displayName = (name) => isAdmin ? name : privateName(name);

  // CSV export
  function handleDownload() {
    const header = ['#', 'Student', 'Status', 'Score', 'Percentage', 'Rank'];
    const rows = [
      ...entries.map((e, i) => [
        i + 1, e.name, 'Attempted',
        `${e.score}/${e.totalMarks}`, `${e.percentage.toFixed(1)}%`, `#${e.rank}`,
      ]),
      ...notAttempted.map((s, i) => [
        attempted + i + 1, s.name, 'Not Attempted', `0/${exam?.totalMarks ?? 0}`, '0%', '-',
      ]),
    ];
    downloadCSV([header, ...rows], `${exam?.title ?? 'exam'}_results.csv`);
  }

  return (
    <div className="space-y-4">

      {/* Stats */}
      {loading ? (
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="flex-1 h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <StatCard label="Total Students" value={total} />
          <StatCard label="Attempted" value={attempted} valueClass="text-blue-600" />
          <StatCard label="Not Attempted" value={notDone} valueClass={notDone > 0 ? 'text-amber-600' : 'text-slate-800'} />
          <StatCard label="Batch Average" value={`${avgPct.toFixed(0)}%`} valueClass={pctColor(avgPct)} />
          <StatCard label="Below 40%" value={below40} valueClass={below40 > 0 ? 'text-red-600' : 'text-slate-800'} />
          {topStudent && (
            <StatCard
              label="Top Student"
              value={displayName(topStudent.name)}
              sub={`${topStudent.score}/${topStudent.totalMarks}`}
            />
          )}
        </div>
      )}

      {/* Total marks note + view toggle + download */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-500">
          Total Marks for this exam: <span className="font-semibold text-slate-700">{exam?.totalMarks ?? '—'}</span>
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setView('detailed')}
              className={`px-3 py-1.5 transition-colors ${view === 'detailed' ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Detailed
            </button>
            <button
              onClick={() => setView('simplified')}
              className={`px-3 py-1.5 border-l border-slate-200 transition-colors ${view === 'simplified' ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Simplified
            </button>
          </div>
          {!loading && (
            <button
              onClick={handleDownload}
              className="text-xs font-medium border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Download CSV
            </button>
          )}
        </div>
      </div>

      {/* Tables */}
      {loading ? (
        <TableSkeleton cols={6} rows={8} />
      ) : view === 'detailed' ? (
        <DetailedTable
          entries={entries}
          notAttempted={notAttempted}
          totalMarks={exam?.totalMarks ?? 0}
          displayName={displayName}
          currentUserId={currentUserId}
        />
      ) : (
        <SimplifiedTable
          entries={entries}
          notAttempted={notAttempted}
          totalMarks={exam?.totalMarks ?? 0}
          avgPct={avgPct}
          attempted={attempted}
          notDone={notDone}
          displayName={displayName}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

// ─── Detailed Table ───────────────────────────────────────────────────────────

function DetailedTable({ entries, notAttempted, totalMarks, displayName, currentUserId }) {
  const all = [
    ...entries.map((e, i) => ({ ...e, rowNum: i + 1, attempted: true })),
    ...notAttempted.map((s, i) => ({
      userId: s.id, name: s.name,
      score: 0, totalMarks, percentage: 0, rank: null,
      rowNum: entries.length + i + 1, attempted: false,
    })),
  ];

  return (
    <TableShell head={['#', 'Student', 'Status', 'Score', 'Percentage', 'Rank']}>
      {all.map((row) => {
        const isMe = row.userId === currentUserId;
        return (
          <tr
            key={row.userId}
            className={`transition-colors ${isMe
                ? 'bg-blue-50 border-l-2 border-blue-500'
                : row.attempted
                  ? 'hover:bg-slate-50/60'
                  : 'bg-slate-50/40'
              }`}
          >
            <td className="py-3 px-4 text-slate-400 tabular-nums text-xs">{row.rowNum}</td>
            <td className="py-3 px-4 font-medium text-slate-800">
              {displayName(row.name)}
              {isMe && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
            </td>
            <td className="py-3 px-4">
              {row.attempted ? (
                <span className="text-xs text-emerald-700 font-medium">Attempted</span>
              ) : (
                <span className="text-xs text-slate-400">Not Attempted</span>
              )}
            </td>
            <td className="py-3 px-4 tabular-nums text-slate-700 font-medium">
              {row.attempted ? `${row.score}/${row.totalMarks}` : <span className="text-slate-300">—</span>}
            </td>
            <td className="py-3 px-4">
              {row.attempted ? (
                <span className={`text-xs font-semibold tabular-nums ${pctColor(row.percentage)}`}>
                  {row.percentage.toFixed(0)}%
                </span>
              ) : (
                <span className="text-slate-300 text-xs">—</span>
              )}
            </td>
            <td className="py-3 px-4 tabular-nums font-semibold text-slate-700 text-xs">
              {row.attempted ? `#${row.rank}` : <span className="text-slate-300">—</span>}
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}

// ─── Simplified Table ─────────────────────────────────────────────────────────

function SimplifiedTable({ entries, notAttempted, totalMarks, avgPct, attempted, notDone, displayName, currentUserId }) {
  return (
    <TableShell
      head={['Rank', 'Student Name', 'Marks']}
      footer={
        <span>
          Class Average: <strong>{Math.round(avgPct * totalMarks / 100)}/{totalMarks}</strong> ({avgPct.toFixed(0)}%)
          &nbsp;·&nbsp; {attempted} attempted
          &nbsp;·&nbsp; {notDone} not given
          &nbsp;·&nbsp; Same marks = same rank
        </span>
      }
    >
      {entries.map((e) => {
        const isMe = e.userId === currentUserId;
        return (
          <tr
            key={e.userId}
            className={`transition-colors ${isMe ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-slate-50/60'}`}
          >
            <td className="py-3 px-4 font-semibold text-slate-700 tabular-nums text-xs w-16">#{e.rank}</td>
            <td className="py-3 px-4 font-medium text-slate-800">
              {displayName(e.name)}
              {isMe && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
            </td>
            <td className="py-3 px-4 tabular-nums">
              <span className="font-semibold text-slate-800">{e.score}/{e.totalMarks}</span>
              <span className={`ml-2 text-xs font-semibold ${pctColor(e.percentage)}`}>({e.percentage.toFixed(0)}%)</span>
            </td>
          </tr>
        );
      })}

      {/* Not Given section */}
      {notAttempted.length > 0 && (
        <>
          <tr className="bg-slate-50">
            <td colSpan={3} className="py-2 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Not Given ({notAttempted.length})
            </td>
          </tr>
          {notAttempted.map((s) => (
            <tr key={s.id} className="bg-slate-50/40">
              <td className="py-2.5 px-4 text-slate-300 text-xs">—</td>
              <td className="py-2.5 px-4 text-slate-400 text-sm">{displayName(s.name)}</td>
              <td className="py-2.5 px-4 text-slate-300 text-xs">Not Given</td>
            </tr>
          ))}
        </>
      )}
    </TableShell>
  );
}

// ─── Batch View ───────────────────────────────────────────────────────────────

function BatchView({ batchId, isAdmin, currentUserId }) {
  const [rows, setRows] = useState([]);
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batchId) return;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [batchExams, students] = await Promise.all([
          getBatchExams(batchId),
          getBatchStudents(batchId),
        ]);

        // Sort exams chronologically
        const sortedExams = [...batchExams].sort((a, b) => {
          const aT = a.scheduledAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
          const bT = b.scheduledAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
          return aT - bT;
        });
        setExams(sortedExams);

        if (!sortedExams.length || !students.length) {
          setRows([]); setStats(null); setLoading(false); return;
        }

        // Fetch all submissions in parallel
        const subArrays = await Promise.all(sortedExams.map(e => fetchExamSubmissions(e.id)));

        // Build lookup: examId → { userId → sub }
        const subMap = {};
        sortedExams.forEach((exam, i) => {
          subMap[exam.id] = {};
          subArrays[i].forEach(s => { subMap[exam.id][s.userId] = s; });
        });

        // Build row per student
        const built = students.map(student => {
          const examScores = sortedExams.map(exam => {
            const sub = subMap[exam.id][student.id];
            return sub
              ? { score: sub.score, totalMarks: sub.totalMarks, pct: sub.percentage }
              : null;
          });

          const attempted = examScores.filter(Boolean);
          const missed = examScores.filter(s => s === null).length;
          const avgPct = attempted.length
            ? attempted.reduce((s, e) => s + e.pct, 0) / attempted.length
            : 0;
          const trend = getTrend(examScores.map(s => s ? s.pct : null));

          return { id: student.id, name: student.name, examScores, avgPct, missed, trend };
        });

        // Sort: avgPct desc, then attempted count desc
        built.sort((a, b) => {
          const aMissed = a.examScores.filter(Boolean).length;
          const bMissed = b.examScores.filter(Boolean).length;
          if (Math.abs(b.avgPct - a.avgPct) > 0.01) return b.avgPct - a.avgPct;
          return bMissed - aMissed;
        });

        // Compute stats
        const totalStudents = students.length;
        const overallAvg = built.filter(r => r.examScores.some(Boolean)).length
          ? built.filter(r => r.examScores.some(Boolean))
            .reduce((s, r) => s + r.avgPct, 0) /
          built.filter(r => r.examScores.some(Boolean)).length
          : 0;
        const below40 = built.filter(r => r.avgPct < 40 && r.examScores.some(Boolean)).length;
        const redFlags = built.filter(r => r.missed >= 2).length;

        setStats({ totalStudents, exams: sortedExams.length, overallAvg, below40, redFlags });
        setRows(built);
      } catch (e) {
        console.error(e);
        setError('Failed to load batch leaderboard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batchId]);

  const displayName = (name) => isAdmin ? name : privateName(name);

  function handleDownload() {
    const header = ['#', 'Student', ...exams.map(e => e.title), 'Average %', 'Trend', 'Missed'];
    const csvRows = rows.map((r, i) => [
      i + 1,
      r.name,
      ...r.examScores.map(s => s ? `${s.score}/${s.totalMarks} (${s.pct.toFixed(0)}%)` : 'NA'),
      `${r.avgPct.toFixed(1)}%`,
      r.trend,
      r.missed,
    ]);
    downloadCSV([header, ...csvRows], `batch_leaderboard.csv`);
  }

  if (error) return <p className="text-sm text-red-600 py-4">{error}</p>;

  return (
    <div className="space-y-4">

      {/* Stats */}
      {loading ? (
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="flex-1 h-16 rounded-xl" />)}
        </div>
      ) : stats && (
        <div className="flex flex-wrap gap-3">
          <StatCard label="Students" value={stats.totalStudents} />
          <StatCard label="Exams" value={stats.exams} />
          <StatCard label="Class Average" value={`${stats.overallAvg.toFixed(0)}%`} valueClass={pctColor(stats.overallAvg)} />
          <StatCard label="Below 40%" value={stats.below40} valueClass={stats.below40 > 0 ? 'text-red-600' : 'text-slate-800'} />
          <StatCard label="Red Flags (2+ Missed)" value={stats.redFlags} valueClass={stats.redFlags > 0 ? 'text-red-600' : 'text-slate-800'} />
        </div>
      )}

      {/* Download */}
      {!loading && rows.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleDownload}
            className="text-xs font-medium border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Download CSV
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton cols={exams.length + 5 || 6} rows={10} />
      ) : rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400 shadow-sm">
          No data available for this batch.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-10">#</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 min-w-[140px]">Student</th>
                  {exams.map(e => (
                    <th key={e.id} className="py-2.5 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[110px]">
                      {e.title.length > 14 ? e.title.slice(0, 14) + '…' : e.title}
                    </th>
                  ))}
                  <th className="py-2.5 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 min-w-[70px]">Average</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-14">Trend</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-14">Missed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => {
                  const isMe = row.id === currentUserId;
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${isMe
                          ? 'bg-blue-50 border-l-2 border-blue-500'
                          : row.missed >= 2
                            ? 'bg-red-50/30'
                            : 'hover:bg-slate-50/60'
                        }`}
                    >
                      <td className="py-3 px-4 text-slate-400 tabular-nums text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {displayName(row.name)}
                        {isMe && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
                      </td>
                      {row.examScores.map((s, i) => (
                        <td key={i} className="py-3 px-4 tabular-nums">
                          {s ? (
                            <span>
                              <span className="font-medium text-slate-700">{s.score}</span>
                              <span className={`ml-1 text-xs ${pctColor(s.pct)}`}>({s.pct.toFixed(0)}%)</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">NA</span>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-4 tabular-nums">
                        {row.examScores.some(Boolean) ? (
                          <span className={`text-xs font-bold ${pctColor(row.avgPct)}`}>
                            {row.avgPct.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-sm ${trendColor(row.trend)}`}>{row.trend}</td>
                      <td className="py-3 px-4 text-xs tabular-nums">
                        {row.missed > 0 ? (
                          <span className={row.missed >= 2 ? 'font-bold text-red-600' : 'text-amber-600'}>
                            {row.missed}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            {rows.length} students · {exams.length} exams · Red rows = 2+ missed
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Exam Tabs (for exam type — switch between exams in batch) ─────────────────

function ExamTabs({ batchId, activeExamId, onSelect }) {
  const [batchExams, setBatchExams] = useState([]);

  useEffect(() => {
    if (!batchId) return;
    getBatchExams(batchId).then(exams => {
      const sorted = [...exams].sort((a, b) => {
        const aT = a.scheduledAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
        const bT = b.scheduledAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
        return aT - bT;
      });
      setBatchExams(sorted);
    }).catch(() => { });
  }, [batchId]);

  if (batchExams.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {batchExams.map(e => (
        <button
          key={e.id}
          onClick={() => onSelect(e.id)}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${e.id === activeExamId
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
        >
          {e.title}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const type = searchParams.get('type');
  const batchId = searchParams.get('batchId');
  const isAdmin = userProfile?.role === 'admin';

  const [examId, setExamId] = useState(searchParams.get('examId'));
  const [exam, setExam] = useState(null);
  const [batch, setBatch] = useState(null);
  const [allBatches, setAllBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(batchId);

  // Load meta (title for header)
  useEffect(() => {
    const tasks = [];
    if (activeBatch) tasks.push(getBatch(activeBatch).then(setBatch).catch(() => { }));
    if (examId) tasks.push(getExam(examId).then(setExam).catch(() => { }));
    if (isAdmin && type === 'batch') {
      tasks.push(getBatches().then(setAllBatches).catch(() => { }));
    }
    if (tasks.length) Promise.all(tasks);
  }, [activeBatch, examId, type, isAdmin]);

  function handleExamSwitch(id) {
    setExamId(id);
    setExam(null);
    const next = new URLSearchParams(searchParams);
    next.set('examId', id);
    setSearchParams(next, { replace: true });
  }

  const pageTitle = type === 'exam'
    ? (exam?.title ?? 'Exam Results')
    : `${batch?.name ?? 'Batch'} Overview`;

  const pageSub = type === 'exam'
    ? (batch?.name ? `Batch: ${batch.name}` : '')
    : `Grade ${batch?.grade ?? '—'} · All exams`;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <header className="sticky top-0 z-40 shadow-md" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563EB)' }}>
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base sm:text-lg truncate">{pageTitle}</h1>
            {pageSub && <p className="text-white/60 text-xs mt-0.5">{pageSub}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Batch switcher — admin, batch type */}
            {isAdmin && type === 'batch' && allBatches.length > 1 && (
              <select
                value={activeBatch ?? ''}
                onChange={e => setActiveBatch(e.target.value)}
                className="text-xs rounded-lg border border-white/20 bg-white/10 text-white px-3 py-1.5 focus:outline-none cursor-pointer"
              >
                {allBatches.map(b => (
                  <option key={b.id} value={b.id} className="text-slate-800 bg-white">{b.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => navigate(-1)}
              className="text-xs font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">

        {/* Exam tabs — switch exams within same batch */}
        {type === 'exam' && batchId && (
          <ExamTabs
            batchId={batchId}
            activeExamId={examId}
            onSelect={handleExamSwitch}
          />
        )}

        {/* View */}
        {type === 'exam' && examId ? (
          <ExamView
            examId={examId}
            batchId={batchId}
            isAdmin={isAdmin}
            currentUserId={currentUser?.uid}
          />
        ) : type === 'batch' && activeBatch ? (
          <BatchView
            batchId={activeBatch}
            isAdmin={isAdmin}
            currentUserId={currentUser?.uid}
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400 shadow-sm">
            Invalid leaderboard URL.
          </div>
        )}

      </main>
    </div>
  );
}