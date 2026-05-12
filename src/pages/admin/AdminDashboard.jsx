import { useEffect, useState } from 'react';
import StatCard from '../../components/admin/StatCard';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { getStudents } from '../../services/student.service';
import { getBatches } from '../../services/batch.service';
import { getExams } from '../../services/exam.service';
import { fetchExamSubmissions } from '../../services/submission.service';
import {
  HiOutlineUsers,
  HiOutlineRectangleGroup,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentCheck,
} from 'react-icons/hi2';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExamStatus(exam) {
  if (!exam.isActive) return 'Draft';
  const now = new Date();
  const end = exam.windowEnd?.toDate?.();
  if (end && now > end) return 'Completed';
  return 'Active';
}

const STATUS_VARIANT = { Active: 'success', Completed: 'info', Draft: 'neutral' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [students, batches, exams] = await Promise.all([
          getStudents(),
          getBatches(),
          getExams(), // already ordered by createdAt desc
        ]);

        // Scheduled = active with a future scheduledAt
        const now = new Date();
        const scheduledCount = exams.filter((e) => {
          const start = e.scheduledAt?.toDate?.();
          return e.isActive && start && start > now;
        }).length;

        // Fetch submissions for 3 latest exams (for recent submissions panel)
        const latestExams = exams.slice(0, 3);
        const [allSubArrays, recentSubArrays] = await Promise.all([
          Promise.all(exams.map((e) => fetchExamSubmissions(e.id))),
          Promise.all(latestExams.map((e) => fetchExamSubmissions(e.id))),
        ]);

        const totalSubmissions = allSubArrays.reduce((n, arr) => n + arr.length, 0);

        // Latest 5 submissions — sorted by submittedAt desc
        const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
        const examMap = Object.fromEntries(exams.map((e) => [e.id, e]));

        const recentSubmissions = recentSubArrays
          .flat()
          .sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0))
          .slice(0, 5)
          .map((s) => ({
            id: s.id,
            name: studentMap[s.userId]?.name ?? 'Student',
            exam: examMap[s.examId]?.title ?? '—',
            score: s.totalMarks ? `${s.score}/${s.totalMarks}` : '—',
            percentage: s.percentage ?? 0,
          }));

        const recentExams = latestExams.map((e) => ({
          id: e.id,
          title: e.title,
          grade: e.grade ? `Grade ${e.grade}` : '—',
          status: getExamStatus(e),
          questions: e.totalQuestions ?? 0,
          marks: e.totalMarks ?? 0,
        }));

        setData({
          stats: {
            students: students.length,
            batches: batches.length,
            exams: exams.length,
            scheduledCount,
            submissions: totalSubmissions,
          },
          recentExams,
          recentSubmissions,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { stats, recentExams, recentSubmissions } = data ?? {};

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description="Quick snapshot of your platform"
      />

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={HiOutlineUsers}
          label="Total Students"
          value={loading ? '—' : String(stats.students)}
          sub="across all batches"
        />
        <StatCard
          icon={HiOutlineRectangleGroup}
          label="Batches"
          value={loading ? '—' : String(stats.batches)}
          sub="active this year"
        />
        <StatCard
          icon={HiOutlineDocumentText}
          label="Exams"
          value={loading ? '—' : String(stats.exams)}
          sub={loading ? '' : `${stats.scheduledCount} scheduled`}
        />
        <StatCard
          icon={HiOutlineClipboardDocumentCheck}
          label="Submissions"
          value={loading ? '—' : String(stats.submissions)}
          sub="all time"
        />
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-danger text-center py-4">{error}</p>
      )}

      {/* ── Tables ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Recent Exams */}
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-text-dark">Recent Exams</p>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentExams.length === 0 ? (
            <EmptyState message="No exams created yet." />
          ) : (
            <div className="divide-y divide-border">
              {recentExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-dark truncate">{exam.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {exam.grade} · {exam.questions}Q · {exam.marks} marks
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[exam.status]}>{exam.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Submissions */}
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-text-dark">Recent Submissions</p>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2.5 w-2/3" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : recentSubmissions.length === 0 ? (
            <EmptyState message="No submissions yet." />
          ) : (
            <div className="divide-y divide-border">
              {recentSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-dark truncate">{sub.name}</p>
                    <p className="mt-0.5 text-xs text-text-muted truncate">{sub.exam}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-text-dark">{sub.score}</p>
                    <p className="text-[11px] text-text-muted">{sub.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}