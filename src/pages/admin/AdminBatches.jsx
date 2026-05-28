import { useState, useEffect, useCallback } from 'react';
import {
  getBatches,
  getBatchStudentCount,
  createBatch,
  deleteBatch,
} from '../../services/batch.service';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const GRADES = ['4', '5', '6', '7', '8'];
const CURRENT_YEAR = String(new Date().getFullYear());

// ─── Create Batch Modal ───────────────────────────────────────────────────────
function CreateBatchModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', grade: '', year: CURRENT_YEAR });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  

  const valid = form.name.trim() && form.grade;
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  async function handleSubmit() {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await createBatch(form);
      onCreated();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to create batch.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text-dark">Create Batch</h3>
            <p className="text-xs text-text-dark/40 mt-0.5">Add a new student batch</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 text-text-dark/40 hover:text-text-dark transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
              Batch Name *
            </label>
            <input
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white placeholder:text-text-dark/30"
              placeholder="e.g. Grade 8 — Batch A"
              {...field('name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
                Grade *
              </label>
              <select
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
                {...field('grade')}
              >
                <option value="">Select</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
                Year
              </label>
              <input
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white placeholder:text-text-dark/30"
                placeholder={CURRENT_YEAR}
                {...field('year')}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-black/8">
          <button
            onClick={onClose}
            className="text-sm text-text-dark/50 hover:text-text-dark px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!valid || saving}
            className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating…' : 'Create Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Two-click delete: stores the id pending confirmation
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await getBatches();
      // Fetch all student counts in parallel — one query per batch
      const withCounts = await Promise.all(
        raw.map(async (b) => ({
          ...b,
          studentCount: await getBatchStudentCount(b.id),
        }))
      );
      setBatches(withCounts);
    } catch (e) {
      setError('Failed to load batches. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteBatch(deleteTarget.id);

      setBatches((prev) =>
        prev.filter((b) => b.id !== deleteTarget.id)
      );

      setDeleteTarget(null);
    } catch (e) {
      setError('Failed to delete batch.');
    } finally {
      setDeleting(false);
    }
  }


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {showModal && (
        <CreateBatchModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            loadBatches();
          }}
        />
      )}

      {/* Page header */}
      <div className="mb-5">
        <h2 className="text-lg font-medium text-text-dark">Batches</h2>
        <p className="text-sm text-text-dark/50 mt-0.5">Organise students into batches</p>
      </div>

      <div className="bg-surface border border-black/8 rounded-xl p-4">
        {/* Table header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-text-dark">
            All Batches{!loading && ` (${batches.length})`}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs bg-primary text-white px-3.5 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            + Create Batch
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-5 h-5 border-2 border-accent/25 border-t-accent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-text-dark/30">Loading batches…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-black/8">
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Batch Name</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Grade</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Year</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Students</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 font-medium text-text-dark">{b.name}</td>
                    <td className="py-2.5">
                      <span className="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">
                        Gr {b.grade}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {b.year || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 text-text-dark/55">
                      {b.studentCount} {b.studentCount === 1 ? 'student' : 'students'}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button className="text-[12px] text-accent hover:underline" onClick={() => navigate(`/admin/batches/${b.id}`)}>
                          View
                        </button>

                        {/* Two-click delete */}
                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="text-[12px] text-red-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {batches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-text-dark/30">
                      No batches yet — create your first one
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Batch?"
          description={
            <>
              Batch{' '}
              <span className="font-semibold text-text-dark">
                {deleteTarget?.name}
              </span>{' '}
              will be permanently deleted. This cannot be undone.
            </>
          }
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          confirmVariant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </div>
  );
}