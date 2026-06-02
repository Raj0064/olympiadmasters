import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createExam, updateExamFull, getExam, getExamQuestions } from '../../services/exam.service';
import { assignExamToBatch, getBatches } from '../../services/batch.service';

import SectionsStep from '../../components/admin/create_exam/SectionsStep.jsx';
import ReviewStep from '../../components/admin/create_exam/ReviewStep.jsx';
import ExamDetailsStep from '../../components/admin/create_exam/ExamDetailStep.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'admin_create_exam_draft';
const uid = () => Math.random().toString(36).slice(2, 9);

const blankExam = () => ({
  title: '', grade: '', batchId: '',
  duration: '', scheduledAt: '', windowEnd: '',
  tags: [], isActive: false, isResultPublished: false,
  googleForm: null,
});

const blankSection = (n = 1) => ({
  id: uid(), name: `Section ${n}`, defaultMarks: 1, questions: [],
});

// ─── Draft helpers (create mode only) ────────────────────────────────────────
const loadDraft = () => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveDraft = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { } };
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
                ${done ? 'bg-slate-600 text-white' : active ? 'bg-primary text-white' : 'bg-black/8 text-text-dark/40'}`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-sm hidden sm:block ${active ? 'text-text-dark font-medium' : 'text-text-dark/40'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-px mx-2 sm:mx-3 flex-shrink-0 ${done ? 'bg-slate-700' : 'bg-black/10'}`} />
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
  const { examId } = useParams();           // defined = edit mode
  const isEditMode = !!examId;

  const draft = !isEditMode ? loadDraft() : null;

  const [step, setStep] = useState(1);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBL] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveErr] = useState('');
  const [loadingExam, setLoadingExam] = useState(isEditMode);

  // Original question IDs from Firestore (for edit mode diff)
  const [originalQuestionIds, setOriginalQuestionIds] = useState([]);

  const [exam, setExam] = useState(draft?.exam || blankExam());
  const [sections, setSections] = useState(draft?.sections || [blankSection(1)]);

  // ── Load existing exam in edit mode ─────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        setLoadingExam(true);
        const [examData, questions] = await Promise.all([
          getExam(examId),
          getExamQuestions(examId),
        ]);

        if (!examData) { navigate('/admin/exams'); return; }

        // Store original question IDs for diff on save
        setOriginalQuestionIds(questions.map(q => q.id));

        // Map Firestore questions → sections structure
        const sectionsWithQuestions = (examData.sections || []).map(s => ({
          id: s.id,
          name: s.name,
          defaultMarks: s.defaultMarks || 1,
          questions: questions
            .filter(q => q.sectionId === s.id)
            .sort((a, b) => a.order - b.order)
            .map(q => ({
              id: uid(),          // local UI id
              _firestoreId: q.id,           // ← real Firestore doc id
              text: q.text || '',
              imageUrl: q.imageUrl || '',
              imageSize: q.imageSize || 'medium',
              imageUploading: false,
              options: q.options || { A: '', B: '', C: '', D: '' },
              correctAnswer: q.correctAnswer,
              marks: String(q.marks || s.defaultMarks || 1),
              explanation: q.explanation || '',
              explanationImageUrl: q.explanationImageUrl || '',
              explanationUploading: false,
              tags: q.tags || [],
              googleFormItemId: q.googleFormItemId || '',
              isNameField: q.isNameField || false,
              isEmailField: q.isEmailField || false,

              // ── NEW ──
              topicId: q.topicId || '',
              topicName: q.topicName || '',
              subtopicId: q.subtopicId || '',
              subtopicName: q.subtopicName || '',
            })),
        }));

        setExam({
          title: examData.title || '',
          grade: examData.grade || '',
          batchId: examData.batchId || '',
          duration: examData.duration != null ? String(examData.duration) : '',
          scheduledAt: examData.scheduledAt || '',
          windowEnd: examData.windowEnd || '',
          tags: examData.tags || [],
          isActive: examData.isActive ?? false,
          isResultPublished: examData.isResultPublished ?? false,
          googleForm: examData.googleForm || null,
        });

        setSections(sectionsWithQuestions);
      } catch (e) {
        setSaveErr('Failed to load exam: ' + e.message);
      } finally {
        setLoadingExam(false);
      }
    })();
  }, [examId, isEditMode, navigate]);

  // ── Save draft (create mode only) ───────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) saveDraft({ exam, sections });
  }, [exam, sections, isEditMode]);

  // ── Batches ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getBatches().then(setBatches).catch(console.error).finally(() => setBL(false));
  }, []);

  function handleGFormImport(parsed) {
    setExam(p => ({
      ...p,
      title: p.title.trim() || parsed.title,
      duration: p.duration || String(parsed.duration || 60),
      googleForm: parsed.googleForm || null,
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

  // ── Computed ─────────────────────────────────────────────────────────────────
  const step1Valid = exam.title.trim() && exam.grade;
  const totalQ = sections.reduce((a, s) => a + s.questions.length, 0);
  const emptySections = sections.filter(s => s.questions.length === 0);
  const batchName = exam.batchId
    ? batches.find(b => b.id === exam.batchId)?.name ?? '—'
    : 'No batch assigned';

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave(isActive) {
    if (totalQ === 0) { setSaveErr('Add at least one question before saving.'); return; }
    if (emptySections.length > 0) {
      setSaveErr(`Empty sections: ${emptySections.map(s => s.name).join(', ')}`);
      return;
    }

    setSaving(true);
    setSaveErr('');

    try {
      if (isEditMode) {
        // ── EDIT MODE ──
        await updateExamFull(examId, exam, sections, originalQuestionIds);
        navigate('/admin/exams');
      } else {
        // ── CREATE MODE ──
        const { batchId, ...examPayload } = { ...exam, isActive };
        const newExamId = await createExam(examPayload, sections);
        if (batchId) await assignExamToBatch(batchId, newExamId);
        clearDraft();
        navigate('/admin/exams');
      }
    } catch (e) {
      setSaveErr(e.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state (edit mode) ────────────────────────────────────────────────
  if (loadingExam) {
    return (
      <div className="py-20 text-center">
        <div className="w-5 h-5 border-2 border-accent/25 border-t-accent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-text-dark/30">Loading exam…</p>
      </div>
    );
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
            <h2 className="text-lg font-medium text-text-dark">
              {isEditMode ? 'Edit Exam' : 'Create Exam'}
            </h2>
            <p className="text-sm text-text-dark/40 mt-0.5 hidden sm:block">
              {isEditMode
                ? `Editing: ${exam.title || '…'}`
                : 'Set up a new exam for your batch'}
            </p>
          </div>
        </div>

        {/* Clear draft — create mode only */}
        {!isEditMode && (
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear Draft
          </button>
        )}
      </div>

      <StepIndicator step={step} />

      <div className="bg-surface border border-black/8 rounded-xl p-4 sm:p-6">

        {step === 1 && (
          <ExamDetailsStep
            exam={exam}
            setExam={setExam}
            batches={batches}
            batchesLoading={batchesLoading}
          />
        )}

        {step === 2 && (
          <SectionsStep
            sections={sections}
            setSections={setSections}
            onGFormImport={handleGFormImport}
            grade={exam.grade}   // ← ADD THIS
          />
        )}

        {step === 3 && (
          <ReviewStep
            exam={exam}
            sections={sections}
            batchName={batchName}
            isEditMode={isEditMode}
          />
        )}

        {saveError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {saveError}
          </p>
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
              isEditMode ? (
                /* Edit mode — single save button */
                <button
                  type="button"
                  onClick={() => handleSave(exam.isActive)}
                  disabled={saving}
                  className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              ) : (
                /* Create mode — draft + activate */
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
              )
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