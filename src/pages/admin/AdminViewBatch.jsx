// ViewBatch.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  getBatch,
  getBatchStudents,
  getBatchExams,
  assignExamToBatch,
  removeExamFromBatch,
  updateBatch,
  deleteBatch,
  getStudentsByGrade,
  addStudentToBatch,
  removeStudentFromBatch,
} from '../../services/batch.service';
import { getExams } from '../../services/exam.service';



const GRADES = ['4', '5', '6', '7', '8'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ exam }) {
  if (!exam) return null;
  if (exam.isResultPublished)
    return (
      <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
        Published
      </span>
    );
  if (exam.isActive)
    return (
      <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
        Active
      </span>
    );
  return (
    <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      Draft
    </span>
  );
}

// ─── Modal: Edit Batch ────────────────────────────────────────────────────────
function EditBatchModal({ batch, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: batch?.name || '',
    grade: batch?.grade || '',
    year: batch?.year || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valid = form.name.trim() && form.grade;

  function field(key) {
    return {
      value: form[key],
      onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await updateBatch(batch.id, {
        name: form.name.trim(),
        grade: form.grade,
        year: form.year,
      });
      onSaved({ ...batch, ...form, name: form.name.trim() });
    } catch (e) {
      setError(e?.message || 'Failed to save.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center
                 justify-center z-50 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Edit Batch</h3>
            <p className="text-xs text-gray-400 mt-0.5">Update batch details</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       hover:bg-gray-100 text-gray-400 hover:text-gray-700
                       transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Batch Name *
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         outline-none focus:border-blue-400 bg-white
                         placeholder:text-gray-300"
              placeholder="e.g. Grade 8 — Batch A"
              {...field('name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Grade *
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           outline-none focus:border-blue-400 bg-white"
                {...field('grade')}
              >
                <option value="">Select</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Year
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           outline-none focus:border-blue-400 bg-white
                           placeholder:text-gray-300"
                placeholder="2025"
                {...field('year')}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200
                          rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-5
                        border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2
                       transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="text-sm bg-blue-600 text-white px-5 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Add Student ───────────────────────────────────────────────────────
function AddStudentModal({ batch, currentStudentIds, onClose, onAdded }) {
  const [allStudents, setAllStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batch?.grade) return;
    setLoading(true);
    getStudentsByGrade(batch.grade)
      .then((students) => {
        setAllStudents(students.filter((s) => !currentStudentIds.has(s.id)));
      })
      .catch((e) => {
        console.error('getStudentsByGrade error:', e);
        setError('Failed to load students.');
      })
      .finally(() => setLoading(false));
  }, [batch?.grade, currentStudentIds]);

  const filtered = allStudents.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!selected.size) return;
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        [...selected].map((uid) => addStudentToBatch(uid, batch.id))
      );
      onAdded();
    } catch (e) {
      setError(e?.message || 'Failed to add students.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center
                 justify-center z-50 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Add Students</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Grade {batch?.grade} students not yet in this batch
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       hover:bg-gray-100 text-gray-400 hover:text-gray-700
                       transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                     outline-none focus:border-blue-400 bg-white
                     placeholder:text-gray-300 mb-3"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* List */}
        <div className="border border-gray-100 rounded-xl overflow-hidden
                        max-h-64 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500
                              rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-300">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-8">
              {allStudents.length === 0
                ? 'No unassigned students for this grade'
                : 'No results'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 w-8">
                      <div
                        className={`w-4 h-4 rounded border flex items-center
                                    justify-center transition-colors
                                    ${selected.has(s.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'}`}
                      >
                        {selected.has(s.id) && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 10 8"
                          >
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 pr-3 text-gray-400 text-xs">{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200
                        rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4
                        border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {selected.size > 0
              ? `${selected.size} selected`
              : 'Select students to add'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2
                         transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selected.size || saving}
              className="text-sm bg-blue-600 text-white px-5 py-2 rounded-lg
                         hover:bg-blue-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving
                ? 'Adding…'
                : `Add ${selected.size || ''} Student${selected.size !== 1 ? 's' : ''
                }`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Assign Exam ───────────────────────────────────────────────────────
function AssignExamModal({ batch, currentExamIds, onClose, onAssigned }) {
  const [allExams, setAllExams] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batch?.grade) return;
    setLoading(true);
    getExams()
      .then((exams) => {
        setAllExams(
          exams.filter((e) => {
            const examGrade = String(e.grade ?? "");
            const batchGrade = String(batch.grade ?? "");
            return examGrade === batchGrade && !currentExamIds.has(e.id);
          })
        );
      })
      .catch((e) => {
        console.error('getExams error:', e);
        setError('Failed to load exams.');
      })
      .finally(() => setLoading(false));
  }, [batch?.grade, currentExamIds]);

  const filtered = allExams.filter((e) =>
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (!selected.size) return;
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        [...selected].map((examId) => assignExamToBatch(batch.id, examId))
      );
      onAssigned();
    } catch (e) {
      setError(e?.message || 'Failed to assign exams.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center
                 justify-center z-50 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Assign Exams</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Grade {batch?.grade} exams not yet assigned
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       hover:bg-gray-100 text-gray-400 hover:text-gray-700
                       transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                     outline-none focus:border-blue-400 bg-white
                     placeholder:text-gray-300 mb-3"
          placeholder="Search exams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* List */}
        <div className="border border-gray-100 rounded-xl overflow-hidden
                        max-h-64 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500
                              rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-300">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-8">
              {allExams.length === 0
                ? `No unassigned Grade ${batch?.grade} exams`
                : 'No results'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 w-8">
                      <div
                        className={`w-4 h-4 rounded border flex items-center
                                    justify-center transition-colors
                                    ${selected.has(e.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'}`}
                      >
                        {selected.has(e.id) && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 10 8"
                          >
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 font-medium text-gray-900">{e.title}</td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge exam={e} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200
                        rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4
                        border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {selected.size > 0
              ? `${selected.size} selected`
              : 'Select exams to assign'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2
                         transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selected.size || saving}
              className="text-sm bg-blue-600 text-white px-5 py-2 rounded-lg
                         hover:bg-blue-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving
                ? 'Assigning…'
                : `Assign ${selected.size || ''} Exam${selected.size !== 1 ? 's' : ''
                }`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ViewBatch() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modal, setModal] = useState(null); // 'edit' | 'addStudent' | 'assignExam'

  // Two-click confirm state
  const [confirmRemoveStudentId, setConfirmRemoveStudentId] = useState(null);
  const [confirmRemoveExamId, setConfirmRemoveExamId] = useState(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [batchData, studentsData, examsData] = await Promise.all([
        getBatch(batchId),
        getBatchStudents(batchId),
        getBatchExams(batchId),
      ]);
      if (!batchData) {
        navigate('/admin/batches');
        return;
      }
      setBatch(batchData);
      setStudents(studentsData ?? []);
      setExams(examsData ?? []);
    } catch (e) {
      console.error('load error:', e);
      setError('Failed to load batch. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [batchId, navigate]);

  useEffect(() => { load(); }, [load]);

  // Reset confirm states on background click
  function handlePageClick() {
    setConfirmRemoveStudentId(null);
    setConfirmRemoveExamId(null);
    setConfirmDeleteBatch(false);
  }

  // ── Remove Student ────────────────────────────────────────────────────────
  async function handleRemoveStudent(e, studentId) {
    e.stopPropagation();
    if (confirmRemoveStudentId !== studentId) {
      setConfirmRemoveStudentId(studentId);
      return;
    }
    setActionPending(true);
    try {
      await removeStudentFromBatch(studentId);
      setStudents((p) => p.filter((s) => s.id !== studentId));
      setConfirmRemoveStudentId(null);
    } catch (err) {
      console.error('removeStudentFromBatch error:', err);
      setError('Failed to remove student.');
    } finally {
      setActionPending(false);
    }
  }

  // ── Remove Exam ───────────────────────────────────────────────────────────
  async function handleRemoveExam(e, examId) {
    e.stopPropagation();
    if (confirmRemoveExamId !== examId) {
      setConfirmRemoveExamId(examId);
      return;
    }
    setActionPending(true);
    try {
      await removeExamFromBatch(batchId, examId);
      setExams((p) => p.filter((ex) => ex.id !== examId));
      setConfirmRemoveExamId(null);
    } catch (err) {
      console.error('removeExamFromBatch error:', err);
      setError('Failed to remove exam.');
    } finally {
      setActionPending(false);
    }
  }

  // ── Delete Batch ──────────────────────────────────────────────────────────
  async function handleDeleteBatch(e) {
    e.stopPropagation();
    if (!confirmDeleteBatch) {
      setConfirmDeleteBatch(true);
      return;
    }
    setActionPending(true);
    try {
      await deleteBatch(batchId);
      navigate('/admin/batches');
    } catch (err) {
      console.error('deleteBatch error:', err);
      setError('Failed to delete batch.');
      setActionPending(false);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500
                        rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-400">Loading batch…</p>
      </div>
    );
  }

  if (error && !batch) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-500 bg-red-50 border border-red-200
                      rounded-lg px-4 py-3 inline-block">
          {error}
        </p>
        <button
          onClick={load}
          className="block mx-auto mt-4 text-sm text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!batch) return null;

  const studentIdSet = new Set(students.map((s) => s.id));
  const examIdSet = new Set(exams.map((e) => e.id));

  return (
    <div onClick={handlePageClick} className="max-w-4xl mx-auto pb-10">

      {/* ── Modals ── */}
      {modal === 'edit' && (
        <EditBatchModal
          batch={batch}
          onClose={() => setModal(null)}
          onSaved={(updated) => { setBatch(updated); setModal(null); }}
        />
      )}
      {modal === 'addStudent' && (
        <AddStudentModal
          batch={batch}
          currentStudentIds={studentIdSet}
          onClose={() => setModal(null)}
          onAdded={() => { setModal(null); load(); }}
        />
      )}
      {modal === 'assignExam' && (
        <AssignExamModal
          batch={batch}
          currentExamIds={examIdSet}
          onClose={() => setModal(null)}
          onAssigned={() => { setModal(null); load(); }}
        />
      )}

      {/* ── Back ── */}
      <button
        onClick={() => navigate('/admin/batches')}
        className="flex items-center gap-1.5 text-xs text-gray-400
                   hover:text-gray-700 transition-colors mb-5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
          <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Batches
      </button>

      {/* ── Hero Header ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{batch.name}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] bg-blue-50 text-blue-800
                               px-2 py-0.5 rounded-full">
                Grade {batch.grade}
              </span>
              {batch.year && (
                <span className="text-[11px] bg-gray-100 text-gray-600
                                 px-2 py-0.5 rounded-full">
                  {batch.year}
                </span>
              )}
              <span className="text-[11px] bg-gray-100 text-gray-600
                               px-2 py-0.5 rounded-full">
                {students.length} {students.length === 1 ? 'student' : 'students'}
              </span>
              <span className="text-[11px] bg-gray-100 text-gray-600
                               px-2 py-0.5 rounded-full">
                {exams.length} {exams.length === 1 ? 'exam' : 'exams'}
              </span>
            </div>
          </div>

          {/* Batch actions */}
          <div
            className="flex items-center gap-2 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModal('edit')}
              className="text-xs border border-gray-200 text-gray-500
                         hover:text-gray-900 hover:border-gray-300
                         px-3.5 py-1.5 rounded-lg transition-colors"
            >
              Edit Batch
            </button>

            <button
              onClick={handleDeleteBatch}
              disabled={actionPending}
              className={`text-xs px-3.5 py-1.5 rounded-lg transition-colors
                          disabled:opacity-50
                          ${confirmDeleteBatch
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-200 text-red-500 hover:border-red-400'
                }`}
            >
              {confirmDeleteBatch ? 'Sure? Delete' : 'Delete Batch'}
            </button>

            {confirmDeleteBatch && (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteBatch(false); }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200
                        rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}
      </div>

      {/* ── Students Table ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-900">
            Students ({students.length})
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setModal('addStudent'); }}
            className="text-xs bg-blue-600 text-white px-3.5 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors"
          >
            + Add Student
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide w-8">#</th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">Name</th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">Email</th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-gray-300">
                    No students yet — add your first one
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="py-2.5 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 text-gray-400 text-xs">{s.email || '—'}</td>
                    <td className="py-2.5">
                      <div
                        className="flex items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleRemoveStudent(e, s.id)}
                          disabled={actionPending && confirmRemoveStudentId === s.id}
                          className={`text-[12px] transition-colors disabled:opacity-50
                                      ${confirmRemoveStudentId === s.id
                              ? 'text-red-600 font-semibold'
                              : 'text-red-400 hover:text-red-600'}`}
                        >
                          {confirmRemoveStudentId === s.id ? 'Sure?' : 'Remove'}
                        </button>
                        {confirmRemoveStudentId === s.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmRemoveStudentId(null);
                            }}
                            className="text-[12px] text-gray-400 hover:text-gray-700
                                       transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Exams Table ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-900">
            Assigned Exams ({exams.length})
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setModal('assignExam'); }}
            className="text-xs bg-blue-600 text-white px-3.5 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors"
          >
            + Assign Exam
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">Exam Name</th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">Duration</th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">Status</th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-gray-300">
                    No exams assigned yet
                  </td>
                </tr>
              ) : (
                exams.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 font-medium text-gray-900">{e.title}</td>
                    <td className="py-2.5 text-gray-400 text-xs">
                      {e.duration ? `${e.duration} min` : '—'}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge exam={e} />
                    </td>
                    <td className="py-2.5">
                      <div
                        className="flex items-center gap-3"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <button
                          onClick={(ev) => handleRemoveExam(ev, e.id)}
                          disabled={actionPending && confirmRemoveExamId === e.id}
                          className={`text-[12px] transition-colors disabled:opacity-50
                                      ${confirmRemoveExamId === e.id
                              ? 'text-red-600 font-semibold'
                              : 'text-red-400 hover:text-red-600'}`}
                        >
                          {confirmRemoveExamId === e.id ? 'Sure?' : 'Remove'}
                        </button>
                        {confirmRemoveExamId === e.id && (
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setConfirmRemoveExamId(null);
                            }}
                            className="text-[12px] text-gray-400 hover:text-gray-700
                                       transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}