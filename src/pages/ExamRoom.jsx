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

import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";

// ─── Wrapper ──────────────────────────────────────────────────────────────────
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
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

// ─── Full-screen spinner (replaces skeleton) ──────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent" />
        <p className="text-sm text-text-muted font-medium">Loading exam…</p>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
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
  const [isResultPublished, setIsResultPublished] = useState(false);

  const submittingRef = useRef(false);
  const timeLeftRef = useRef(timeLeft);
  const answersRef = useRef(answers);

  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const questions = exam?.questions || [];
  const totalQuestions = questions.length;
  const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === totalQuestions - 1;
  const answeredCount = questions.filter((q) => answers[q.id]).length;

  // ── Mark visited ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentQuestionId) markVisited(currentQuestionId);
  }, [currentQuestionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live result-published listener ────────────────────────────────────────
  useEffect(() => {
    if (!submitResult || !examId) return;
    if (exam?.isResultPublished) { setIsResultPublished(true); return; }

    const unsub = onSnapshot(
      doc(db, "exams", examId),
      (snap) => { if (snap.exists()) setIsResultPublished(snap.data()?.isResultPublished ?? false); },
      (err) => console.warn("[Results] onSnapshot error:", err.message)
    );
    return () => unsub();
  }, [submitResult, examId, exam?.isResultPublished]);

  // ── Submit ────────────────────────────────────────────────────────────────
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

      // Google Form mirror (non-fatal)
      if (exam.googleForm?.linked && exam.googleForm?.token) {
        const gformKey = `exam_${exam.id}_${currentUser.uid}_gformDone`;
        if (!localStorage.getItem(gformKey)) {
          retryAsync(
            () => submitToGoogleForm({
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
            .then(() => localStorage.setItem(gformKey, "1"))
            .catch((err) => console.warn("Google Form submit failed:", err.message));
        }
      }
    } catch (err) {
      console.error("Submission failed:", err.message);
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [exam, durationSeconds, isExpired, currentUser, userProfile, clearExamStorage]);

  // ── Auto-submit on expiry ─────────────────────────────────────────────────
  useEffect(() => {
    if (isExpired) handleConfirmedSubmit();
  }, [isExpired, handleConfirmedSubmit]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goPrev = () => { if (!isFirst) setCurrentQuestionId(questions[safeIndex - 1].id); };
  const goNext = () => { if (!isLast) setCurrentQuestionId(questions[safeIndex + 1].id); };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading || !exam) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-primary">Cannot Enter Exam</h2>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">{error}</p>
          <Button variant="accent" className="mt-6 w-full" onClick={() => navigate("/student")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const showOverlay = submitting || submitResult !== null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-text-dark">

      {/* ── Top Bar ── */}
      <div className="shrink-0">
        <ExamTopBar
          title={exam.title}
          formattedTime={formattedTime}
          timeLeft={timeLeft}
          onHamburgerClick={() => setMapOpen(true)}
        />
      </div>

      {/* ── Section Tabs ── */}
      <div className="shrink-0 border-b border-border bg-surface overflow-x-auto scrollbar-none">
        <SectionTabs />
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Question column ── */}
        <div className="flex min-w-0 flex-1 flex-col min-h-0">

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
              <div className="mx-auto max-w-3xl space-y-3">

                {/* Question */}
                <QuestionCard />

                {/* Options */}
                <div className="rounded-xl sm:rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5 sm:py-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-faint">
                    Select answer
                  </p>
                  <OptionSelector />
                </div>

                {/* Bottom spacer */}
                {/* <div className="h-1" /> */}

                {/* Nav */}
                <div className="border-t border-border bg-surface rounded-xl md:hidden">
                  <div className="px-3 py-2.5 sm:px-4 sm:py-3 md:px-6">
                    <div className="mx-auto max-w-3xl flex items-center gap-2 sm:gap-3">
                      <button disabled={isFirst} onClick={goPrev} className="flex-1 sm:flex-none sm:w-28 h-10 sm:h-11 px-3 sm:px-5 rounded-xl border border-border bg-surface text-text-dark text-xs sm:text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-background transition-colors cursor-pointer">
                        ← Prev
                      </button>
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <p className="text-[11px] sm:text-xs text-text-faint font-medium tabular-nums">{safeIndex + 1} / {totalQuestions}</p>
                        <div className="mt-1 w-full max-w-[100px] h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${((safeIndex + 1) / totalQuestions) * 100}%` }} />
                        </div>
                      </div>
                      {isLast ? (
                        <button onClick={() => setShowConfirmDialog(true)} className="flex-1 sm:flex-none sm:w-28 h-10 sm:h-11 px-3 sm:px-5 rounded-xl bg-accent text-white text-xs sm:text-sm font-bold hover:opacity-90 active:scale-[0.98] transition cursor-pointer">
                          Submit
                        </button>
                      ) : (
                        <button onClick={goNext} className="flex-1 sm:flex-none sm:w-28 h-10 sm:h-11 px-3 sm:px-5 rounded-xl border border-border bg-surface text-text-dark text-xs sm:text-sm font-semibold hover:bg-background transition-colors cursor-pointer">
                          Next →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-1" />
              </div>
            </div>
          </div>

          {/* ── Bottom Nav Bar ── */}
          <div className="hidden  md:block shrink-0 border-t border-border bg-surface">
            <div className="px-3 py-2.5 sm:px-4 sm:py-3 md:px-6">
              <div className="mx-auto max-w-3xl flex items-center gap-2 sm:gap-3">

                {/* Prev */}
                <button
                  disabled={isFirst}
                  onClick={goPrev}
                  className="
                    flex-1 sm:flex-none sm:w-28
                    h-10 sm:h-11 px-3 sm:px-5 rounded-xl
                    border  border-blue-500 bg-blue-100 text-text-dark
                    text-xs sm:text-sm font-semibold
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:bg-blue-200 transition-colors cursor-pointer
                  "
                >
                  ← Prev
                </button>

                {/* Progress */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p className="text-[11px] sm:text-xs text-text-faint font-medium tabular-nums">
                    {safeIndex + 1} / {totalQuestions}
                  </p>
                  <div className="mt-1 w-full max-w-[100px] h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${((safeIndex + 1) / totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Next / Submit */}
                {isLast ? (
                  <button
                    onClick={() => setShowConfirmDialog(true)}
                    className="
                      flex-1 sm:flex-none sm:w-28
                      h-10 sm:h-11 px-3 sm:px-5 rounded-xl
                      bg-accent text-white text-xs sm:text-sm font-bold
                      hover:opacity-90 active:scale-[0.98] transition cursor-pointer
                    "
                  >
                    Submit
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    className="
                      flex-1 sm:flex-none sm:w-28
                      h-10 sm:h-11 px-3 sm:px-5 rounded-xl
                      border border-blue-500 bg-blue-100 text-text-dark
                      text-xs sm:text-sm font-semibold
                      hover:bg-background transition-colors cursor-pointer
                    "
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden md:flex w-[260px] shrink-0 border-l border-border bg-surface flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <QuestionMap />
          </div>
          <div className="shrink-0 border-t border-border p-3 space-y-2.5">
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="w-full h-11 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
            >
              Submit Exam
            </button>
          </div>
        </aside>
      </div>

      {/* ── Overlays ── */}

      {/* Mobile Drawer */}
      {mapOpen && (
        <MobileDrawer
          onClose={() => setMapOpen(false)}
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
          formattedTime={formattedTime}
          onSubmit={() => {
            setMapOpen(false);
            setShowConfirmDialog(true);
          }}
        />
      )}

      {/* Confirm Dialog */}
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

      {/* Success / Submitting overlay */}
      {showOverlay && (
        <SuccessDialog
          submitting={submitting}
          submitResult={submitResult}
          examId={exam.id}
          isResultPublished={isResultPublished}
        />
      )}
    </div>
  );
}

export default ExamRoom;