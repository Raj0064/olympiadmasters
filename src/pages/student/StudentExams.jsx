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
  HiOutlineClock,
  HiOutlineClipboardDocumentList,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
  HiOutlineExclamationTriangle,
  HiOutlinePlayCircle,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import { safeNum, safeDate, formatDate } from '../../utils/safeHelpers';

// ── Status Logic ──────────────────────────────────────────

function hasLocalStorage(key) {
  try { return !!localStorage.getItem(key); }
  catch { return false; }
}

function getExamStatus(exam, now, isSubmitted, isInProgress) {
  if (!exam?.isActive) return 'closed';
  const start = safeDate(exam.scheduledAt);
  if (start && now < start) return 'upcoming';
  if (isSubmitted) return 'attempted';
  if (isInProgress) return 'inprogress';
  return 'available';
}

function isDeadlinePassed(exam, now) {
  const end = safeDate(exam?.windowEnd);
  return end ? now > end : false;
}

// ── Component ─────────────────────────────────────────────

export default function StudentExams() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

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
        console.error('Exams load error:', err);
        if (!cancelled) setError('Failed to load exams');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser?.uid, userProfile?.grade]);

  // ── Skeleton ──
  if (loading) return <ExamsSkeleton />;

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-5">
        <div><h2 className="text-xl font-semibold text-dark">My Exams</h2></div>
        <EmptyState message={error} />
      </div>
    );
  }

  const now = new Date();
  const grade = userProfile?.grade || '—';
  const uid = currentUser?.uid || '';

  // ── Maps ──
  const submittedMap = {};
  const submissionByExam = {};
  (submissions || []).forEach((s) => {
    if (s?.examId) {
      submittedMap[s.examId] = true;
      submissionByExam[s.examId] = s;
    }
  });

  const inProgressMap = {};
  (exams || []).forEach((e) => {
    if (!e?.id || submittedMap[e.id]) return;
    if (hasLocalStorage(`exam_${e.id}_${uid}_answers`)) {
      inProgressMap[e.id] = true;
    }
  });

  // ── Tabs ──
  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'inprogress', label: 'In Progress' },
    { key: 'attempted', label: 'Attempted' },
    { key: 'upcoming', label: 'Upcoming' },
  ];

  // ── Tab counts ──
  const tabCounts = {};
  tabs.forEach((t) => {
    tabCounts[t.key] = (exams || []).filter((e) => {
      if (!e?.id) return false;
      const s = getExamStatus(e, now, submittedMap[e.id], inProgressMap[e.id]);
      return t.key === 'all' ? s !== 'closed' : s === t.key;
    }).length;
  });

  // ── Filter + Sort ──
  const filtered = (exams || []).filter((exam) => {
    if (!exam?.id) return false;
    const status = getExamStatus(exam, now, submittedMap[exam.id], inProgressMap[exam.id]);
    if (activeTab === 'all') return status !== 'closed';
    return status === activeTab;
  });

  const sortOrder = { inprogress: 0, available: 1, upcoming: 2, attempted: 3, closed: 4 };

  const sorted = [...filtered].sort((a, b) => {
    const sa = getExamStatus(a, now, submittedMap[a.id], inProgressMap[a.id]);
    const sb = getExamStatus(b, now, submittedMap[b.id], inProgressMap[b.id]);
    return (sortOrder[sa] ?? 5) - (sortOrder[sb] ?? 5);
  });

  const emptyMessages = {
    all: 'No exams found',
    available: 'No available exams right now',
    inprogress: 'No exams in progress',
    attempted: 'No exams attempted yet',
    upcoming: 'No upcoming exams scheduled',
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-dark">My Exams</h2>
        <p className="text-sm text-muted mt-0.5">
          Grade {grade} · Olympiad Maths
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.key
                ? 'bg-white text-dark shadow-sm'
                : 'text-muted hover:text-dark'
              }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-500'
                }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Exam List */}
      {sorted.length === 0 ? (
        <EmptyState message={emptyMessages[activeTab] || 'No exams found'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((exam) => {
            const status = getExamStatus(exam, now, submittedMap[exam.id], inProgressMap[exam.id]);
            const deadlinePassed = isDeadlinePassed(exam, now);
            const submission = submissionByExam[exam.id] || null;

            return (
              <ExamCard
                key={exam.id}
                exam={exam}
                status={status}
                deadlinePassed={deadlinePassed}
                submission={submission}
                onEnter={() => navigate(`/exam/${exam.id}`)}
                onResume={() => navigate(`/exam/${exam.id}`)}
                onResult={() => navigate(`/student/results/${exam.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Exam Card ─────────────────────────────────────────────

function ExamCard({
  exam,
  status,
  deadlinePassed,
  submission,
  onEnter,
  onResume,
  onResult,
}) {
  if (!exam) return null;

  const statusConfig = {
    available: { badge: 'info', label: 'Available', border: 'border-l-blue-500' },
    inprogress: { badge: 'live', label: 'In Progress', border: 'border-l-orange-500' },
    attempted: { badge: 'success', label: 'Attempted', border: 'border-l-green-500' },
    upcoming: { badge: 'warning', label: 'Upcoming', border: 'border-l-amber-400' },
    closed: { badge: 'neutral', label: 'Closed', border: 'border-l-slate-300' },
  };

  const config = statusConfig[status] || statusConfig.closed;

  const start = safeDate(exam.scheduledAt);
  const end = safeDate(exam.windowEnd);
  const totalQuestions = safeNum(exam.totalQuestions);
  const totalMarks = safeNum(exam.totalMarks);
  const duration = safeNum(exam.duration);

  // Submission data for attempted exams
  const score = submission ? safeNum(submission.score) : null;
  const subTotalMarks = submission ? safeNum(submission.totalMarks) : null;
  const pct = submission ? safeNum(submission.percentage) : null;

  function renderAction() {
    if (status === 'inprogress') {
      return (
        <button
          onClick={onResume}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer animate-pulse-subtle"
        >
          <HiOutlinePlayCircle className="w-4.5 h-4.5" />
          Resume Exam
        </button>
      );
    }

    if (status === 'attempted') {
      if (exam.isResultPublished) {
        return (
          <button
            onClick={onResult}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
          >
            <HiOutlineCheckCircle className="w-4 h-4" />
            View Result
          </button>
        );
      }
      return (
        <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-slate-100 text-muted border border-border">
          <HiOutlineClock className="w-3.5 h-3.5" />
          Result Not Yet Published
        </div>
      );
    }

    if (status === 'available') {
      return (
        <button
          onClick={onEnter}
          className="w-full px-3 py-2.5 text-[13px] font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer"
        >
          Start Exam
        </button>
      );
    }

    if (status === 'upcoming') {
      return (
        <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-slate-50 text-muted border border-border">
          <HiOutlineLockClosed className="w-3.5 h-3.5" />
          Not Started Yet
        </div>
      );
    }

    if (status === 'closed') {
      return (
        <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-slate-50 text-muted border border-border">
          Closed
        </div>
      );
    }

    return null;
  }

  return (
    <Card
      className={`flex flex-col border-l-4 ${config.border} transition-shadow hover:shadow-md ${status === 'inprogress' ? 'ring-1 ring-orange-200 bg-orange-50/30' : ''
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <div className="min-w-0">
          <p className="text-[18px] font-semibold text-dark leading-snug">
            {exam.title || 'Untitled Exam'}
          </p>
          {exam.description && (
            <p className="text-[12px] text-muted mt-0.5 line-clamp-1">
              {exam.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {status === 'inprogress' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
          )}
          <Badge variant={config.badge}>{config.label}</Badge>
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 py-2 space-y-1.5 flex-1">
        {/* Questions + Marks */}
        {(totalQuestions > 0 || totalMarks > 0) && (
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <HiOutlineClipboardDocumentList className="w-3.5 h-3.5 shrink-0" />
            <span>
              {totalQuestions > 0 && `${totalQuestions} questions`}
              {totalQuestions > 0 && totalMarks > 0 && ' · '}
              {totalMarks > 0 && `${totalMarks} marks`}
            </span>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <HiOutlineClock className="w-3.5 h-3.5 shrink-0" />
          <span>{duration > 0 ? `${duration} minutes` : 'No time Limit'}</span>
        </div>

        {/* Date */}
        <div className="text-[11.5px] text-faint">
          {status === 'upcoming' && start ? (
            <span>Starts {formatDate(start, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          ) : end && start ? (
            <span>
              {formatDate(start, { day: 'numeric', month: 'short' })} —{' '}
              {formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          ) : start ? (
            <span>Since {formatDate(start, { day: 'numeric', month: 'short', year: 'numeric' })} · No deadline</span>
          ) : (
            <span>  </span>
          )}
        </div>

        {/* Deadline warning */}
        {deadlinePassed && status === 'available' && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-amber-600">
            <HiOutlineExclamationTriangle className="w-3.5 h-3.5" />
            Deadline passed — still available
          </div>
        )}

        {/* In progress */}
        {status === 'inprogress' && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-orange-600 font-medium">
            <HiOutlinePlayCircle className="w-3.5 h-3.5" />
            Exam in progress — timer running
          </div>
        )}

        {/* Attempted — show score */}
        
        {status === 'attempted' && score !== null && exam.isResultPublished && (
          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[12px]">
              <HiOutlineTrophy className="w-3.5 h-3.5 text-green-500" />
              <span className="font-semibold text-dark">
                {score}/{subTotalMarks}
                <span className="text-faint font-normal ml-1">marks</span>
              </span>
            </div>
            {pct !== null && (
              <Badge
                variant={
                  pct >= 75 ? 'success' : pct >= 40 ? 'warning' : 'danger'
                }
              >
                {pct}%
              </Badge>
            )}
          </div>
        )}
         {status === 'attempted' && score !== null && exam.isResultPublished && (
          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[12px]">
              <HiOutlineTrophy className="w-3.5 h-3.5 text-green-500" />
              <span className="font-semibold text-dark">
                {score}/{subTotalMarks}
                <span className="text-faint font-normal ml-1">marks</span>
              </span>
            </div>
            {pct !== null && (
              <Badge
                variant={
                  pct >= 75 ? 'success' : pct >= 40 ? 'warning' : 'danger'
                }
              >
                {pct}%
              </Badge>
            )}
          </div>
        )}

        {/* Attempted — no score yet */}
        {status === 'attempted' && score === null && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-green-600">
            <HiOutlineCheckCircle className="w-3.5 h-3.5" />
            Attempted
          </div>
        )}
      </div>

      {/* Action */}
      <div className="px-4 pb-4 pt-2 border-t border-border mt-2">
        {renderAction()}
      </div>
    </Card>
  );
}

// ── Skeleton ──────────────────────────────────────────────

function ExamsSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-40 mt-1.5" />
      </div>

      <Skeleton className="h-9 w-80 rounded-lg" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="flex flex-col border-l-4 border-l-slate-200">
            <div className="px-4 pt-4 pb-2">
              <div className="flex justify-between gap-2">
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-1.5" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="px-4 py-2 space-y-2 flex-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="px-4 pb-4 pt-2 border-t border-border mt-2">
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}