import { db } from "../firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

// ─── Calculate score ────────────────────────────────────────────────────
const calculateScore = (questions, answers) => {
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  questions.forEach((question) => {
    const studentAnswer = answers[question.id];

    if (!studentAnswer) {
      skipped++;
    } else if (studentAnswer === question.correctAnswer) {
      score += question.marks;
      correct++;
    } else {
      wrong++;
    }
  });

  return { score, correct, wrong, skipped };
};

// ─── Submit exam ────────────────────────────────────────────────────────
export const submitExam = async ({
  userId,
  examId,
  batchId,
  answers,
  questions,
  timeTaken, // in seconds
  totalMarks, // ← pass exam.totalMarks when calling this
}) => {
  try {
    // Step 1 — check if already submitted
    const alreadySubmitted = await checkAlreadySubmitted(userId, examId);
    if (alreadySubmitted) {
      throw new Error("You have already submitted this exam.");
    }

    // Step 2 — calculate score
    const { score, correct, wrong, skipped } = calculateScore(
      questions,
      answers
    );

    // Step 3 — calculate totalMarks fallback if not passed
    // (sums question.marks in case exam.totalMarks wasn't available)
    const resolvedTotalMarks =
      totalMarks ??
      questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 1), 0);

    // Step 4 — calculate percentage
    const percentage =
      resolvedTotalMarks > 0
        ? parseFloat(((score / resolvedTotalMarks) * 100).toFixed(1))
        : 0;

    // Step 5 — build submission object
    const submission = {
      userId,
      examId,
      batchId: batchId || "",
      answers,
      score,
      correct,
      wrong,
      skipped,
      totalQuestions: questions.length,
      totalMarks: resolvedTotalMarks, // ← fixed
      percentage, // ← new
      timeTaken: timeTaken || 0,
      submittedAt: serverTimestamp(),
    };

    // Step 6 — save to Firestore
    const docRef = await addDoc(collection(db, "submissions"), submission);

    return {
      submissionId: docRef.id,
      score,
      correct,
      wrong,
      skipped,
      totalMarks: resolvedTotalMarks,
      percentage,
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

// ─── Check if student already submitted ────────────────────────────────
export const checkAlreadySubmitted = async (userId, examId) => {
  try {
    const q = query(
      collection(db, "submissions"),
      where("userId", "==", userId),
      where("examId", "==", examId)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (err) {
    throw new Error(err.message);
  }
};

// ─── Fetch a single submission ──────────────────────────────────────────
export const fetchSubmission = async (userId, examId) => {
  try {
    const q = query(
      collection(db, "submissions"),
      where("userId", "==", userId),
      where("examId", "==", examId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() };
  } catch (err) {
    throw new Error(err.message);
  }
};

// ─── Fetch all submissions for an exam (admin use) ──────────────────────
export const fetchExamSubmissions = async (examId) => {
  try {
    const q = query(
      collection(db, "submissions"),
      where("examId", "==", examId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err) {
    throw new Error(err.message);
  }
};

// ─── Fetch all submissions for a student (admin use) ───────────────────
export const fetchStudentSubmissions = async (userId) => {
  try {
    const q = query(
      collection(db, "submissions"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err) {
    throw new Error(err.message);
  }
};
