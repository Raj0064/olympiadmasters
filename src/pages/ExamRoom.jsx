import { useCallback, useContext, useEffect, useRef, useState } from "react";
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
import Button from "../components/ui/Button";

// 👇 import your Firestore listener — adjust path to match your project
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";

const ExamRoom = () => (
  <ExamProvider>
    <ExamRoomContent />
  </ExamProvider>
);

// ─── Retry helper ─────────────────────────────────────────────────────────────
async function retryAsync(fn, maxAttempts = 3, baseDelayMs = 2000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 10_000);
        console.warn(
          `[GoogleForm] Attempt ${attempt}/${maxAttempts} failed — retrying in ${delay / 1000}s:`,
          err.message
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

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

  const storageKey = exam ? `exam_${examId}_${currentUser?.uid}_startedAt` : null;
  const durationSeconds = exam?.duration ? exam.duration * 60 : null;

  const { formattedTime, isExpired, timeLeft } = useTimer(durationSeconds, storageKey);

  const [mapOpen, setMapOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // ── Tracks live isResultPublished from Firestore after submission ──
  const [isResultPublished, setIsResultPublished] = useState(false);

  const submittingRef = useRef(false);

  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const currentIndex = exam?.questions?.findIndex((q) => q.id === currentQuestionId) ?? 0;

  useEffect(() => {
    if (currentQuestionId) markVisited(currentQuestionId);
  }, [currentQuestionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Live-poll isResultPublished ONLY after submission ────────────────────────
  // Starts a Firestore onSnapshot listener once submitResult is set.
  // Stops automatically when the dialog is dismissed or component unmounts.
  useEffect(() => {
    // Only start listening after exam is submitted
    if (!submitResult || !examId) return;

    // Check initial value from exam object first (might already be true)
    if (exam?.isResultPublished) {
      setIsResultPublished(true);
      return; // No need to subscribe
    }

    // Subscribe to live updates on the exam doc
    const unsub = onSnapshot(
      doc(db, "exams", examId),
      (snap) => {
        if (snap.exists()) {
          const published = snap.data()?.isResultPublished ?? false;
          setIsResultPublished(published);
        }
      },
      (err) => {
        // Non-fatal — button just won't appear
        console.warn("[Results] onSnapshot error:", err.message);
      }
    );

    // Cleanup when component unmounts or submitResult clears
    return () => unsub();
  }, [submitResult, examId, exam?.isResultPublished]);

  // ── Submit handler ────────────────────────────────────────────────────────────
  const handleConfirmedSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const currentTimeLeft = timeLeftRef.current;
      const timeTaken =
        currentTimeLeft != null && durationSeconds != null
          ? Math.max(durationSeconds - currentTimeLeft, 0)
          : durationSeconds ?? 0;

      const result = await submitExam({
        userId: currentUser.uid,
        examId: exam.id,
        batchId: userProfile.batchId,
        answers: answersRef.current,
        questions: exam.questions,
        timeTaken,
      });

      clearExamStorage();

      setSubmitResult(result);
      setSubmitting(false);

      // ── Mirror to Google Form — background, non-blocking ─────────────────
      if (exam.googleForm?.linked && exam.googleForm?.token) {
        const gformKey = `exam_${exam.id}_${currentUser.uid}_gformDone`;

        if (localStorage.getItem(gformKey)) {
          //console.log("[GoogleForm] Already submitted — skipping.");
        } else {
          retryAsync(
            () =>
              submitToGoogleForm({
                token: exam.googleForm.token,
                studentName: userProfile.name || "",
                studentEmail: userProfile.email || currentUser.email || "",
                answers: answersRef.current,
                questions: exam.questions,
                timedOut: isExpired,
              }),
            3,
            2000
          )
            .then(() => {
              localStorage.setItem(gformKey, "1");
              //console.log("[GoogleForm] Submitted and marked done.");
            })
            .catch((err) =>
              console.warn(
                "Google Form submit failed after all retries (non-fatal):",
                err.message
              )
            );
        }
      }
    } catch (err) {
      console.error("Submission failed:", err.message);
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [exam, durationSeconds, isExpired, currentUser, userProfile, clearExamStorage]);

  // ─── Auto-submit on timer expiry ─────────────────────────────────────────────
  useEffect(() => {
    if (isExpired) handleConfirmedSubmit();
  }, [isExpired, handleConfirmedSubmit]);

  // ─── Navigation ───────────────────────────────────────────────────────────────
  const handlePrev = () => {
    if (currentIndex > 0) setCurrentQuestionId(exam.questions[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (currentIndex < exam.questions.length - 1)
      setCurrentQuestionId(exam.questions[currentIndex + 1].id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-text-muted">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center">
          <h2 className="text-xl font-bold text-primary">Cannot Enter Exam</h2>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
          <Button variant="accent" className="mt-6 w-full" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const showOverlay = submitting || submitResult !== null;
  const answeredCount = exam.questions.filter((q) => answers[q.id]).length;
  const isLastQuestion = currentIndex === exam.questions.length - 1;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-text-dark">
      <ExamTopBar
        title={exam.title}
        formattedTime={formattedTime}
        timeLeft={timeLeft}
        onHamburgerClick={() => setMapOpen(true)}
      />

      <div className="hidden md:block shrink-0 border-b border-border bg-surface">
        <SectionTabs />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-3 py-3 md:px-6 md:py-5">
            <div className="mx-auto max-w-5xl space-y-4">
              <QuestionCard />
              <div className="rounded-3xl border border-border bg-surface p-4 md:p-6">
                <OptionSelector />
              </div>
            </div>
          </div>

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
                variant={isLastQuestion ? "primary" : "outline"}
                size="lg"
                onClick={() => {
                  if (isLastQuestion) setShowConfirmDialog(true);
                  else handleNext();
                }}
              >
                {isLastQuestion ? "Submit Exam" : "Next →"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="hidden w-[320px] shrink-0 border-l border-border bg-surface xl:flex xl:flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <QuestionMap />
          </div>
          <div className="border-t border-border p-5">
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={() => setShowConfirmDialog(true)}
            >
              Submit Exam
            </Button>
          </div>
        </aside>
      </div>

      {mapOpen && (
        <MobileDrawer onClose={() => setMapOpen(false)}>
          <QuestionMap />
        </MobileDrawer>
      )}

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

      {showOverlay && (
        <SuccessDialog
          submitting={submitting}
          submitResult={submitResult}
          examId={exam.id}
          isResultPublished={isResultPublished}  // 👈 live value, not exam snapshot
        />
      )}
    </div>
  );
}

export default ExamRoom;