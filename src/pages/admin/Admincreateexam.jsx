import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createExam } from '../../services/exam.service';
import { assignExamToBatch, getBatches } from '../../services/batch.service';

import SectionsStep from '../../components/admin/create_exam/SectionsStep.jsx';
import ReviewStep from '../../components/admin/create_exam/ReviewStep.jsx';
import ExamDetailsStep from '../../components/admin/create_exam/Examdetailstep.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'admin_create_exam_draft';
const uid = () => Math.random().toString(36).slice(2, 9);

const blankExam = () => ({
  title: '', grade: '', batchId: '',
  duration: '', scheduledAt: '', windowEnd: '',
  tags: [], isActive: false, isResultPublished: false,
});

const blankSection = (n = 1) => ({
  id: uid(), name: `Section ${n}`, defaultMarks: 1, questions: [],
});

// ─── Draft helpers ────────────────────────────────────────────────────────────
const loadDraft = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};
const saveDraft = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { }
};
const clearDraft = () => localStorage.removeItem(STORAGE_KEY);

// ─── StepIndicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ['Exam Details', 'Sections & Questions', 'Review'];
  return (
    <div className="flex items-center flex-wrap gap-y-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                ${done ? 'bg-answered text-white' : active ? 'bg-primary text-white' : 'bg-black/8 text-text-dark/40'}`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-sm hidden sm:block ${active ? 'text-text-dark font-medium' : 'text-text-dark/40'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-px mx-2 sm:mx-3 flex-shrink-0 ${done ? 'bg-answered' : 'bg-black/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AdminCreateExam() {
  const navigate = useNavigate();
  const draft = loadDraft();

  const [step, setStep] = useState(1);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBL] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveErr] = useState('');
  const [exam, setExam] = useState(draft?.exam || blankExam());
  const [sections, setSections] = useState(draft?.sections || [blankSection(1)]);

  useEffect(() => {
    saveDraft({ exam, sections });
  }, [exam, sections]);

  useEffect(() => {
    getBatches().then(setBatches).catch(console.error).finally(() => setBL(false));
  }, []);

  function handleGFormImport(parsed) {
    setExam(p => ({
      ...p,
      title: p.title.trim() || parsed.title,
      duration: p.duration || String(parsed.duration || 60),
    }));
  }

  function handleClearDraft() {
    if (window.confirm('Clear all progress and start fresh?')) {
      clearDraft();
      setExam(blankExam());
      setSections([blankSection(1)]);
      setStep(1);
    }
  }

  const step1Valid = exam.title.trim() && exam.grade;
  const totalQ = sections.reduce((a, s) => a + s.questions.length, 0);
  const emptySections = sections.filter(s => s.questions.length === 0);
  const batchName = exam.batchId
    ? batches.find(b => b.id === exam.batchId)?.name ?? '—'
    : 'No batch assigned';

  async function handleSave(isActive) {
    if (totalQ === 0) { setSaveErr('Add at least one question before saving.'); return; }
    if (emptySections.length > 0) {
      setSaveErr(`These sections have no questions: ${emptySections.map(s => s.name).join(', ')}`);
      return;
    }
    setSaving(true); setSaveErr('');
    try {
      const { batchId, ...examPayload } = { ...exam, isActive };
      const examId = await createExam(examPayload, sections);
      if (batchId) await assignExamToBatch(batchId, examId);
      clearDraft();
      navigate('/admin/exams');
    } catch (e) {
      setSaveErr(e.message || 'Failed to save exam. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/exams')}
            className="text-sm text-text-dark/40 hover:text-text-dark transition-colors flex-shrink-0"
          >
            ← Back
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-text-dark">Create Exam</h2>
            <p className="text-sm text-text-dark/40 mt-0.5 hidden sm:block">Set up a new exam for your batch</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClearDraft}
          className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          Clear Draft
        </button>
      </div>

      <StepIndicator step={step} />

      <div className="bg-surface border border-black/8 rounded-xl p-4 sm:p-6">
        {step === 1 && (
          <ExamDetailsStep exam={exam} setExam={setExam} batches={batches} batchesLoading={batchesLoading} />
        )}
        {step === 2 && (
          <SectionsStep sections={sections} setSections={setSections} onGFormImport={handleGFormImport} />
        )}
        {step === 3 && (
          <ReviewStep exam={exam} sections={sections} batchName={batchName} />
        )}

        {saveError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-black/8 gap-3">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/admin/exams')}
            className="text-sm text-text-dark/50 hover:text-text-dark px-4 py-2 transition-colors"
          >
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          <div className="flex items-center gap-2">
            {step === 3 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="text-xs sm:text-sm border border-black/15 text-text-dark px-3 sm:px-5 py-2 rounded-lg hover:bg-black/3 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="text-xs sm:text-sm bg-primary text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save & Activate'}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={step === 1 && !step1Valid}
                onClick={() => setStep(s => s + 1)}
                className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}