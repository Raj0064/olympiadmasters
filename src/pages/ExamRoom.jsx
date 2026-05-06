import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExamContext } from '../context/ExamContext';
import ExamProvider from '../context/ExamContext';
import { useAuth } from '../context/AuthContext';
import { submitExam } from '../services/submission.service';
import useTimer from '../hooks/useTimer';

import ExamTopBar from '../components/exam/ExamTopBar';
import SectionTabs from '../components/exam/SectionTabs';
import QuestionCard from '../components/exam/QuestionCard';
import OptionSelector from '../components/exam/OptionSelector';
import QuestionMap from '../components/exam/QuestionMap';
import ConfirmDialog from '../components/exam/ConfirmDialog';
import SuccessDialog from '../components/exam/SuccessDialog';
import MobileDrawer from '../components/exam/MobileDrawer';

const ExamRoom = () => (
  <ExamProvider>
    <ExamRoomContent />
  </ExamProvider>
);

const ExamRoomContent = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { currentUser, userProfile } = useAuth();

  const {
    exam, loading, error,
    currentQuestionId, setCurrentQuestionId,
    answers, markVisited,
    clearExamStorage,
  } = useContext(ExamContext);

  // Timer — restore from localStorage via storageKey
  const storageKey = `exam_${examId}_${currentUser?.uid}_timeLeft`;
  const { formattedTime, isExpired, timeLeft } = useTimer(3600, storageKey);

  const [mapOpen, setMapOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const currentIndex = exam?.questions?.findIndex(q => q.id === currentQuestionId) ?? 0;

  useEffect(() => {
    if (currentQuestionId) markVisited(currentQuestionId);
  }, [currentQuestionId]);

  useEffect(() => {
    if (isExpired) handleConfirmedSubmit();
  }, [isExpired]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading exam...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl shadow-md p-8 max-w-md w-full text-center flex flex-col gap-4">
        <h2 className="text-xl font-bold text-primary">Cannot Enter Exam</h2>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  const handlePrev = () => {
    if (currentIndex > 0)
      setCurrentQuestionId(exam.questions[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (currentIndex < exam.questions.length - 1)
      setCurrentQuestionId(exam.questions[currentIndex + 1].id);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);                    // ← overlay appears here
    try {
      const result = await submitExam({
        userId: currentUser.uid,
        examId: exam.id,
        batchId: userProfile.batchId,
        answers,
        questions: exam.questions,
        timeTaken: exam.duration * 60 - timeLeft,
      });
      clearExamStorage();                   // ← wipe localStorage on success
      setSubmitResult(result);
    } catch (err) {
      console.error('Submission failed:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Show overlay as soon as submitting starts; keep it after done (submitResult set)
  const showOverlay = submitting || submitResult !== null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">

      <ExamTopBar
        title={exam.title}
        formattedTime={formattedTime}
        onHamburgerClick={() => setMapOpen(true)}
      />

      <div className="bg-primary border-t border-blue-900 shrink-0">
        <SectionTabs />
      </div>

      <div className="flex flex-row flex-1 gap-4 p-3 md:p-5 overflow-hidden">

        {/* Left */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 bg-surface rounded-2xl shadow-md p-4 md:p-8 overflow-y-auto">
            <QuestionCard />
            <OptionSelector />
          </div>
          <div className="flex justify-between items-center shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-30 hover:bg-accent transition"
            >
              ← Prev
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === exam.questions.length - 1}
              className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-30 hover:bg-accent transition"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right */}
        <div className="hidden md:flex flex-col gap-3 w-1/4">
          <div className="flex-1 bg-surface rounded-2xl shadow-md p-4 overflow-y-auto">
            <QuestionMap />
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="w-full py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition shrink-0"
          >
            Submit Exam
          </button>
        </div>

      </div>

      {/* Mobile Submit */}
      <div className="md:hidden px-4 py-3 shrink-0 bg-surface border-t border-gray-200">
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="w-full py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition"
        >
          Submit Exam
        </button>
      </div>

      {/* Overlays */}
      {mapOpen && <MobileDrawer onClose={() => setMapOpen(false)} />}

      {showConfirmDialog && (
        <ConfirmDialog
          exam={exam}
          answers={answers}
          submitting={submitting}
          onConfirm={handleConfirmedSubmit}
          onClose={() => setShowConfirmDialog(false)}
          onJumpToQuestion={(id) => {
            setCurrentQuestionId(id);
            setShowConfirmDialog(false);
          }}
        />
      )}

      {/* Submission overlay — spinner while submitting, success card after */}
      {showOverlay && (
        <SuccessDialog
          submitting={submitting}
          submitResult={submitResult}
          examId={exam.id}
        />
      )}

    </div>
  );
};

export default ExamRoom;