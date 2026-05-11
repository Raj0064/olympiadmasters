import { useState, useEffect, useCallback } from 'react';
import { getStudents, createStudent, deleteStudent } from '../../services/student.service';
import { getBatches } from '../../services/batch.service';
import { useNavigate } from 'react-router-dom';
import { BulkImportStudentsButton } from '../../components/admin/create_exam/BulkStudentImport';

const GRADES = ['4', '5', '6', '7', '8'];

// ─── Add Student Modal ────────────────────────────────────────────────────────
function AddStudentModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', grade: '', batchId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
 

  const valid = form.name.trim() && form.email.trim() && form.password.length >= 6 && form.grade;

  // When grade changes → fetch matching batches, reset batchId
  useEffect(() => {
    if (!form.grade) { setBatches([]); return; }
    setBatchesLoading(true);
    getBatches()
      .then((all) => setBatches(all.filter((b) => b.grade === form.grade)))
      .catch(() => setBatches([]))
      .finally(() => setBatchesLoading(false));
    setForm((p) => ({ ...p, batchId: '' }));
  }, [form.grade]);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  async function handleSubmit() {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await createStudent(form);
      onCreated();
    } catch (e) {
      // Firebase auth errors have a `code` — give readable messages
      const msg =
        e.code === 'auth/email-already-in-use' ? 'This email is already registered.' :
          e.code === 'auth/invalid-email' ? 'Invalid email address.' :
            e.code === 'auth/weak-password' ? 'Password must be at least 6 characters.' :
              e.message || 'Failed to create student.';
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text-dark">Add Student</h3>
            <p className="text-xs text-text-dark/40 mt-0.5">Creates a login account for the student</p>
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
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-dark/60 mb-1.5">Full Name *</label>
            <input
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white placeholder:text-text-dark/30"
              placeholder="e.g. Rohan Sharma"
              {...field('name')}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-text-dark/60 mb-1.5">Email *</label>
            <input
              type="email"
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white placeholder:text-text-dark/30"
              placeholder="student@email.com"
              {...field('email')}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-text-dark/60 mb-1.5">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full border border-black/10 rounded-lg px-3 py-2 pr-16 text-sm outline-none focus:border-accent bg-white placeholder:text-text-dark/30"
                placeholder="Min. 6 characters"
                {...field('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-dark/35 hover:text-text-dark transition-colors"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Grade + Batch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-dark/60 mb-1.5">Grade *</label>
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
                Batch <span className="text-text-dark/30 font-normal">optional</span>
              </label>
              <select
                disabled={!form.grade || batchesLoading}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                value={form.batchId}
                onChange={(e) => setForm((p) => ({ ...p, batchId: e.target.value }))}
              >
                <option value="">
                  {!form.grade ? 'Select grade first' : batchesLoading ? 'Loading…' : batches.length === 0 ? 'No batches' : 'No batch'}
                </option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
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
            {saving ? 'Creating…' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [batchMap, setBatchMap] = useState({});   // { batchId: batchName }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch students + all batches in parallel
      const [raw, allBatches] = await Promise.all([getStudents(), getBatches()]);
      setStudents(raw);
      // Build id→name map so the table can show batch names without extra queries
      setBatchMap(Object.fromEntries(allBatches.map((b) => [b.id, b.name])));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Search ──────────────────────────────────────────────────────────────────
  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(uid) {
    if (confirmDeleteId !== uid) { setConfirmDeleteId(uid); return; }
    setDeleting(true);
    try {
      await deleteStudent(uid);
      setStudents((p) => p.filter((s) => s.id !== uid));
      setConfirmDeleteId(null);
    } catch (e) {
      setError('Failed to remove student.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {showModal && (
        <AddStudentModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}

      <div className="mb-5">
        <h2 className="text-lg font-medium text-text-dark">Students</h2>
        <p className="text-sm text-text-dark/50 mt-0.5">Manage all registered students</p>
      </div>

      <div className="bg-surface border border-black/8 rounded-xl p-4">
        {/* Table header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-text-dark">
            All Students{!loading && ` (${filtered.length})`}
          </p>

          <BulkImportStudentsButton onImported={load} />

          <button
            onClick={() => setShowModal(true)}
            className="text-xs bg-primary text-white px-3.5 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            + Add Student
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm border border-black/10 rounded-lg px-3 py-2 mb-4 bg-background text-text-dark placeholder:text-text-dark/35 outline-none focus:border-accent"
        />

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Loading */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-5 h-5 border-2 border-accent/25 border-t-accent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-text-dark/30">Loading students…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-black/8">
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Name</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Email</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Grade</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Batch</th>
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {filtered.map((s) => (
                  <tr key={s.id} onClick={() => setConfirmDeleteId(null)}>
                    <td className="py-2.5 font-medium text-text-dark">{s.name}</td>
                    <td className="py-2.5 text-text-dark/55">{s.email}</td>
                    <td className="py-2.5">
                      <span className="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">
                        Gr {s.grade}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {s.batchId && batchMap[s.batchId]
                        ? <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{batchMap[s.batchId]}</span>
                        : <span className="text-[11px] text-text-dark/30">No batch</span>
                      }
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/admin/students/${s.id}`)}
                          className="text-[12px] text-blue-500 hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deleting && confirmDeleteId === s.id}
                          className={`text-[12px] transition-colors disabled:opacity-50 ${confirmDeleteId === s.id
                              ? 'text-red-600 font-semibold'
                              : 'text-red-400 hover:text-red-600'
                            }`}
                        >
                          {confirmDeleteId === s.id ? 'Sure?' : 'Remove'}
                        </button>
                        {confirmDeleteId === s.id && (
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[12px] text-text-dark/35 hover:text-text-dark transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-text-dark/35">
                      {search ? 'No students match your search' : 'No students yet — add your first one'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}