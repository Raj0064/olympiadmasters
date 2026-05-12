import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getExams } from '../../services/exam.service';
import { fetchStudentSubmissions } from '../../services/submission.service';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineArrowRight,
  HiOutlinePlayCircle,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import {
  safeNum,
  safeDate,
  formatDate,
} from '../../utils/safeHelpers';

// ─── Skeleton UI shown while data loads ───────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-4 w-32 rounded-lg" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-10 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </Card>
        ))}
      </div>

      {/* Two-column cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            {/* Card header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
            {/* Rows */}
            <ul className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, j) => (
                <li key={j} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          ? (allExams || []).filter(
            (e) => e && String(e.grade) === studentGrade
          )
          : allExams || [];

        setExams(gradeExams);
        setSubmissions(allSubs || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
        if (!cancelled) setError('Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, userProfile?.grade]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-dark">Dashboard</h2>
        <EmptyState message={error} />
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const now = new Date();
  const name = userProfile?.name?.split(' ')[0] || 'Student';
  const grade = userProfile?.grade || '—';

  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Submitted exam lookup
  const submittedMap = {};
  submissions.forEach((s) => {
    if (s?.examId) submittedMap[s.examId] = true;
  });

  // Categorise exams
  const inProgressExams = [];
  const availableExams = [];
  const upcomingExams = [];

  exams.forEach((exam) => {
    if (!exam?.id || !exam.isActive) return;

    const start = safeDate(exam.scheduledAt);
    if (start && now < start) {
      upcomingExams.push(exam);
      return;
    }

    if (submittedMap[exam.id]) return;

    let hasLocalData = false;
    try {
      hasLocalData = !!localStorage.getItem(
        `exam_${exam.id}_${currentUser.uid}_answers`
      );
    } catch {
      hasLocalData = false;
    }

    if (hasLocalData) inProgressExams.push(exam);
    else availableExams.push(exam);
  });

  // Stats
  const activeExamCount = exams.filter((e) => e?.isActive).length;
  const submissionCount = submissions.length;

  const totalMarksEarned = submissions.reduce(
    (s, sub) => s + safeNum(sub?.score),
    0
  );
  const totalMarksPossible = submissions.reduce(
    (s, sub) => s + safeNum(sub?.totalMarks),
    0
  );

  const bestSub =
    submissionCount > 0
      ? [...submissions]
        .filter((s) => s?.id)
        .sort((a, b) => safeNum(b?.percentage) - safeNum(a?.percentage))[0]
      : null;

  const stats = [
    {
      label: 'Total Exams',
      value: activeExamCount,
      icon: HiOutlineClipboardDocumentList,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Attempted',
      value: submissionCount,
      icon: HiOutlineCheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Available',
      value: availableExams.length + inProgressExams.length,
      icon: HiOutlineClock,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Total Marks',
      value:
        totalMarksPossible > 0
          ? `${totalMarksEarned}/${totalMarksPossible}`
          : '—',
      icon: HiOutlineChartBar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  const recentSubs = [...submissions]
    .filter((s) => s?.id)
    .sort((a, b) => {
      const at = safeDate(a?.submittedAt);
      const bt = safeDate(b?.submittedAt);
      if (!bt) return -1;
      if (!at) return 1;
      return bt - at;
    })
    .slice(0, 3);

  const hasNoData =
    activeExamCount === 0 &&
    submissionCount === 0 &&
    inProgressExams.length === 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-dark">
          {greeting}, {name} 👋
        </h2>
        <p className="text-sm text-muted mt-0.5">
          Grade {grade} · Olympiad Maths
        </p>
      </div>

      {hasNoData ? (
        <EmptyState message="No exams assigned yet. Check back soon!" />
      ) : (
        <>
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="flex items-center gap-3 p-4">
                <div className={`${bg} ${color} p-2.5 rounded-lg shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-dark">{value}</p>
                  <p className="text-[12px] text-muted">{label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* ── In Progress ── */}
          {inProgressExams.length > 0 && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                </span>
                <p className="text-sm font-semibold text-orange-700">
                  {inProgressExams.length} exam
                  {inProgressExams.length !== 1 ? 's' : ''} in progress
                </p>
              </div>

              {inProgressExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-orange-100"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-dark truncate">
                      {exam.title || 'Untitled Exam'}
                    </p>
                    <p className="text-[11px] text-orange-600 mt-0.5">
                      Timer is still running
                      {exam.duration
                        ? ` · ${safeNum(exam.duration)} min total`
                        : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/exam/${exam.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer shrink-0"
                  >
                    <HiOutlinePlayCircle className="w-4 h-4" />
                    Resume
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Available Banner ── */}
          {availableExams.length > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                </span>
                <p className="text-sm font-medium text-blue-700">
                  {availableExams.length} exam
                  {availableExams.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <button
                onClick={() => navigate('/student/exams')}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                View <HiOutlineArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Two-column cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Available Exams */}
            <Card>
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
                <p className="text-[13.5px] font-semibold text-dark">
                  Available Exams
                </p>
                <button
                  onClick={() => navigate('/student/exams')}
                  className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View all <HiOutlineArrowRight className="w-3 h-3" />
                </button>
              </div>

              {availableExams.length === 0 ? (
                <div className="px-4 py-6">
                  <EmptyState message="All exams attempted!" />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {availableExams.slice(0, 3).map((exam) => {
                    const windowEnd = safeDate(exam.windowEnd);
                    const deadlinePassed = windowEnd && now > windowEnd;

                    return (
                      <li
                        key={exam.id}
                        onClick={() => navigate(`/exam/${exam.id}`)}
                        className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-dark truncate">
                            {exam.title || 'Untitled Exam'}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {safeNum(exam.totalQuestions)} Qs
                            {exam.totalMarks
                              ? ` · ${safeNum(exam.totalMarks)} marks`
                              : ''}
                            {exam.duration
                              ? ` · ${safeNum(exam.duration)} min`
                              : ''}
                            {deadlinePassed && (
                              <span className="text-amber-500 ml-1">
                                · Deadline passed
                              </span>
                            )}
                          </p>
                        </div>
                        <Badge variant="info">Available</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Recent Results */}
            <Card>
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
                <p className="text-[13.5px] font-semibold text-dark">
                  Recent Results
                </p>
                <button
                  onClick={() => navigate('/student/performance?tab=results')}
                  className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View all <HiOutlineArrowRight className="w-3 h-3" />
                </button>
              </div>

              {recentSubs.length === 0 ? (
                <div className="px-4 py-6">
                  <EmptyState message="No exams attempted yet" />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recentSubs.map((sub) => {
                    if (!sub) return null;

                    const exam = exams.find((e) => e?.id === sub.examId);
                    const submitted = safeDate(sub.submittedAt);
                    const pct = safeNum(sub.percentage);
                    const score = safeNum(sub.score);
                    const totalMarks = safeNum(sub.totalMarks);

                    return (
                      <li
                        key={sub.id}
                        onClick={() =>
                          navigate(`/student/results/${sub.examId}`)
                        }
                        className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-dark truncate">
                            {exam?.title || 'Exam'}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {formatDate(submitted, {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[13px] font-semibold text-dark">
                            {score}/{totalMarks}
                          </span>
                          <Badge
                            variant={
                              pct >= 75
                                ? 'success'
                                : pct >= 40
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {pct}%
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* ── Best Score Banner ── */}
          {bestSub && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <HiOutlineTrophy className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Best: {safeNum(bestSub.score)}/{safeNum(bestSub.totalMarks)}{' '}
                    marks
                    <span className="text-green-600/70 font-normal ml-1">
                      ({safeNum(bestSub.percentage)}%)
                    </span>
                  </p>
                  <p className="text-[11px] text-green-600/70 mt-0.5">
                    {safeNum(bestSub.percentage) >= 90
                      ? 'Outstanding! Keep it up!'
                      : safeNum(bestSub.percentage) >= 75
                        ? 'Great job! Aim higher!'
                        : safeNum(bestSub.percentage) >= 50
                          ? 'Good effort! Keep practicing'
                          : 'Every attempt makes you better'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/student/performance')}
                className="text-xs font-medium text-green-600 hover:text-green-800 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                Details <HiOutlineArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Upcoming ── */}
          {upcomingExams.length > 0 && (
            <Card>
              <div className="px-4 pt-4 pb-3 border-b border-border">
                <p className="text-[13.5px] font-semibold text-dark">
                  Upcoming
                </p>
              </div>
              <ul className="divide-y divide-border">
                {upcomingExams.map((exam) => {
                  const start = safeDate(exam.scheduledAt);
                  return (
                    <li
                      key={exam.id}
                      className="flex items-center justify-between px-4 py-3 gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-dark truncate">
                          {exam.title || 'Untitled Exam'}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {exam.totalMarks
                            ? `${safeNum(exam.totalMarks)} marks · `
                            : ''}
                          Starts{' '}
                          {formatDate(start, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Badge variant="warning">Upcoming</Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}