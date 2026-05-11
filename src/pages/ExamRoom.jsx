import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ExamContext } from "../context/ExamContext";
import ExamProvider from "../context/ExamContext";

import { useAuth } from "../context/AuthContext";

import { submitExam } from "../services/submission.service";
import { submitToGoogleForm } from "../services/googleForm.service";

import useTimer from "../hooks/useTimer";
import ExamTopBar from "../components/exam/ExamTopBar";
import SectionTabs from "../components/exam/SectionTabs";
import QuestionCard from "../components/exam/QuestionCard";
import OptionSelector from "../components/exam/OptionSelector";
import QuestionMap from "../components/exam/QuestionMap";

import ConfirmDialog from "../components/exam/ConfirmDialog";
import SuccessDialog from "../components/exam/SuccessDialog";
import MobileDrawer from "../components/exam/MobileDrawer";

import Button from "../components/ui/button";

const ExamRoom = () => (
  <ExamProvider>
    <ExamRoomContent />
  </ExamProvider>
);

function ExamRoomContent() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { currentUser, userProfile } = useAuth();

  const {
    exam,
    loading,
    error,

    currentQuestionId,
    setCurrentQuestionId,

    answers,
    markVisited,

    clearExamStorage,
  } = useContext(ExamContext);

  const storageKey = `exam_${examId}_${currentUser?.uid}_timeLeft`;
  const durationSeconds = exam?.duration ? exam.duration * 60 : null;

  const { formattedTime, isExpired, timeLeft } = useTimer(
    durationSeconds,   // null until exam loads, then e.g. 90*60 = 5400
    storageKey
  );
  
  const [mapOpen, setMapOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const currentIndex =
    exam?.questions?.findIndex((q) => q.id === currentQuestionId) ?? 0;

  const currentQuestion =
    exam?.questions?.find((q) => q.id === currentQuestionId);

  useEffect(() => {
    if (currentQuestionId) {
      markVisited(currentQuestionId);
    }
  }, [currentQuestionId]);

  useEffect(() => {
    if (isExpired) {
      handleConfirmedSubmit();
    }
  }, [isExpired]);

  async function handleConfirmedSubmit() {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const result = await submitExam({
        userId: currentUser.uid,
        examId: exam.id,
        batchId: userProfile.batchId,
        answers,
        questions: exam.questions,
        timeTaken: exam.duration * 60 - timeLeft,
        totalMarks: exam.totalMarks,
      });

      clearExamStorage();

      setSubmitResult(result);

      if (exam.googleForm?.linked && exam.googleForm?.token) {
        submitToGoogleForm({
          token: exam.googleForm.token,
          studentName: userProfile.name || "",
          studentEmail:
            userProfile.email || currentUser.email || "",
          answers,
          questions: exam.questions,
          timedOut: isExpired || false,
        }).catch((err) =>
          console.warn("Google form submit failed:", err.message)
        );
      }
    } catch (err) {
      console.error("Submission failed:", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentQuestionId(
        exam.questions[currentIndex - 1].id
      );
    }
  };

  const handleNext = () => {
    if (currentIndex < exam.questions.length - 1) {
      setCurrentQuestionId(
        exam.questions[currentIndex + 1].id
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />

          <p className="text-sm text-text-muted">
            Loading exam...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center">
          <h2 className="text-xl font-bold text-primary">
            Cannot Enter Exam
          </h2>

          <p className="mt-2 text-sm text-text-muted">
            {error}
          </p>

          <Button
            variant="accent"
            className="mt-6 w-full"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const showOverlay =
    submitting || submitResult !== null;

  const answeredCount = exam.questions.filter(
    (q) => answers[q.id]
  ).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-text-dark">

      {/* Top */}
      <ExamTopBar
        title={exam.title}
        formattedTime={formattedTime}
        timeLeft={timeLeft}
        onHamburgerClick={() => setMapOpen(true)}
      />

      {/* Sections */}
      <div className="hidden md:block shrink-0 border-b border-border bg-surface">
        <SectionTabs />
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Question Area */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Scroll Area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 md:px-6 md:py-5">

            <div className="mx-auto max-w-5xl space-y-4">

             
              {/* Question */}
              <QuestionCard />

              {/* Options */}
              <div className="rounded-3xl border border-border bg-surface p-4 md:p-6">
                <OptionSelector />
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="shrink-0 border-t border-border bg-surface px-3 py-3 md:px-6">

            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">

              <Button
                variant="outline"
                size="lg"
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="w-1/2 md:flex-none"
              >
                ← Prev
              </Button>

              <Button
                className="w-1/2 md:flex-none"
                variant={
                  currentIndex === exam.questions.length - 1
                    ? "primary"
                    : "outline"
                }
                size="lg"
                onClick={() => {
                  if (currentIndex === exam.questions.length - 1) {
                    setShowConfirmDialog(true);
                  } else {
                    handleNext();
                  }
                }}
              >
                {currentIndex === exam.questions.length - 1
                  ? "Submit Exam"
                  : "Next →"}
              </Button>

              
            </div>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden w-[320px] shrink-0 border-l border-border bg-surface xl:flex xl:flex-col">

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <QuestionMap />
          </div>

          <div className="border-t border-border p-5">
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={() =>
                setShowConfirmDialog(true)
              }
            >
              Submit Exam
            </Button>
          </div>
        </aside>
      </div>

   
  

      {/* Mobile Drawer */}
      {mapOpen && (
        <MobileDrawer onClose={() => setMapOpen(false)}>
          <QuestionMap />
        </MobileDrawer>
      )}

      {/* Confirm */}
      {showConfirmDialog && (
        <ConfirmDialog
          exam={exam}
          answers={answers}
          submitting={submitting}
          onConfirm={handleConfirmedSubmit}
          onClose={() =>
            setShowConfirmDialog(false)
          }
          onJumpToQuestion={(id) => {
            setCurrentQuestionId(id);
            setShowConfirmDialog(false);
          }}
        />
      )}

      {/* Success */}
      {showOverlay && (
        <SuccessDialog
          submitting={submitting}
          submitResult={submitResult}
          examId={exam.id}
        />
      )}
    </div>
  );
}

export default ExamRoom;