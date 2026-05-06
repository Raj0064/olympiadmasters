/**
 * exam.service.js
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Helper: Sort options A,B,C,D ─────────────────────────────────────────────
function sortOptions(options = {}) {
  return ["A", "B", "C", "D"].reduce((acc, key) => {
    if (options[key] !== undefined) {
      acc[key] = options[key];
    }
    return acc;
  }, {});
}

// ─── Helper: Normalize a single question ──────────────────────────────────────
function normalizeQuestion(d) {
  const data = d.data ? d.data() : d;
  return {
    ...data,
    id: d.id ?? data.id,
    options: sortOptions(data.options),
  };
}

// ─── Helper: Sort questions by section order, then question order ─────────────
function sortQuestions(questions, sections) {
  if (!sections || sections.length === 0) return questions;

  const sectionOrder = {};
  sections.forEach((s, idx) => {
    sectionOrder[s.id] = idx;
  });

  return [...questions].sort((a, b) => {
    const sectionDiff =
      (sectionOrder[a.sectionId] ?? 999) - (sectionOrder[b.sectionId] ?? 999);
    if (sectionDiff !== 0) return sectionDiff;
    return a.order - b.order;
  });
}

// ─── Create Exam + Questions ──────────────────────────────────────────────────
export async function createExam(examData, sections) {
  // Calculate totals
  const sectionsWithTotals = sections.map((s) => {
    const sectionTotalQuestions = s.questions.length;
    const sectionTotalMarks = s.questions.reduce(
      (sum, q) =>
        sum + (parseFloat(q.marks) || parseFloat(s.defaultMarks) || 1),
      0
    );
    return {
      ...s,
      totalQuestions: sectionTotalQuestions,
      totalMarks: sectionTotalMarks,
    };
  });

  const totalQuestions = sectionsWithTotals.reduce(
    (sum, s) => sum + s.totalQuestions,
    0
  );
  const totalMarks = sectionsWithTotals.reduce(
    (sum, s) => sum + s.totalMarks,
    0
  );

  // Save exam
  const examRef = await addDoc(collection(db, "exams"), {
    title: examData.title.trim(),
    grade: examData.grade,
    duration: parseInt(examData.duration) || 0,
    scheduledAt: examData.scheduledAt || null,
    windowEnd: examData.windowEnd || null,
    tags: examData.tags || [],
    sections: sectionsWithTotals.map((s) => ({
      id: s.id,
      name: s.name,
      defaultMarks: parseFloat(s.defaultMarks) || 1,
      totalMarks: s.totalMarks,
      totalQuestions: s.totalQuestions,
    })),
    totalMarks,
    totalQuestions,
    isActive: examData.isActive ?? false,
    isResultPublished: false,
    createdAt: serverTimestamp(),
  });

  // Save questions
  const batch = writeBatch(db);
  sectionsWithTotals.forEach((section) => {
    section.questions.forEach((q, idx) => {
      const qRef = doc(collection(db, "questions"));
      batch.set(qRef, {
        examId: examRef.id,
        sectionId: section.id,
        text: q.text || "",
        imageUrl: q.imageUrl || "",
        options: sortOptions(q.options),
        correctAnswer: q.correctAnswer,
        marks: parseFloat(q.marks) || parseFloat(section.defaultMarks) || 1,
        explanation: q.explanation || "",
        explanationImageUrl: q.explanationImageUrl || "",
        tags: q.tags || [],
        order: idx,
        imageSize: q.imageSize || "medium",
      });
    });
  });
  await batch.commit();

  return examRef.id;
}

// ─── Read: all exams ──────────────────────────────────────────────────────────
export async function getExams() {
  const snap = await getDocs(
    query(collection(db, "exams"), orderBy("createdAt", "desc"))
  );
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Read: single exam by ID ──────────────────────────────────────────────────
export async function getExam(examId) {
  const snap = await getDoc(doc(db, "exams", examId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Read: questions for an exam ─────────────────────────────────────────────
export async function getExamQuestions(examId, sections = []) {
  const q = query(
    collection(db, "questions"),
    where("examId", "==", examId),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  const questions = snap.docs.map((d) => normalizeQuestion(d));
  return sortQuestions(questions, sections);
}

// ─── Read: exam + questions together ─────────────────────────────────────────
export async function getFullExam(examId) {
  const exam = await getExam(examId);
  if (!exam) throw new Error("Exam not found.");
  const questions = await getExamQuestions(examId, exam.sections);
  if (!questions.length) throw new Error("No questions found for this exam.");
  return { ...exam, questions };
}

// ─── Access Control ───────────────────────────────────────────────────────────
export function checkExamAccess(exam, userProfile) {
  const now = new Date();
  const start = exam.scheduledAt?.toDate?.() || null;
  const end = exam.windowEnd?.toDate?.() || null;

  if (!exam.isActive)
    return { allowed: false, reason: "This exam is not active yet." };

  if (start && now < start)
    return {
      allowed: false,
      reason: `Exam starts at ${start.toLocaleTimeString()}.`,
    };

  if (end && now > end)
    return { allowed: false, reason: "Exam window has closed." };

  if (exam.grade !== userProfile.grade)
    return {
      allowed: false,
      reason: "This exam is not assigned to your grade.",
    };

  return { allowed: true, reason: null };
}

// ─── Update: any exam fields ──────────────────────────────────────────────────
export async function updateExam(examId, data) {
  await updateDoc(doc(db, "exams", examId), data);
}

// ─── Toggle: isActive ─────────────────────────────────────────────────────────
export async function toggleExamActive(examId, isActive) {
  await updateDoc(doc(db, "exams", examId), { isActive });
}

// ─── Toggle: isResultPublished ────────────────────────────────────────────────
export async function toggleExamResults(examId, isResultPublished) {
  await updateDoc(doc(db, "exams", examId), { isResultPublished });
}

// ─── Delete: exam + all questions ────────────────────────────────────────────
export async function deleteExam(examId) {
  const q = query(collection(db, "questions"), where("examId", "==", examId));
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  await deleteDoc(doc(db, "exams", examId));
}
