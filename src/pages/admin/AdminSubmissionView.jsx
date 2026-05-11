// pages/admin/SubmissionView.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { getExam, getExamQuestions } from '../../services/exam.service';
import { fetchSubmissionById } from '../../services/submission.service';
import { getStudent } from '../../services/student.service';

import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Table from '../../components/ui/Table.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, color = 'text-text-dark' }) {
  return (
    <div className="flex flex-col items-center justify-center bg-background border border-border rounded-xl px-4 py-3 min-w-[70px]">
      <span className={`text-lg font-bold leading-none ${color}`}>
        {value}
      </span>
      <span className="text-[10px] text-text-faint mt-1 text-center">
        {label}
      </span>
    </div>
  );
}

// ─── Question Row (desktop) ──────────────────────────────────────────────────
function QuestionRow({ q, idx, studentAnswer, sectionName }) {
  const isCorrect = studentAnswer === q.correctAnswer;
  const isSkipped = !studentAnswer;

  return (
    <tr className="hover:bg-black/[0.015] transition-colors align-top">
      <td className="py-3 pr-4 text-xs text-text-faint">{idx + 1}</td>

      <td className="py-3 pr-4">
        <span className="text-[11px] text-text-faint">{sectionName}</span>
      </td>

      <td className="py-3 pr-4 text-[13px] text-text-dark max-w-[280px]">
        {q.imageUrl && (
          <img
            src={q.imageUrl}
            alt=""
            className="mb-1.5 rounded-lg max-h-20 object-contain"
          />
        )}
        <p className="leading-snug">{q.text || '—'}</p>
      </td>

      <td className="py-3 pr-4">
        {isSkipped ? (
          <Badge variant="neutral">Skipped</Badge>
        ) : (
          <span
            className={`text-xs font-semibold ${isCorrect ? 'text-success' : 'text-danger'
              }`}
          >
            {studentAnswer}
          </span>
        )}
      </td>

      <td className="py-3 pr-4">
        <span className="text-xs font-semibold text-success">
          {q.correctAnswer}
        </span>
      </td>

      <td className="py-3 pr-4 text-xs text-text-muted">{q.marks}</td>

      <td className="py-3">
        {isSkipped ? (
          <Badge variant="neutral">Skipped</Badge>
        ) : isCorrect ? (
          <Badge variant="success">Correct</Badge>
        ) : (
          <Badge variant="danger">Wrong</Badge>
        )}
      </td>
    </tr>
  );
}

