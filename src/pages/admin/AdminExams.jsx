import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExams, toggleExamActive, toggleExamResults, deleteExam } from '../../services/exam.service';

function Badge({ children, color }) {
  const map = {
    blue: 'bg-blue-50 text-blue-800',
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${map[color] ?? map.gray}`}>
      {children}
    </span>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors flex-shrink-0
        ${checked ? 'bg-answered' : 'bg-black/15'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all
        ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function ExamMobileCard({ exam, onToggleActive, onToggleResults, onDelete, onOpen, saving }) {
  return (
    <div className="border border-black/8 rounded-xl p-4 bg-surface space-y-3">
      <div>
        <p className="text-sm font-medium text-text-dark">{exam.title}</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Badge color="blue">Gr {exam.grade}</Badge>
          <Badge color="gray">{exam.batchId}</Badge>
          <Badge color="gray">{exam.duration === 0 ? 'Unlimited' : `${exam.duration} min`}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-dark/60">
        <label className="flex items-center gap-2">
          <Toggle checked={exam.isActive} onChange={v => onToggleActive(exam.id, v)} disabled={saving === exam.id} />
          Active
        </label>
        <label className="flex items-center gap-2">
          <Toggle checked={exam.isResultPublished} onChange={v => onToggleResults(exam.id, v)} disabled={saving === exam.id} />
          Results
        </label>
      </div>
      <div className="flex gap-4 pt-1 border-t border-black/6">
        <button onClick={() => onOpen(exam.id)} className="text-xs text-accent hover:underline">Open</button>
        <button onClick={() => onDelete(exam)} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    </div>
  );
}

export default function AdminExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

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
      setExams(p => p.map(e => e.id === id ? { ...e, isActive: val } : e));
    } catch { setError('Toggle failed.'); }
    finally { setSaving(null); }
  }

  async function handleToggleResults(id, val) {
    setSaving(id);
    try {
      await toggleExamResults(id, val);
      setExams(p => p.map(e => e.id === id ? { ...e, isResultPublished: val } : e));
    } catch { setError('Toggle failed.'); }
    finally { setSaving(null); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExam(deleteTarget.id);
      setExams(p => p.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { setError('Delete failed.'); }
    finally { setDeleting(false); }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-medium text-text-dark">Exams</h2>
          <p className="text-sm text-text-dark/50 mt-0.5">Create and manage exams</p>
        </div>
        <button
          onClick={() => navigate('/admin/exams/create')}
          className="text-xs bg-primary text-white px-3.5 py-2 rounded-lg hover:bg-accent transition-colors whitespace-nowrap flex-shrink-0"
        >
          + Create Exam
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex justify-between items-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-surface border border-black/8 rounded-xl p-12 text-center">
          <p className="text-sm text-text-dark/40 animate-pulse">Loading exams…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && exams.length === 0 && (
        <div className="bg-surface border border-dashed border-black/15 rounded-xl p-12 text-center">
          <p className="text-sm text-text-dark/40">No exams yet.</p>
          <button onClick={() => navigate('/admin/exams/create')}
            className="mt-3 text-xs text-accent hover:underline">+ Create your first exam</button>
        </div>
      )}

      {/* Desktop table */}
      {!loading && exams.length > 0 && (
        <>
          <div className="hidden md:block bg-surface border border-black/8 rounded-xl p-4">
            <p className="text-sm font-medium text-text-dark mb-4">All Exams ({exams.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-black/8">
                    {['Title', 'Grade', 'Batch', 'Duration', 'Active', 'Results', ''].map((h, i) => (
                      <th key={i} className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide pr-4 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6">
                  {exams.map(e => (
                    <tr key={e.id}>
                      <td className="py-2.5 pr-4 font-medium text-text-dark">
                        <span className="max-w-[180px] truncate block">{e.title}</span>
                      </td>
                      <td className="py-2.5 pr-4"><Badge color="blue">Gr {e.grade}</Badge></td>
                      <td className="py-2.5 pr-4"><Badge color="gray">{e.batchId}</Badge></td>
                      <td className="py-2.5 pr-4 text-xs text-text-dark/55">
                        {e.duration === 0 ? 'Unlimited' : `${e.duration} min`}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Toggle checked={e.isActive} onChange={v => handleToggleActive(e.id, v)} disabled={saving === e.id} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <Toggle checked={e.isResultPublished} onChange={v => handleToggleResults(e.id, v)} disabled={saving === e.id} />
                      </td>
                      <td className="py-2.5">
                        <button onClick={() => navigate(`/admin/exams/${e.id}`)}
                          className="text-[12px] text-accent hover:underline mr-3">Open</button>
                        <button onClick={() => setDeleteTarget({ id: e.id, title: e.title })}
                          className="text-[12px] text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {exams.map(e => (
              <ExamMobileCard key={e.id} exam={e} saving={saving}
                onToggleActive={handleToggleActive}
                onToggleResults={handleToggleResults}
                onDelete={ex => setDeleteTarget({ id: ex.id, title: ex.title })}
                onOpen={id => navigate(`/admin/exams/${id}`)}
              />
            ))}
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-semibold text-text-dark mb-1">Delete Exam?</h3>
            <p className="text-sm text-text-dark/55 mb-4">
              "<span className="font-medium text-text-dark">{deleteTarget.title}</span>" and all its questions will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-black/15 text-sm text-text-dark py-2 rounded-lg hover:bg-black/3">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-500 text-white text-sm py-2 rounded-lg hover:bg-red-600 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}