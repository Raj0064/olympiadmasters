import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  getStudent,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
} from '../../services/student.service';
import { getBatch, getBatches } from '../../services/batch.service';
import { getExam, getExamQuestions } from '../../services/exam.service';
import { fetchStudentSubmissions } from '../../services/submission.service';

const GRADES = ['4', '5', '6', '7', '8'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function percentColor(pct) {
  if (pct >= 75) return 'text-green-600';
  if (pct >= 50) return 'text-yellow-600';
  return 'text-red-500';
}

function percentBg(pct) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function percentBadgeBg(pct) {
  if (pct >= 75) return 'bg-green-50 text-green-700';
  if (pct >= 50) return 'bg-yellow-50 text-yellow-700';
  return 'bg-red-50 text-red-600';
}

function initials(name) {
  return (name || '??')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─── Edit Student Modal ───────────────────────────────────────────────────────
function EditStudentModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: student.name || '',
    grade: String(student.grade || ''),
    batchId: student.batchId || '',
  });
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valid = form.name.trim() && form.grade;

  // Load batches when grade changes
  useEffect(() => {
    if (!form.grade) {
      setBatches([]);
      return;
    }
    setBatchesLoading(true);
    getBatches()
      .then((all) =>
        setBatches(all.filter((b) => String(b.grade) === String(form.grade)))
      )
      .catch(() => setBatches([]))
      .finally(() => setBatchesLoading(false));
  }, [form.grade]);

  function handleGradeChange(e) {
    setForm((p) => ({ ...p, grade: e.target.value, batchId: '' }));
  }

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await updateStudent(student.id, {
        name: form.name.trim(),
        grade: String(form.grade),
        batchId: form.batchId || '',
      });
      onSaved({
        ...student,
        name: form.name.trim(),
        grade: String(form.grade),
        batchId: form.batchId || '',
      });
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
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Edit Student
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Update student details</p>
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

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Full Name *
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         outline-none focus:border-blue-400 bg-white
                         placeholder:text-gray-300"
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Grade + Batch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Grade *
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           outline-none focus:border-blue-400 bg-white"
                value={form.grade}
                onChange={handleGradeChange}
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
                Batch
              </label>
              <select
                disabled={!form.grade || batchesLoading}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           outline-none focus:border-blue-400 bg-white
                           disabled:opacity-50 disabled:cursor-not-allowed"
                value={form.batchId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, batchId: e.target.value }))
                }
              >
                <option value="">
                  {!form.grade
                    ? 'Select grade first'
                    : batchesLoading
                      ? 'Loading…'
                      : batches.length === 0
                        ? 'No batches'
                        : 'No batch'}
                </option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Email{' '}
              <span className="text-gray-300 font-normal">cannot be changed</span>
            </label>
            <input
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm
                         bg-gray-50 text-gray-400 cursor-not-allowed"
              value={student.email}
              readOnly
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200
                          rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
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

