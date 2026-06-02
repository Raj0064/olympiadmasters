// pages/admin/ExamSubmissions.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { getExam, getFullExam } from '../../services/exam.service';
import {
  fetchExamSubmissions,
  deleteSubmission,
  markGFormSubmitted,
} from '../../services/submission.service';
import { getStudentsByIds } from '../../services/student.service';
import { submitToGoogleForm } from '../../services/googleForm.service';

import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Loader from '../../components/ui/Loader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Table from '../../components/ui/Table.jsx';
import { BulkImportResultsButton } from '../../components/admin/create_exam/BulkResultsImport.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

function ScoreBadge({ score, totalMarks }) {
  const pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  if (pct >= 75) return <Badge variant="success">{score}/{totalMarks}</Badge>;
  if (pct >= 50) return <Badge variant="warning">{score}/{totalMarks}</Badge>;
  return <Badge variant="danger">{score}/{totalMarks}</Badge>;
}

// ─── Google Form Status Cell ──────────────────────────────────────────────────
function GFormCell({ status, onSubmit }) {
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">✓ Sent</span>
  );
  if (status === 'loading') return (
    <span className="text-xs text-text-muted animate-pulse">Sending…</span>
  );
  if (status === 'error') return (
    <button onClick={onSubmit} className="text-xs font-medium text-danger hover:underline">
      ✕ Retry
    </button>
  );
  return (
    <button onClick={onSubmit} className="text-xs font-medium text-accent hover:underline">
      Send →
    </button>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────
function SubmissionCard({ sub, onView, onDelete, gformStatus, onGFormSubmit, showGForm }) {
  return (
    <Card className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-text-dark leading-snug">{sub._studentName}</p>
          <p className="text-[11px] text-text-faint mt-0.5">{sub._studentEmail}</p>
        </div>
        <ScoreBadge score={sub.score} totalMarks={sub.totalMarks} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
        <span>✅ {sub.correct ?? '—'} correct</span>
        <span>❌ {sub.wrong ?? '—'} wrong</span>
        <span>⏭ {sub.skipped ?? '—'} skipped</span>
        <span>⏱ {formatTime(sub.timeTaken)}</span>
      </div>
      <p className="text-[11px] text-text-faint">Submitted {formatDate(sub.submittedAt)}</p>
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button onClick={() => onView(sub.id)} className="text-xs font-medium text-accent hover:underline">
          View Result
        </button>
        {showGForm && (
          <GFormCell status={gformStatus} onSubmit={() => onGFormSubmit(sub)} />
        )}
        <button onClick={() => onDelete(sub)} className="text-xs font-medium text-danger hover:underline ml-auto">
          Delete
        </button>
      </div>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ExamSubmissions() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // { [submissionId]: 'idle' | 'loading' | 'done' | 'error' }
  const [gformStatus, setGformStatus] = useState({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  // ─── Questions cache — fetched lazily, once, on first GForm send ──────────
  const questionsRef = useRef(null); // null = not fetched yet

  async function ensureQuestions() {
    if (questionsRef.current) return questionsRef.current; // already cached
    const full = await getFullExam(examId);                // 100 reads, once
    questionsRef.current = full.questions || [];
    return questionsRef.current;
  }

  // ─── Load page data ───────────────────────────────────────────────────────
  useEffect(() => { load(); }, [examId]);

  async function load() {
    setLoading(true);
    questionsRef.current = null; // reset cache on reload
    try {
      // Parallel: exam doc (1 read) + all submissions (N reads)
      const [examData, subs] = await Promise.all([
        getExam(examId),
        fetchExamSubmissions(examId),
      ]);

      setExam(examData);

      // Collect unique userIds then batch-fetch all student profiles
      // ~34 Firestore queries instead of 1000 individual calls
      const uniqueIds = [...new Set(subs.map((s) => s.userId))];
      const studentMap = await getStudentsByIds(uniqueIds); // { [uid]: student }

      const enriched = subs.map((sub) => {
        const student = studentMap[sub.userId];
        return {
          ...sub,
          _studentName: student?.name ?? 'Unknown Student',
          _studentEmail: student?.email ?? '',
        };
      });

      enriched.sort((a, b) => {
        const aTime = a.submittedAt?.toDate?.() ?? new Date(0);
        const bTime = b.submittedAt?.toDate?.() ?? new Date(0);
        return bTime - aTime;
      });

      setSubmissions(enriched);

      // Pre-populate status from Firestore flag (persisted across sessions)
      const statusMap = {};
      enriched.forEach((s) => {
        statusMap[s.id] = s.googleFormSubmitted ? 'done' : 'idle';
      });
      setGformStatus(statusMap);

    } catch (e) {
      setError('Failed to load submissions.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ─── Single GForm submit ─────────────────────────────────────────────────
  async function handleGFormSubmit(sub) {
    if (!exam?.googleForm?.token) return;
    setGformStatus((prev) => ({ ...prev, [sub.id]: 'loading' }));
    try {
      const questions = await ensureQuestions(); // 100 reads first time, 0 after
      await submitToGoogleForm({
        token: exam.googleForm.token,
        studentName: sub._studentName || '',
        studentEmail: sub._studentEmail || '',
        answers: sub.answers,
        questions,
        timedOut: false,
      });
      await markGFormSubmitted(sub.id);          // 1 write
      setGformStatus((prev) => ({ ...prev, [sub.id]: 'done' }));
    } catch (err) {
      console.error('[AdminGForm] Failed for', sub._studentName, err.message);
      setGformStatus((prev) => ({ ...prev, [sub.id]: 'error' }));
    }
  }

  // ─── Bulk GForm submit ───────────────────────────────────────────────────
  async function handleBulkGFormSubmit() {
    if (!exam?.googleForm?.token) return;
    const pending = submissions.filter((s) => gformStatus[s.id] !== 'done');
    if (pending.length === 0) return;

    setBulkSubmitting(true);
    setBulkProgress({ done: 0, total: pending.length });

    // Fetch questions once up front before the loop
    let questions;
    try {
      questions = await ensureQuestions();
    } catch (err) {
      setError('Could not load exam questions for Google Form submission.');
      setBulkSubmitting(false);
      return;
    }

    for (let i = 0; i < pending.length; i++) {
      const sub = pending[i];
      setGformStatus((prev) => ({ ...prev, [sub.id]: 'loading' }));
      try {
        await submitToGoogleForm({
          token: exam.googleForm.token,
          studentName: sub._studentName || '',
          studentEmail: sub._studentEmail || '',
          answers: sub.answers,
          questions,           // already in memory — 0 reads per iteration
          timedOut: false,
        });
        await markGFormSubmitted(sub.id);        // 1 write per student
        setGformStatus((prev) => ({ ...prev, [sub.id]: 'done' }));
      } catch (err) {
        console.error('[AdminGForm] Bulk: failed for', sub._studentName, err.message);
        setGformStatus((prev) => ({ ...prev, [sub.id]: 'error' }));
      }
      setBulkProgress({ done: i + 1, total: pending.length });
      if (i < pending.length - 1) await new Promise((r) => setTimeout(r, 500));
    }

    setBulkSubmitting(false);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubmission(deleteTarget.id);
      setSubmissions((p) => p.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete submission.');
    } finally {
      setDeleting(false);
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const isGFormLinked = !!(exam?.googleForm?.linked && exam?.googleForm?.token);
  const pendingGFormCount = submissions.filter((s) => gformStatus[s.id] !== 'done').length;
  const doneGFormCount = submissions.filter((s) => gformStatus[s.id] === 'done').length;

  const tableColumns = [
    { key: 'index', label: '#' },
    { key: 'student', label: 'Student' },
    { key: 'score', label: 'Score' },
    { key: 'correct', label: 'Correct' },
    { key: 'wrong', label: 'Wrong' },
    { key: 'skipped', label: 'Skipped' },
    { key: 'time', label: 'Time Taken' },
    { key: 'date', label: 'Submitted At' },
    ...(isGFormLinked ? [{ key: 'gform', label: 'Google Form' }] : []),
    { key: 'actions', label: '' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate('/admin/exams')}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-dark mb-4 transition-colors"
      >
        ← Back to Exams
      </button>

      {/* Exam header */}
      {exam && (
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-text-dark">{exam.title}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge variant="info">Gr {exam.grade}</Badge>
            <Badge variant="neutral">{exam.duration === 0 ? 'Unlimited' : `${exam.duration} min`}</Badge>
            <Badge variant="neutral">{exam.totalQuestions} questions</Badge>
            {exam.isActive
              ? <Badge variant="success">Active</Badge>
              : <Badge variant="neutral">Inactive</Badge>}
            {exam.isResultPublished && <Badge variant="primary">Results Published</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <BulkImportResultsButton exam={exam} onImported={load} />

            {isGFormLinked && submissions.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkGFormSubmit}
                  disabled={bulkSubmitting || pendingGFormCount === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface text-text-dark hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkSubmitting ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-border border-t-accent animate-spin" />
                      {bulkProgress.done}/{bulkProgress.total} Sending…
                    </>
                  ) : (
                    <>
                      ⇪ Submit All to Google Form
                      {pendingGFormCount > 0 && (
                        <span className="ml-0.5 text-text-faint">({pendingGFormCount} pending)</span>
                      )}
                    </>
                  )}
                </button>
                {doneGFormCount > 0 && (
                  <span className="text-xs text-success font-medium">
                    ✓ {doneGFormCount}/{submissions.length} sent
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 flex justify-between items-center text-xs text-danger bg-danger-bg border border-danger/20 rounded-lg px-3 py-2">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2 text-danger/50 hover:text-danger font-bold text-sm">×</button>
        </div>
      )}

      {loading && <Card className="py-12 flex items-center justify-center"><Loader /></Card>}

      {!loading && submissions.length === 0 && (
        <EmptyState title="No submissions yet" description="No students have submitted this exam yet." />
      )}

      {!loading && submissions.length > 0 && (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table
              title="Submissions"
              count={submissions.length}
              columns={tableColumns}
              data={submissions}
              renderRow={(sub, idx) => (
                <tr key={sub.id} className="hover:bg-black/[0.015] transition-colors">
                  <td className="py-2.5 pr-4 text-xs text-text-faint">{idx + 1}</td>
                  <td className="py-2.5 pr-4">
                    <p className="text-[13px] font-medium text-text-dark leading-snug">{sub._studentName}</p>
                    <p className="text-[11px] text-text-faint">{sub._studentEmail}</p>
                  </td>
                  <td className="py-2.5 pr-4"><ScoreBadge score={sub.score} totalMarks={sub.totalMarks} /></td>
                  <td className="py-2.5 pr-4 text-xs text-success font-medium">{sub.correct ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-xs text-danger font-medium">{sub.wrong ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-xs text-text-muted">{sub.skipped ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-xs text-text-muted whitespace-nowrap">{formatTime(sub.timeTaken)}</td>
                  <td className="py-2.5 pr-4 text-xs text-text-muted whitespace-nowrap">{formatDate(sub.submittedAt)}</td>
                  {isGFormLinked && (
                    <td className="py-2.5 pr-4">
                      <GFormCell
                        status={gformStatus[sub.id] ?? 'idle'}
                        onSubmit={() => handleGFormSubmit(sub)}
                      />
                    </td>
                  )}
                  <td className="py-2.5">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/exams/${examId}/submissions/${sub.id}`)}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sub)}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2.5">
            <p className="text-xs font-medium text-text-faint uppercase tracking-wide mb-1">
              Submissions ({submissions.length})
            </p>
            {submissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                sub={sub}
                onView={(id) => navigate(`/admin/exams/${examId}/submissions/${id}`)}
                onDelete={(s) => setDeleteTarget(s)}
                showGForm={isGFormLinked}
                gformStatus={gformStatus[sub.id] ?? 'idle'}
                onGFormSubmit={handleGFormSubmit}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Submission?"
        description={
          <>
            This will permanently delete{' '}
            <span className="font-semibold text-text-dark">{deleteTarget?._studentName}</span>
            's submission. They will be able to reattempt the exam.
          </>
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}