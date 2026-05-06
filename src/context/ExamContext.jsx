import React, { createContext, useContext, useEffect, useState } from 'react';
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
  timeLeft: `exam_${examId}_${uid}_timeLeft`,   // consumed by useTimer
});

const ExamProvider = ({ children }) => {
  const { examId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // ─── Exam Data ──────────────────────────────────────────────────────────────
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ─── Exam State ─────────────────────────────────────────────────────────────
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());

  const markVisited = (questionId) =>
    setVisitedQuestions(prev => new Set([...prev, questionId]));

  // ─── Persist answers to localStorage on every change ────────────────────────
  useEffect(() => {
    if (!exam || !currentUser) return;
    localStorage.setItem(keys(examId, currentUser.uid).answers, JSON.stringify(answers));
  }, [answers]);

  // ─── Persist position to localStorage on every change ───────────────────────
  useEffect(() => {
    if (!exam || !currentUser || !currentQuestionId) return;
    localStorage.setItem(keys(examId, currentUser.uid).position, currentQuestionId);
  }, [currentQuestionId]);

  // ─── Clear all localStorage keys for this exam ──────────────────────────────
  const clearExamStorage = () => {
    const k = keys(examId, currentUser.uid);
    localStorage.removeItem(k.answers);
    localStorage.removeItem(k.position);
    localStorage.removeItem(k.timeLeft);
  };

  // ─── Fetch Exam on Load ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);

        const fullExam = await getFullExam(examId);
        console.log(fullExam);

        const { allowed, reason } = checkExamAccess(fullExam, userProfile);
        if (!allowed) { setError(reason); setLoading(false); return; }

        const submitted = await checkAlreadySubmitted(currentUser.uid, examId);
        if (submitted) { navigate(`/results/${examId}`); return; }

        // ── Restore from localStorage if available ──
        const k = keys(examId, currentUser.uid);

        const savedAnswers = localStorage.getItem(k.answers);
        if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

        const savedPosition = localStorage.getItem(k.position);
        const validPosition = savedPosition && fullExam.questions.some(q => q.id === savedPosition)
          ? savedPosition
          : fullExam.questions[0].id;

        setExam(fullExam);
        setCurrentQuestionId(validPosition);
        setVisitedQuestions(new Set([validPosition, fullExam.questions[0].id]));

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (examId && userProfile) loadExam();
  }, [examId, userProfile]);

  // ─── Context Value ──────────────────────────────────────────────────────────
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