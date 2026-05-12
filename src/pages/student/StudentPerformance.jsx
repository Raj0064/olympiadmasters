import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getExams } from '../../services/exam.service';
import { fetchStudentSubmissions } from '../../services/submission.service';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import StudentResults from './StudentResults';
import {
  HiOutlineChartBar,
  HiOutlineTrophy,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineMinusCircle,
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
} from 'react-icons/hi2';

import {
  safeNum,
  safeDate,
  safeDivide,
  safeRound,
  formatDate,
} from '../../utils/safeHelpers';

// ── Main Component ────────────────────────────────────────

export default function StudentPerformance() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default tab is always 'results'
  const activeTab = searchParams.get('tab') || 'results';

  function setTab(tab) {
    setSearchParams(tab === 'results' ? {} : { tab });
  }

  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;

    let cancelled = false;

    async function load() {
      try {
        const [allExams, allSubs] = await Promise.all([
          getExams().catch(() => []),
          fetchStudentSubmissions(currentUser.uid).catch(() => []),
        ]);

        if (cancelled) return;

        const studentGrade = String(userProfile.grade || '');
        const gradeExams = studentGrade
          ? (allExams || []).filter((e) => e && String(e.grade) === studentGrade)
          : allExams || [];

        setExams(gradeExams);
        setSubmissions(allSubs || []);
      } catch (err) {
        console.error('Performance load error:', err);
        if (!cancelled) setError('Failed to load performance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser?.uid, userProfile?.grade]);

  if (loading) return <PerformanceSkeleton />;

  const grade = userProfile?.grade || '—';

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader grade={grade} />
        <EmptyState message={error} />
      </div>
    );
  }

  const sorted = [...(submissions || [])]
    .filter((s) => s?.id)
    .sort((a, b) => {
      const at = safeDate(a.submittedAt);
      const bt = safeDate(b.submittedAt);
      if (!bt && !at) return 0;
      if (!bt) return -1;
      if (!at) return 1;
      return bt - at;
    });

  const totalAttempted = sorted.length;
  const hasEnoughForPerformance = totalAttempted > 2;

  const examMap = {};
  (exams || []).forEach((e) => { if (e?.id) examMap[e.id] = e; });

  // If Performance tab is active but not unlocked, fall back to results
  const safeTab = activeTab === 'performance' && !hasEnoughForPerformance
    ? 'results'
    : activeTab;

  // Tabs: Results always shown, Performance only when > 5 exams
  const tabs = [
    { key: 'results', label: 'Results' },
    ...(hasEnoughForPerformance ? [{ key: 'performance', label: 'Performance' }] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader grade={grade} totalAttempted={totalAttempted} />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-all cursor-pointer ${safeTab === tab.key
                ? 'bg-white text-dark shadow-sm'
                : 'text-muted hover:text-dark'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {safeTab === 'results' ? (
        totalAttempted === 0 ? (
          <EmptyState message="No exams attempted yet. Your results will appear here after your first exam." />
        ) : (
          <StudentResults sorted={sorted} examMap={examMap} />
        )
      ) : (
        <OverviewTab
          sorted={sorted}
          examMap={examMap}
          totalAttempted={totalAttempted}
          navigate={navigate}
          setTab={setTab}
        />
      )}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────

function PageHeader({ grade, totalAttempted }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-dark">Performance</h2>
      <p className="text-sm text-muted mt-0.5">
        Grade {grade} · Olympiad Maths
        {totalAttempted > 0 && (
          <> · {totalAttempted} exam{totalAttempted !== 1 ? 's' : ''} attempted</>
        )}
      </p>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────

function OverviewTab({ sorted, examMap, totalAttempted, navigate, setTab }) {
  const totalCorrect = sorted.reduce((s, e) => s + safeNum(e.correct), 0);
  const totalWrong = sorted.reduce((s, e) => s + safeNum(e.wrong), 0);
  const totalSkipped = sorted.reduce((s, e) => s + safeNum(e.skipped), 0);
  const totalQs = sorted.reduce((s, e) => s + safeNum(e.totalQuestions), 0);

  const totalMarksEarned = sorted.reduce((s, e) => s + safeNum(e.score), 0);
  const totalMarksPossible = sorted.reduce((s, e) => s + safeNum(e.totalMarks), 0);

  const avgPercentage = safeRound(
    safeDivide(
      sorted.reduce((s, e) => s + safeNum(e.percentage), 0),
      totalAttempted
    )
  );

  const bestExam = sorted.reduce(
    (best, e) => safeNum(e.percentage) > safeNum(best?.percentage) ? e : best,
    sorted[0]
  );
  const worstExam = sorted.reduce(
    (worst, e) => safeNum(e.percentage) < safeNum(worst?.percentage) ? e : worst,
    sorted[0]
  );

  let trend = null;
  let trendLabel = '—';
  if (totalAttempted >= 2) {
    const half = Math.ceil(totalAttempted / 2);
    const recentAvg = safeRound(
      safeDivide(
        sorted.slice(0, half).reduce((s, e) => s + safeNum(e.percentage), 0),
        half
      )
    );
    const olderAvg = safeRound(
      safeDivide(
        sorted.slice(half).reduce((s, e) => s + safeNum(e.percentage), 0),
        sorted.slice(half).length
      )
    );
    trend = recentAvg - olderAvg;
    trendLabel = `${trend >= 0 ? '+' : ''}${trend}%`;
  }

  const totalAnswered = totalCorrect + totalWrong;
  const accuracy = safeRound(safeDivide(totalCorrect, totalAnswered) * 100);

  const examsWithTime = sorted.filter(
    (e) => safeNum(e.timeTaken) > 0 && safeNum(examMap[e.examId]?.duration) > 0
  );
  let avgTimeUsed = 0;
  if (examsWithTime.length > 0) {
    avgTimeUsed = Math.min(
      safeRound(
        safeDivide(
          examsWithTime.reduce(
            (s, e) =>
              s + safeDivide(
                safeNum(e.timeTaken),
                safeNum(examMap[e.examId]?.duration)
              ) * 100,
            0
          ),
          examsWithTime.length
        )
      ),
      100
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={HiOutlineChartBar}
          label="Avg Score"
          value={`${avgPercentage}%`}
          sub={totalMarksPossible > 0 ? `${totalMarksEarned}/${totalMarksPossible} marks` : null}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          icon={HiOutlineTrophy}
          label="Best Score"
          value={`${safeNum(bestExam?.percentage)}%`}
          sub={
            bestExam && safeNum(bestExam.totalMarks) > 0
              ? `${safeNum(bestExam.score)}/${safeNum(bestExam.totalMarks)} marks`
              : null
          }
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          icon={HiOutlineAcademicCap}
          label="Accuracy"
          value={totalAnswered > 0 ? `${accuracy}%` : '—'}
          sub={totalAnswered > 0 ? `${totalCorrect} of ${totalAnswered} answered` : null}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatCard
          icon={trend === null || trend >= 0 ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown}
          label="Trend"
          value={trend !== null ? trendLabel : '—'}
          sub={trend !== null
            ? trend >= 0 ? 'Improving' : 'Needs work'
            : 'Need more data'
          }
          color={trend === null ? 'text-slate-500' : trend >= 0 ? 'text-green-600' : 'text-red-600'}
          bg={trend === null ? 'bg-slate-50' : trend >= 0 ? 'bg-green-50' : 'bg-red-50'}
        />
      </div>

      {/* ── Score Progress + Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <Card className="lg:col-span-2">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <p className="text-[13.5px] font-semibold text-dark">Score Progress</p>
            <p className="text-[11px] text-muted mt-0.5">
              Last {sorted.length} exam{sorted.length !== 1 ? 's' : ''} — click to view result
            </p>
          </div>
          <div className="px-4 py-4 space-y-4">
            {sorted.map((sub) => {
              const pct = safeNum(sub.percentage);
              const score = safeNum(sub.score);
              const totalMarks = safeNum(sub.totalMarks);
              const examTitle = examMap[sub.examId]?.title || 'Exam';
              const submitted = safeDate(sub.submittedAt);
              const barColor =
                pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

              return (
                <div
                  key={sub.id}
                  className="space-y-1 cursor-pointer group"
                  onClick={() => navigate(`/student/results/${sub.examId}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-dark truncate max-w-[55%] group-hover:text-accent transition-colors">
                      {examTitle}
                    </p>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold text-dark">
                        {score}/{totalMarks}
                        <span className="text-faint font-normal ml-1 text-[10px]">marks</span>
                      </p>
                      <p className={`text-[10px] font-medium ${pct >= 75 ? 'text-green-600'
                          : pct >= 40 ? 'text-amber-600'
                            : 'text-red-600'
                        }`}>
                        {pct}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-faint">
                    {formatDate(submitted, { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-[13.5px] font-semibold text-dark">Answer Breakdown</p>
              <p className="text-[11px] text-muted mt-0.5">
                Across {totalAttempted} exam{totalAttempted !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="px-4 py-4 space-y-3">
              <BreakdownRow
                icon={HiOutlineCheckCircle}
                label="Correct"
                value={totalCorrect}
                total={totalQs}
                color="text-green-600"
                barColor="bg-green-500"
              />
              <BreakdownRow
                icon={HiOutlineXCircle}
                label="Wrong"
                value={totalWrong}
                total={totalQs}
                color="text-red-600"
                barColor="bg-red-500"
              />
              <BreakdownRow
                icon={HiOutlineMinusCircle}
                label="Skipped"
                value={totalSkipped}
                total={totalQs}
                color="text-slate-500"
                barColor="bg-slate-400"
              />
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <p className="text-[12px] text-muted">Total Questions</p>
                <p className="text-[13px] font-semibold text-dark">{totalQs}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-[13.5px] font-semibold text-dark">Time Usage</p>
            </div>
            <div className="px-4 py-4">
              {examsWithTime.length === 0 ? (
                <p className="text-[12px] text-muted">No time data available</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] text-muted">Avg time used</p>
                    <p className="text-[13px] font-semibold text-dark">{avgTimeUsed}%</p>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${avgTimeUsed > 90
                          ? 'bg-red-500'
                          : avgTimeUsed > 70
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      style={{ width: `${avgTimeUsed}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-faint mt-1.5">
                    {avgTimeUsed > 90
                      ? 'Using almost all time'
                      : avgTimeUsed > 70
                        ? 'Good pace'
                        : 'Great time management!'}
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Best & Worst ── */}
      {totalAttempted >= 2 && bestExam?.examId !== worstExam?.examId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HighlightCard
            label="Best Performance"
            sub={bestExam}
            examMap={examMap}
            variant="success"
            icon={HiOutlineTrophy}
          />
          <HighlightCard
            label="Needs Improvement"
            sub={worstExam}
            examMap={examMap}
            variant="danger"
            icon={HiOutlineArrowTrendingDown}
          />
        </div>
      )}

      {totalAttempted >= 2 && bestExam?.examId === worstExam?.examId && (
        <HighlightCard
          label="All Scores Equal"
          sub={sorted[0]}
          examMap={examMap}
          variant="success"
          icon={HiOutlineTrophy}
        />
      )}

      {/* ── View All Results ── */}
      <button
        onClick={() => setTab('results')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-surface text-[13px] font-medium text-accent hover:bg-slate-50 transition-colors cursor-pointer"
      >
        View all exam results
        <HiOutlineArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Shared Sub Components ─────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`${bg} ${color} p-2.5 rounded-lg shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-dark">{value}</p>
        <p className="text-[12px] text-muted">{label}</p>
        {sub && (
          <p className="text-[10px] text-faint mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </Card>
  );
}

function BreakdownRow({ icon: Icon, label, value, total, color, barColor }) {
  const pct = safeRound(safeDivide(value, total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <p className="text-[12px] text-dark font-medium">{label}</p>
        </div>
        <p className="text-[12px] font-semibold text-dark">
          {value}{' '}
          <span className="text-faint font-normal">({pct}%)</span>
        </p>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function HighlightCard({ label, sub, examMap, variant, icon: Icon }) {
  if (!sub) return null;

  const colors = {
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'success' },
    danger: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'danger' },
  };

  const c = colors[variant] || colors.success;
  const examTitle = examMap[sub.examId]?.title || 'Exam';
  const pct = safeNum(sub.percentage);
  const score = safeNum(sub.score);
  const totalMarks = safeNum(sub.totalMarks);

  return (
    <div className={`rounded-xl ${c.bg} border ${c.border} px-4 py-4 flex items-start gap-3`}>
      <div className={`${c.icon} mt-0.5 shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted uppercase tracking-wide font-medium">
          {label}
        </p>
        <p className="text-[14px] font-semibold text-dark mt-0.5 truncate">
          {examTitle}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[13px] font-bold text-dark">
            {score}/{totalMarks}
            <span className="text-faint font-normal text-[11px] ml-1">marks</span>
          </span>
          <Badge variant={c.badge}>{pct}%</Badge>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────

function PerformanceSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-52 mt-1.5" />
      </div>
      <Skeleton className="h-10 w-52 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-3 w-16 mt-1.5" />
              <Skeleton className="h-2.5 w-20 mt-1" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20 mt-1.5" />
          </div>
          <div className="px-4 py-4 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-2/5" />
                  <div className="text-right">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2.5 w-10 mt-1 ml-auto" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="px-4 py-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="px-4 py-4 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-2.5 w-32 mt-1" />
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl bg-slate-50 border border-border px-4 py-4 flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded-full mt-0.5 shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-40 mt-2" />
              <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}