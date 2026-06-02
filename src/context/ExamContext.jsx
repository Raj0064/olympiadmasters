import { useCallback, useContext, useEffect, useState, createContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { checkExamAccess, getFullExam } from '../services/exam.service';
import { checkAlreadySubmitted } from '../services/submission.service';

export const ExamContext = createContext();
export const useExam = () => useContext(ExamContext);

// ─── Storage key helpers ──────────────────────────────────────────────────────
const keys = (examId, uid) => ({
  answers: `exam_${examId}_${uid}_answers`,
  position: `exam_${examId}_${uid}_position`,
  visited: `exam_${examId}_${uid}_visited`,   // ← persists visited set
  timeLeft: `exam_${examId}_${uid}_timeLeft`,
  startedAt: `exam_${examId}_${uid}_startedAt`,
  gformDone: `exam_${examId}_${uid}_gformDone`,
});

const ExamProvider = ({ children }) => {
  const { examId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());

  const markVisited = useCallback((questionId) => {
    setVisitedQuestions(prev => new Set([...prev, questionId]));
  }, []);

  // ─── Persist answers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!exam || !currentUser) return;
    localStorage.setItem(keys(examId, currentUser.uid).answers, JSON.stringify(answers));
  }, [answers, exam, examId, currentUser]);

  // ─── Persist position ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!exam || !currentUser || !currentQuestionId) return;
    localStorage.setItem(keys(examId, currentUser.uid).position, currentQuestionId);
  }, [currentQuestionId, exam, examId, currentUser]);

  // ─── Persist visitedQuestions ───────────────────────────────────────────────
  useEffect(() => {
    if (!exam || !currentUser) return;
    localStorage.setItem(
      keys(examId, currentUser.uid).visited,
      JSON.stringify([...visitedQuestions])
    );
  }, [visitedQuestions, exam, examId, currentUser]);

  // ─── Clear all localStorage keys for this exam ─────────────────────────────
  const clearExamStorage = useCallback(() => {
    const k = keys(examId, currentUser.uid);
    localStorage.removeItem(k.answers);
    localStorage.removeItem(k.position);
    localStorage.removeItem(k.visited);
    localStorage.removeItem(k.timeLeft);
    localStorage.removeItem(k.startedAt);
    localStorage.removeItem(k.gformDone);
  }, [examId, currentUser]);

  // ─── Fetch Exam on Load ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);

        const fullExam = await getFullExam(examId);

        const { allowed, reason } = checkExamAccess(fullExam, userProfile);
        if (!allowed) { setError(reason); setLoading(false); return; }

        const submitted = await checkAlreadySubmitted(currentUser.uid, examId);
        if (submitted) { navigate(`/student/results/${examId}`); return; }

        if (!fullExam.questions?.length) {
          setError("This exam has no questions.");
          setLoading(false);
          return;
        }

        const k = keys(examId, currentUser.uid);

        // ── Evict stale startedAt ─────────────────────────────────────────────
        const savedStartedAt = localStorage.getItem(k.startedAt);
        if (savedStartedAt && fullExam.duration) {
          const elapsed = Math.floor((Date.now() - parseInt(savedStartedAt, 10)) / 1000);
          if (elapsed >= fullExam.duration * 60) {
            localStorage.removeItem(k.startedAt);
            localStorage.removeItem(k.gformDone);
          }
        }

        // ── Restore answers ───────────────────────────────────────────────────
        let savedAnswers = null;
        try {
          const raw = localStorage.getItem(k.answers);
          if (raw) savedAnswers = JSON.parse(raw);
        } catch {
          console.warn("[ExamContext] Corrupted saved answers — starting fresh.");
          localStorage.removeItem(k.answers);
        }
        if (savedAnswers) setAnswers(savedAnswers);

        // ── Restore visited questions ─────────────────────────────────────────
        let savedVisited = new Set();
        try {
          const raw = localStorage.getItem(k.visited);
          if (raw) savedVisited = new Set(JSON.parse(raw));
        } catch {
          console.warn("[ExamContext] Corrupted visited data — starting fresh.");
          localStorage.removeItem(k.visited);
        }

        // ── Restore position ──────────────────────────────────────────────────
        const savedPosition = localStorage.getItem(k.position);
        const validPosition =
          savedPosition && fullExam.questions.some(q => q.id === savedPosition)
            ? savedPosition
            : fullExam.questions[0].id;

        // Ensure current + first question are always in visited
        savedVisited.add(validPosition);
        savedVisited.add(fullExam.questions[0].id);

        setExam(fullExam);
        setCurrentQuestionId(validPosition);
        setVisitedQuestions(savedVisited);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (examId && userProfile) loadExam();
  }, [examId, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    exam,
    loading,
    error,
    currentQuestionId,
    setCurrentQuestionId,
    answers,
    setAnswers,
    visitedQuestions,
    markVisited,
    clearExamStorage,
  };

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
};

export default ExamProvider;