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
  documentId,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { rescoreExamSubmissions } from "./submission.service";
import { safeDate } from "../utils/safeHelpers"; // ← fixed helper: null → null, not Date(0)

// ─── Helper: Sort options A → B → C → D ──────────────────────────────────────
function sortOptions(options = {}) {
  return ["A", "B", "C", "D"].reduce((acc, key) => {
    if (options[key] !== undefined) {
      acc[key] = options[key];
    }
    return acc;
  }, {});
}

// ─── Helper: Normalize a single question document ─────────────────────────────
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
  if (!sections?.length) return questions;

  const sectionOrder = {};
  sections.forEach((s, idx) => {
    sectionOrder[s.id] = idx;
  });

  return [...questions].sort((a, b) => {
    const sectionDiff =
      (sectionOrder[a.sectionId] ?? 999) - (sectionOrder[b.sectionId] ?? 999);
    if (sectionDiff !== 0) return sectionDiff;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

export async function getExamsByIds(examIds) {
  if (!examIds?.length) return [];

  // Firestore `in` operator supports max 30 values — chunk if needed
  const chunks = [];
  for (let i = 0; i < examIds.length; i += 30) {
    chunks.push(examIds.slice(i, i + 30));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, "exams"), where(documentId(), "in", chunk)))
    )
  );

  return results.flatMap((snap) =>
    snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  );
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
    googleForm: examData.googleForm
      ? {
          appsScriptUrl: examData.googleForm.appsScriptUrl || "",
          token: examData.googleForm.token || "",
          formId: examData.googleForm.formId || "",
          linked: true,
        }
      : null,
  });

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
        googleFormItemId: q.googleFormItemId || "",
        isNameField: q.isNameField || false,
        isEmailField: q.isEmailField || false,
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
/**
 * THE BUG THAT CAUSED "Exam window has closed" WITH NULL DATES:
 *
 *   Old safeDate(null) → new Date(0)  →  Jan 1, 1970
 *   Then: now > new Date(0)  →  always true  →  "Exam window has closed" ❌
 *
 * Fixed safeDate(null) → null
 *   Then: null && now > null  →  false  →  no restriction ✓
 *
 * Rule: null scheduledAt = no start restriction (open immediately)
 *       null windowEnd   = no end restriction   (open indefinitely)
 */
export function checkExamAccess(exam, userProfile) {
  const now = new Date();
  const start = safeDate(exam.scheduledAt); // null → no start restriction
  const end = safeDate(exam.windowEnd); // null → no end restriction

  if (!exam.isActive)
    return { allowed: false, reason: "This exam is not active yet." };

  // null start → skip; truthy start → enforce
  if (start && now < start)
    return {
      allowed: false,
      reason: `Exam starts at ${start.toLocaleTimeString()}.`,
    };

  // null end → skip; truthy end → enforce
  if (end && now > end)
    return { allowed: false, reason: "Exam window has closed." };

  // Coerce both sides to string — guards against number 6 vs string "6"
  if (String(exam.grade) !== String(userProfile.grade))
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

// ─── Delete: exam + all its questions ────────────────────────────────────────

// ✅ Updated deleteExam
export async function deleteExam(examId) {
  // 1. Delete questions
  const qSnap = await getDocs(
    query(collection(db, 'questions'), where('examId', '==', examId))
  );

  // 2. Delete submissions
  const sSnap = await getDocs(
    query(collection(db, 'submissions'), where('examId', '==', examId))
  );

  const batch = writeBatch(db);
  qSnap.docs.forEach((d) => batch.delete(d.ref));
  sSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  await deleteDoc(doc(db, 'exams', examId));
}

// ─── Update: exam + questions (full edit) ────────────────────────────────────
export async function updateExamFull(
  examId,
  examData,
  sections,
  originalQuestionIds = []
) {
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

  // Update exam document
  await updateDoc(doc(db, "exams", examId), {
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
    googleForm: examData.googleForm
      ? {
          appsScriptUrl: examData.googleForm.appsScriptUrl || "",
          token: examData.googleForm.token || "",
          formId: examData.googleForm.formId || "",
          linked: true,
        }
      : null,
  });

  // Sync questions
  const batch = writeBatch(db);

  // Current question IDs from UI
  const currentIds = new Set(
    sectionsWithTotals
      .flatMap((s) => s.questions.map((q) => q._firestoreId))
      .filter(Boolean)
  );

  // Delete removed questions
  originalQuestionIds.forEach((qId) => {
    if (!currentIds.has(qId)) {
      batch.delete(doc(db, "questions", qId));
    }
  });

  // Update existing + add new questions
  sectionsWithTotals.forEach((section) => {
    section.questions.forEach((q, idx) => {
      const qData = {
        examId: examId,
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
        googleFormItemId: q.googleFormItemId || "",
        isNameField: q.isNameField || false,
        isEmailField: q.isEmailField || false,
      };

      if (q._firestoreId) {
        // Existing question → update
        batch.update(doc(db, "questions", q._firestoreId), qData);
      } else {
        // New question → add
        const newRef = doc(collection(db, "questions"));
        batch.set(newRef, qData);
      }
    });
  });

  await batch.commit();
  // after syncing questions...
  await rescoreExamSubmissions(examId);

  return examId;
}