// ─── Question Card (mobile) ──────────────────────────────────────────────────
function QuestionCardMobile({ q, idx, studentAnswer, sectionName }) {
  const isCorrect = studentAnswer === q.correctAnswer;
  const isSkipped = !studentAnswer;

  return (
    <Card className="p-3.5 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-faint">Q{idx + 1}</span>
          <span className="text-[11px] text-text-faint">· {sectionName}</span>
        </div>
        {isSkipped ? (
          <Badge variant="neutral">Skipped</Badge>
        ) : isCorrect ? (
          <Badge variant="success">Correct</Badge>
        ) : (
          <Badge variant="danger">Wrong</Badge>
        )}
      </div>

      {/* Question */}
      {q.imageUrl && (
        <img
          src={q.imageUrl}
          alt=""
          className="rounded-lg max-h-32 object-contain w-full"
        />
      )}
      <p className="text-[13px] text-text-dark leading-snug">{q.text}</p>

      {/* Answer */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-text-faint">Answered:</span>
        <span
          className={`font-semibold ${isSkipped
            ? 'text-text-muted'
            : isCorrect
              ? 'text-success'
              : 'text-danger'
            }`}
        >
          {studentAnswer ?? '—'}
        </span>
        {!isCorrect && !isSkipped && (
          <>
            <span className="text-text-faint">Correct:</span>
            <span className="font-semibold text-success">
              {q.correctAnswer}
            </span>
          </>
        )}
        {isSkipped && (
          <>
            <span className="text-text-faint">Correct:</span>
            <span className="font-semibold text-success">
              {q.correctAnswer}
            </span>
          </>
        )}
      </div>

      {/* Explanation */}
      {q.explanation && (
        <div className="bg-info-bg border border-info/20 rounded-lg px-3 py-2 text-[11px] text-text-dark leading-snug">
          <span className="font-semibold text-info mr-1">Explanation:</span>
          {q.explanation}
        </div>
      )}
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SubmissionView() {
  const { examId, submissionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    load();
  }, [submissionId]);

  async function load() {
    setLoading(true);
    try {
      const sub = await fetchSubmissionById(submissionId);
      if (!sub) throw new Error('Submission not found.');

      const [examData, studentData] = await Promise.all([
        getExam(examId),
        getStudent(sub.userId),
      ]);

      const qs = await getExamQuestions(examId, examData?.sections ?? []);

      setSubmission(sub);
      setExam(examData);
      setStudent(studentData);
      setQuestions(qs);
    } catch (e) {
      setError(e.message || 'Failed to load submission.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // section name map
  const sectionMap = {};
  exam?.sections?.forEach((s) => {
    sectionMap[s.id] = s.name;
  });

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate(`/admin/exams/${examId}/submissions`)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-dark mb-4 transition-colors"
      >
        ← Back to Submissions
      </button>

      {/* Loading */}
      {loading && (
        <Card className="py-12 flex items-center justify-center">
          <Loader />
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="py-8 text-center">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {!loading && !error && submission && (
        <>
          {/* ── Student + Exam Header ── */}
          <div className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-text-dark">
                  {student?.name ?? 'Unknown Student'}
                </h2>
                <p className="text-xs text-text-faint mt-0.5">
                  {student?.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">{exam?.title}</p>
                <p className="text-xs text-text-faint mt-0.5">
                  Submitted {formatDate(submission.submittedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Score Stats ── */}
          <div className="flex flex-wrap gap-2.5 mb-4">
            <StatBox
              label="Score"
              value={`${submission.score}/${submission.totalMarks}`}
              color="text-primary"
            />
            <StatBox
              label="Percentage"
              value={`${submission.percentage ?? 0}%`}
              color={
                (submission.percentage ?? 0) >= 75
                  ? 'text-success'
                  : (submission.percentage ?? 0) >= 50
                    ? 'text-warning'
                    : 'text-danger'
              }
            />
            <StatBox
              label="Correct"
              value={submission.correct ?? 0}
              color="text-success"
            />
            <StatBox
              label="Wrong"
              value={submission.wrong ?? 0}
              color="text-danger"
            />
            <StatBox
              label="Skipped"
              value={submission.skipped ?? 0}
              color="text-text-muted"
            />
            <StatBox
              label="Time"
              value={formatTime(submission.timeTaken)}
              color="text-text-dark"
            />
          </div>

          {/* ── Questions ── */}
          {questions.length > 0 && (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table
                  title="Answer Breakdown"
                  count={questions.length}
                  columns={[
                    { key: 'index', label: '#' },
                    { key: 'section', label: 'Section' },
                    { key: 'question', label: 'Question' },
                    { key: 'answer', label: 'Answered' },
                    { key: 'correct', label: 'Correct' },
                    { key: 'marks', label: 'Marks' },
                    { key: 'status', label: 'Status' },
                  ]}
                  data={questions}
                  renderRow={(q, idx) => (
                    <QuestionRow
                      key={q.id}
                      q={q}
                      idx={idx}
                      studentAnswer={submission.answers?.[q.id]}
                      sectionName={sectionMap[q.sectionId] ?? '—'}
                    />
                  )}
                />
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2.5">
                <p className="text-xs font-medium text-text-faint uppercase tracking-wide mb-1">
                  Answer Breakdown ({questions.length})
                </p>
                {questions.map((q, idx) => (
                  <QuestionCardMobile
                    key={q.id}
                    q={q}
                    idx={idx}
                    studentAnswer={submission.answers?.[q.id]}
                    sectionName={sectionMap[q.sectionId] ?? '—'}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}