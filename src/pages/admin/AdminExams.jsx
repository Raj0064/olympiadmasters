// pages/admin/AdminExams.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getExams,
  toggleExamActive,
  toggleExamResults,
  deleteExam,
} from '../../services/exam.service';

import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Loader from '../../components/ui/Loader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { MdOutlineLeaderboard } from 'react-icons/md';

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      className={[
        'relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0',
        checked ? 'bg-success' : 'bg-black/15',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
          checked ? 'left-[18px]' : 'left-0.5',
        ].join(' ')}
      />
    </button>
  );
}

// ─── Mobile Card ─────────────────────────────────────────────────────────────
function ExamMobileCard({
  exam,
  onToggleActive,
  onToggleResults,
  onDelete,
  onOpen,
  onSubmissions,
  saving,
}) {
  return (
    <Card className="p-4 sm:p-5 space-y-3.5">
      {/* Title + Badges */}
      <div>
        <p className="text-sm font-semibold text-text-dark leading-snug">
          {exam.title}
        </p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <Badge variant="info">Gr {exam.grade}</Badge>
          <Badge variant="neutral">{exam.batchId}</Badge>
          <Badge variant="neutral">
            {exam.duration === 0 ? 'Unlimited' : `${exam.duration} min`}
          </Badge>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3 text-xs text-text-muted">
        <label className="flex items-center gap-3 select-none cursor-pointer">
          <Toggle
            checked={exam.isActive}
            onChange={(v) => onToggleActive(exam.id, v)}
            disabled={saving === exam.id}
          />
          <span>Active</span>
        </label>
        <label className="flex items-center gap-3 select-none cursor-pointer">
          <Toggle
            checked={exam.isResultPublished}
            onChange={(v) => onToggleResults(exam.id, v)}
            disabled={saving === exam.id}
          />
          <span>Results Published</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-border">
        <button
          onClick={() => onOpen(exam.id)}
          className="text-xs font-medium text-accent hover:underline transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onSubmissions(exam.id)}
          className="text-xs font-medium text-text-muted hover:text-text-dark hover:underline transition-colors"
        >
          Submissions
        </button>
        <button
          onClick={() => onDelete(exam)}
          className="text-xs font-medium text-danger hover:underline transition-colors ml-auto"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setExams(await getExams());
    } catch (e) {
      setError('Failed to load exams. Check Firestore rules.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(id, val) {
    setSaving(id);
    try {
      await toggleExamActive(id, val);
      setExams((p) =>
        p.map((e) => (e.id === id ? { ...e, isActive: val } : e))
      );
    } catch {
      setError('Toggle failed.');
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleResults(id, val) {
    setSaving(id);
    try {
      await toggleExamResults(id, val);
      setExams((p) =>
        p.map((e) => (e.id === id ? { ...e, isResultPublished: val } : e))
      );
    } catch {
      setError('Toggle failed.');
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExam(deleteTarget.id);
      setExams((p) => p.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-text-dark">
            Exams
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Create and manage exams
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/admin/exams/create')}
          className="w-full sm:w-auto"
        >
          + Create Exam
        </Button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-4 sm:mb-6 flex justify-between items-center text-sm bg-danger-bg border border-danger/20 rounded-lg px-4 py-3 text-danger">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-3 text-danger/50 hover:text-danger text-lg leading-none font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <Card className="py-16 flex items-center justify-center">
          <Loader />
        </Card>
      )}

      {/* ── Empty ── */}
      {!loading && exams.length === 0 && (
        <EmptyState
          title="No exams yet"
          description="Get started by creating your first exam."
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/exams/create')}
            >
              + Create your first exam
            </Button>
          }
        />
      )}

      {/* ── Content ── */}
      {!loading && exams.length > 0 && (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-text-dark mb-4">
                All Exams
                <span className="ml-2 text-text-faint font-normal">
                  ({exams.length})
                </span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      {[
                        'Title',
                        'Grade',
                        'Batch',
                        'Duration',
                        'Active',
                        'Results',
                        '',
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="pb-3 pr-4 last:pr-0 text-xs font-semibold text-text-faint tracking-wider uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {exams.map((e) => (
                      <tr
                        key={e.id}
                        className="hover:bg-black/[0.02] transition-colors"
                      >
                        <td className="py-4 pr-4 font-medium text-text-dark">
                          <span className="max-w-[250px] truncate block">
                            {e.title}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <Badge variant="info">Gr {e.grade}</Badge>
                        </td>
                        <td className="py-4 pr-4">
                          <Badge variant="neutral">{e.batchId}</Badge>
                        </td>
                        <td className="py-4 pr-4 text-sm text-text-muted">
                          {e.duration === 0
                            ? 'Unlimited'
                            : `${e.duration} min`}
                        </td>
                        <td className="py-4 pr-4">
                          <Toggle
                            checked={e.isActive}
                            onChange={(v) => handleToggleActive(e.id, v)}
                            disabled={saving === e.id}
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <Toggle
                            checked={e.isResultPublished}
                            onChange={(v) => handleToggleResults(e.id, v)}
                            disabled={saving === e.id}
                          />
                        </td>
                        <td className="py-4 pr-0">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() =>
                                navigate(`/admin/exams/${e.id}/edit`)
                              }
                              className="text-xs font-medium text-accent hover:underline transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                navigate(
                                  `/admin/exams/${e.id}/submissions`
                                )
                              }
                              className="text-xs font-medium text-text-muted hover:text-text-dark hover:underline transition-colors"
                            >
                              Submissions
                            </button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/leaderboard?type=exam&examId=${e.id}&batchId=${e.batchId}`
                                )
                              }
                            >
                              <MdOutlineLeaderboard className="text-base" />
                            </Button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  id: e.id,
                                  title: e.title,
                                })
                              }
                              className="text-xs font-medium text-danger hover:underline transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3.5">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wider px-1">
              All Exams ({exams.length})
            </p>
            {exams.map((e) => (
              <ExamMobileCard
                key={e.id}
                exam={e}
                saving={saving}
                onToggleActive={handleToggleActive}
                onToggleResults={handleToggleResults}
                onDelete={(ex) =>
                  setDeleteTarget({ id: ex.id, title: ex.title })
                }
                onOpen={(id) => navigate(`/admin/exams/${id}/edit`)}
                onSubmissions={(id) =>
                  navigate(`/admin/exams/${id}/submissions`)
                }
              />
            ))}
          </div>
        </>
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Exam?"
        description={
          <>
            "
            <span className="font-semibold text-text-dark">
              {deleteTarget?.title}
            </span>
            " and all its questions will be permanently deleted. This action
            cannot be undone.
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