// ─── Question Drill Down ──────────────────────────────────────────────────────
function QuestionDrillDown({ examId, answers }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getExamQuestions(examId)
      .then(setQuestions)
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <tr>
        <td colSpan={6} className="py-6 text-center">
          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500
                          rounded-full animate-spin mx-auto mb-1" />
          <p className="text-xs text-gray-300">Loading questions…</p>
        </td>
      </tr>
    );
  }

  return questions.map((q, idx) => {
    const studentAns = answers?.[q.id] || null;
    const isCorrect = studentAns === q.correctAnswer;
    const isSkipped = !studentAns;

    return (
      <tr
        key={q.id}
        className="bg-gray-50/50 border-b border-gray-100 text-xs"
      >
        <td className="py-2 pl-10 text-gray-400">Q{idx + 1}</td>
        <td className="py-2 text-gray-600 max-w-[200px] truncate">
          {q.text || '(Image question)'}
        </td>
        <td className="py-2">
          {isSkipped ? (
            <span className="text-gray-300">—</span>
          ) : (
            <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              {studentAns}
            </span>
          )}
        </td>
        <td className="py-2 text-gray-500">{q.correctAnswer}</td>
        <td className="py-2 text-gray-400">{q.marks}</td>
        <td className="py-2">
          {isSkipped ? (
            <span className="text-[10px] bg-gray-100 text-gray-400
                             px-1.5 py-0.5 rounded-full">
              Skipped
            </span>
          ) : isCorrect ? (
            <span className="text-[10px] bg-green-50 text-green-600
                             px-1.5 py-0.5 rounded-full">
              ✓ Correct
            </span>
          ) : (
            <span className="text-[10px] bg-red-50 text-red-500
                             px-1.5 py-0.5 rounded-full">
              ✗ Wrong
            </span>
          )}
        </td>
      </tr>
    );
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ViewStudent() {
  const { uid } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [examMap, setExamMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [modal, setModal] = useState(null); // 'edit'
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Get student profile
      const studentData = await getStudent(uid);
      if (!studentData) {
        navigate('/admin/students');
        return;
      }
      setStudent(studentData);

      // 2. Get batch name
      if (studentData.batchId) {
        try {
          const batch = await getBatch(studentData.batchId);
          setBatchName(batch?.name || '');
        } catch {
          setBatchName('');
        }
      }

      // 3. Get all submissions
      const subs = await fetchStudentSubmissions(uid);
      setSubmissions(subs);

      // 4. Get exam details for each submission
      const examIds = [...new Set(subs.map((s) => s.examId))];
      const exams = {};
      await Promise.all(
        examIds.map(async (examId) => {
          try {
            const exam = await getExam(examId);
            if (exam) exams[examId] = exam;
          } catch {
            // skip
          }
        })
      );
      setExamMap(exams);
    } catch (e) {
      console.error('ViewStudent load error:', e);
      setError('Failed to load student data.');
    } finally {
      setLoading(false);
    }
  }, [uid, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Calculate Stats ───────────────────────────────────────────────────────
  const stats = (() => {
    if (!submissions.length)
      return { taken: 0, avg: 0, best: 0, worst: 0 };

    const percentages = submissions.map((s) => {
      const total = s.totalMarks || 1;
      return parseFloat(((s.score / total) * 100).toFixed(1));
    });

    return {
      taken: submissions.length,
      avg: parseFloat(
        (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1)
      ),
      best: Math.max(...percentages),
      worst: Math.min(...percentages),
    };
  })();

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleDelete(e) {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setActionPending(true);
    try {
      await deleteStudent(uid);
      navigate('/admin/students');
    } catch {
      setError('Failed to delete student.');
      setActionPending(false);
    }
  }

  async function handleResetPassword(e) {
    e.stopPropagation();
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setActionPending(true);
    try {
      await resetStudentPassword(student.email);
      setActionMsg('Password reset email sent!');
      setConfirmReset(false);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to send reset email.');
    } finally {
      setActionPending(false);
    }
  }

  function handlePageClick() {
    setConfirmDelete(false);
    setConfirmReset(false);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500
                        rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-400">Loading student…</p>
      </div>
    );
  }

  if (!student) return null;

  // Sort submissions by date (newest first)
  const sortedSubs = [...submissions].sort((a, b) => {
    const aTime = a.submittedAt?.toDate?.() || new Date(0);
    const bTime = b.submittedAt?.toDate?.() || new Date(0);
    return bTime - aTime;
  });

  return (
    <div onClick={handlePageClick} className="max-w-4xl mx-auto pb-10">
      {/* ── Edit Modal ── */}
      {modal === 'edit' && (
        <EditStudentModal
          student={student}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            setStudent(updated);
            setModal(null);
            load(); // reload batch name etc.
          }}
        />
      )}

      {/* ── Back Link ── */}
      <button
        onClick={() => navigate('/admin/students')}
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
        Back to Students
      </button>

      {/* ── Profile Header ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700
                            flex items-center justify-center text-sm font-bold
                            flex-shrink-0">
              {initials(student.name)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {student.name}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">{student.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] bg-blue-50 text-blue-800
                                 px-2 py-0.5 rounded-full">
                  Grade {student.grade}
                </span>
                {batchName && (
                  <span className="text-[11px] bg-gray-100 text-gray-600
                                   px-2 py-0.5 rounded-full">
                    {batchName}
                  </span>
                )}
                {!student.batchId && (
                  <span className="text-[11px] text-gray-300">No batch</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-2 flex-shrink-0 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModal('edit')}
              className="text-xs border border-gray-200 text-gray-500
                         hover:text-gray-900 hover:border-gray-300
                         px-3.5 py-1.5 rounded-lg transition-colors"
            >
              Edit
            </button>

            <button
              onClick={handleResetPassword}
              disabled={actionPending}
              className={`text-xs px-3.5 py-1.5 rounded-lg transition-colors
                          disabled:opacity-50
                          ${confirmReset
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'border border-yellow-300 text-yellow-600 hover:border-yellow-400'
                }`}
            >
              {confirmReset ? 'Sure? Send' : 'Reset Password'}
            </button>
            {confirmReset && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmReset(false);
                }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={actionPending}
              className={`text-xs px-3.5 py-1.5 rounded-lg transition-colors
                          disabled:opacity-50
                          ${confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-200 text-red-500 hover:border-red-400'
                }`}
            >
              {confirmDelete ? 'Sure? Delete' : 'Delete'}
            </button>
            {confirmDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Success / Error banners */}
        {actionMsg && (
          <p className="text-xs text-green-600 bg-green-50 border border-green-200
                        rounded-lg px-3 py-2 mt-4">
            {actionMsg}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200
                        rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Exams Taken', value: stats.taken, color: 'text-gray-900' },
          {
            label: 'Average Score',
            value: stats.taken ? `${stats.avg}%` : '—',
            color: stats.taken ? percentColor(stats.avg) : 'text-gray-300',
          },
          {
            label: 'Best Score',
            value: stats.taken ? `${stats.best}%` : '—',
            color: stats.taken ? percentColor(stats.best) : 'text-gray-300',
          },
          {
            label: 'Worst Score',
            value: stats.taken ? `${stats.worst}%` : '—',
            color: stats.taken ? percentColor(stats.worst) : 'text-gray-300',
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl p-4 text-center"
          >
            <p className="text-[11px] text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Performance Chart (CSS) ── */}
      {sortedSubs.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-900 mb-4">Performance</p>

          {/* Score cards row */}
          <div className="flex gap-3 overflow-x-auto pb-2 mb-5">
            {sortedSubs.map((sub) => {
              const exam = examMap[sub.examId];
              const total = sub.totalMarks || 1;
              const pct = parseFloat(((sub.score / total) * 100).toFixed(1));

              return (
                <div
                  key={sub.id}
                  className="min-w-[120px] bg-gray-50 border border-gray-100
                             rounded-xl p-3 text-center flex-shrink-0"
                >
                  <p className="text-[11px] text-gray-400 truncate mb-1">
                    {exam?.title || 'Exam'}
                  </p>
                  <p className={`text-lg font-bold ${percentColor(pct)}`}>
                    {pct}%
                  </p>
                  <p className="text-[10px] text-gray-300 mb-2">
                    {sub.score}/{total}
                  </p>
                  {/* Mini progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${percentBg(pct)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Horizontal bar chart */}
          <div className="space-y-3">
            {sortedSubs.map((sub) => {
              const exam = examMap[sub.examId];
              const total = sub.totalMarks || 1;
              const pct = parseFloat(((sub.score / total) * 100).toFixed(1));

              return (
                <div key={sub.id} className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 w-28 truncate flex-shrink-0">
                    {exam?.title || 'Exam'}
                  </p>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative
                                  overflow-hidden">
                    <div
                      className={`h-5 rounded-full transition-all duration-500
                                  ${percentBg(pct)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center
                                     text-[10px] font-medium text-white mix-blend-difference">
                      {pct}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 w-14 text-right flex-shrink-0">
                    {sub.score}/{total}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Exam Results Table ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-900 mb-4">
          Exam Results ({sortedSubs.length})
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Exam
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Score
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  %
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Correct
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Wrong
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Skipped
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Time
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Date
                </th>
                <th className="pb-2.5 text-[11px] font-medium text-gray-400
                               tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedSubs.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-sm text-gray-300"
                  >
                    No exam submissions yet
                  </td>
                </tr>
              ) : (
                sortedSubs.map((sub) => {
                  const exam = examMap[sub.examId];
                  const total = sub.totalMarks || 1;
                  const pct = parseFloat(
                    ((sub.score / total) * 100).toFixed(1)
                  );
                  const date = sub.submittedAt?.toDate?.();
                  const isExpanded = expandedExamId === sub.id;

                  return (
                    <>
                      <tr
                        key={sub.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-2.5 font-medium text-gray-900">
                          {exam?.title || sub.examId}
                        </td>
                        <td className="py-2.5 text-gray-600">
                          {sub.score}/{total}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full
                                        font-medium ${percentBadgeBg(pct)}`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 text-green-600 text-xs">
                          {sub.correct}
                        </td>
                        <td className="py-2.5 text-red-500 text-xs">
                          {sub.wrong}
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs">
                          {sub.skipped}
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs">
                          {formatTime(sub.timeTaken)}
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs">
                          {date
                            ? date.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                            : '—'}
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedExamId(isExpanded ? null : sub.id);
                            }}
                            className="text-[12px] text-blue-500 hover:text-blue-700
                                       transition-colors"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>

                      {/* Question drill down */}
                      {isExpanded && (
                        <tr key={`${sub.id}-detail`}>
                          <td colSpan={9} className="p-0">
                            <div className="bg-gray-50/80 border-y border-gray-100">
                              <table className="w-full">
                                <thead>
                                  <tr className="text-left">
                                    <th className="py-2 pl-10 text-[10px] font-medium
                                                   text-gray-400">
                                      #
                                    </th>
                                    <th className="py-2 text-[10px] font-medium
                                                   text-gray-400">
                                      Question
                                    </th>
                                    <th className="py-2 text-[10px] font-medium
                                                   text-gray-400">
                                      Your Ans
                                    </th>
                                    <th className="py-2 text-[10px] font-medium
                                                   text-gray-400">
                                      Correct
                                    </th>
                                    <th className="py-2 text-[10px] font-medium
                                                   text-gray-400">
                                      Marks
                                    </th>
                                    <th className="py-2 text-[10px] font-medium
                                                   text-gray-400">
                                      Result
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <QuestionDrillDown
                                    examId={sub.examId}
                                    answers={sub.answers || {}}
                                  />
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}