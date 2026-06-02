// services/submission.service.js
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getExamQuestions } from "./exam.service";

// ─── Calculate score ──────────────────────────────────────────────────────────
export function calculateScore(answers, questions) {
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  questions.forEach((question) => {
    const studentAnswer = answers[question.id];
    if (!studentAnswer) {
      skipped++;
    } else if (studentAnswer === question.correctAnswer) {
     const markVal = parseFloat(question.marks);
     score += !isNaN(markVal) ? markVal : 1;
      correct++;
    } else {
      wrong++;
    }
  });

  return { score, correct, wrong, skipped };
}

// ─── Shared score builder ─────────────────────────────────────────────────────
function buildSubmissionData({
  userId,
  examId,
  batchId,
  answers,
  questions,
  timeTaken,
}) {
  const totalMarks = questions.reduce(
    (sum, q) => sum + (!isNaN(parseFloat(q.marks)) ? parseFloat(q.marks) : 1),0
  );
  const { score, correct, wrong, skipped } = calculateScore(answers, questions);
  const percentage =
    totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(1)) : 0;

  return {
    userId,
    examId,
    batchId: batchId || "",
    answers,
    score,
    correct,
    wrong,
    skipped,
    totalQuestions: questions.length,
    totalMarks,
    percentage,
    timeTaken: timeTaken || 0,
  };
}

// ─── Submit exam (student) ────────────────────────────────────────────────────
export async function submitExam({
  userId,
  examId,
  batchId,
  answers,
  questions,
  timeTaken,
  skipDuplicateCheck = false, // ✅ NEW
}) {
  // ✅ skip the redundant Firestore query when caller already verified
  if (!skipDuplicateCheck) {
    const alreadySubmitted = await checkAlreadySubmitted(userId, examId);
    if (alreadySubmitted)
      throw new Error("You have already submitted this exam.");
  }

  const data = buildSubmissionData({
    userId,
    examId,
    batchId,
    answers,
    questions,
    timeTaken,
  });

  const docRef = await addDoc(collection(db, "submissions"), {
    ...data,
    submittedAt: serverTimestamp(),
  });

  return {
    submissionId: docRef.id,
    score: data.score,
    correct: data.correct,
    wrong: data.wrong,
    skipped: data.skipped,
    totalMarks: data.totalMarks,
    percentage: data.percentage,
  };
}

// ─── Import submission (bulk results) ────────────────────────────────────────
export async function importSubmission({
  userId,
  examId,
  batchId,
  answers,
  questions,
  overwrite,
}) {
  // Check for existing submission
  const existingQuery = query(
    collection(db, "submissions"),
    where("userId", "==", userId),
    where("examId", "==", examId)
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty && !overwrite) {
    return { skipped: true, reason: "Already submitted" };
  }

  // ── Grade using the shared helper ─────────────────────
  const data = buildSubmissionData({
    userId,
    examId,
    batchId,
    answers,
    questions,
    timeTaken: 0,
  });

  // ── Write to Firestore ─────────────────────────────────
  if (existingSnap.empty) {
    await addDoc(collection(db, "submissions"), {
      ...data,
      submittedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(existingSnap.docs[0].ref, {
      ...data,
      submittedAt: serverTimestamp(),
    });
  }

  return { skipped: false };
}

// ─── Rescore all submissions for an exam (called after exam edit) ─────────────
export async function rescoreExamSubmissions(examId) {
  const [subs, questions] = await Promise.all([
    fetchExamSubmissions(examId),
    getExamQuestions(examId),
  ]);

  if (!subs.length || !questions.length) return;

  const totalMarks = questions.reduce(
  (sum, q) => sum + (!isNaN(parseFloat(q.marks)) ? parseFloat(q.marks) : 1),
  0
  );
  const batch = writeBatch(db);

  for (const sub of subs) {
    const { score, correct, wrong, skipped } = calculateScore(
      sub.answers,
      questions
    );
    const percentage =
      totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(1)) : 0;

    batch.update(doc(db, "submissions", sub.id), {
      score,
      correct,
      wrong,
      skipped,
      totalMarks,
      totalQuestions: questions.length,
      percentage,
      rescoredAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

// ─── Check if already submitted ──────────────────────────────────────────────
export async function checkAlreadySubmitted(userId, examId) {
  const q = query(
    collection(db, "submissions"),
    where("userId", "==", userId),
    where("examId", "==", examId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Fetch single submission by userId + examId ───────────────────────────────
export async function fetchSubmission(userId, examId) {
  const q = query(
    collection(db, "submissions"),
    where("userId", "==", userId),
    where("examId", "==", examId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// ─── Fetch submission by document ID ─────────────────────────────────────────
export async function fetchSubmissionById(submissionId) {
  const snap = await getDoc(doc(db, "submissions", submissionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Fetch all submissions for an exam (admin) ────────────────────────────────
export async function fetchExamSubmissions(examId) {
  const q = query(collection(db, "submissions"), where("examId", "==", examId));
  const snap = await getDocs(q);
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Fetch all submissions for a student ─────────────────────────────────────
export async function fetchStudentSubmissions(userId) {
  const q = query(collection(db, "submissions"), where("userId", "==", userId));
  const snap = await getDocs(q);
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Delete a submission ──────────────────────────────────────────────────────
export async function deleteSubmission(submissionId) {
  await deleteDoc(doc(db, "submissions", submissionId));
}

// ─── Get submission count for an exam ────────────────────────────────────────
export async function getSubmissionCount(examId) {
  try {
    const q = query(
      collection(db, "submissions"),
      where("examId", "==", examId)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}


//  * Marks a submission as submitted to Google Form.
//  * Call this after a successful submitToGoogleForm() from the admin panel.

export async function markGFormSubmitted(submissionId) {
  await updateDoc(doc(db, "submissions", submissionId), {
    googleFormSubmitted: true,
    googleFormSubmittedAt: serverTimestamp(),
  });
}