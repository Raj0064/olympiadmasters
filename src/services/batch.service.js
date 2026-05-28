/**
 * batch.service.js
 * All Firestore operations for the `batches` collection.
 *
 * Firestore schema:
 *   batches/{batchId}
 *     name        string
 *     grade       string   e.g. '8'
 *     year        string   e.g. '2026'
 *     examIds     array    e.g. ["exam_001", "exam_002"]  ✅
 *     createdAt   Timestamp
 *
 * Student count is computed live by querying users where batchId == id.
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getCountFromServer,
  arrayUnion,
  arrayRemove,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createBatch({ name, grade, year }) {
  const ref = await addDoc(collection(db, "batches"), {
    name: name.trim(),
    grade,
    year,
    examIds: [], // ✅ ADDED
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Read: all batches ────────────────────────────────────────────────────────
export async function getBatches() {
  const snap = await getDocs(
    query(collection(db, "batches"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Read: batches filtered by grade ─────────────────────────────────────────
export async function getBatchesByGrade(grade) {
  const snap = await getDocs(
    query(
      collection(db, "batches"),
      where("grade", "==", grade),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Read: single batch ───────────────────────────────────────────────────────
export async function getBatch(batchId) {
  const snap = await getDoc(doc(db, "batches", batchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Read: student count for a batch ─────────────────────────────────────────
export async function getBatchStudentCount(batchId) {
  try {
    const q = query(collection(db, "users"), where("batchId", "==", batchId));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    const q = query(collection(db, "users"), where("batchId", "==", batchId));
    const snap = await getDocs(q);
    return snap.size;
  }
}

// ─── Read: students in a batch ────────────────────────────────────────────────
export async function getBatchStudents(batchId) {
  const q = query(
    collection(db, "users"),
    where("batchId", "==", batchId),
    orderBy("name")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Read: exams assigned to a batch ─────────────────────────────────────────
// ✅ CHANGED — reads from batch.examIds[] instead of querying exams collection
export async function getBatchExams(batchId) {
  const batch = await getBatch(batchId);
  if (!batch || !batch.examIds?.length) return [];

  // Fetch all exams in batch.examIds[]
  const examPromises = batch.examIds.map((examId) =>
    getDoc(doc(db, "exams", examId))
  );
  const examSnaps = await Promise.all(examPromises);

  return examSnaps
    .filter((snap) => snap.exists())
    .map((snap) => ({ id: snap.id, ...snap.data() }));
}

// ─── Assign exam to batch ─────────────────────────────────────────────────────
// ✅ ADDED
export async function assignExamToBatch(batchId, examId) {
  await updateDoc(doc(db, "batches", batchId), {
    examIds: arrayUnion(examId),
  });
}

// ─── Remove exam from batch ───────────────────────────────────────────────────
// ✅ ADDED
export async function removeExamFromBatch(batchId, examId) {
  await updateDoc(doc(db, "batches", batchId), {
    examIds: arrayRemove(examId),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateBatch(batchId, data) {
  await updateDoc(doc(db, "batches", batchId), data);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
// ✅ Updated deleteBatch
export async function deleteBatch(batchId) {
  // Clear batchId from all students in this batch
  const studentsSnap = await getDocs(
    query(collection(db, 'users'), where('batchId', '==', batchId))
  );

  const batch = writeBatch(db);
  studentsSnap.docs.forEach((d) =>
    batch.update(d.ref, { batchId: '' })
  );
  batch.delete(doc(db, 'batches', batchId));
  await batch.commit();
}

/**
 * batch.service.js — NEW ADDITIONS
 * Add these functions to your existing batch.service.js
 * (also add `where`, `orderBy` to your firebase/firestore imports if not present)
 */

// ─── Read: all students for a grade (for Add Student picker) ──────────────────
// Returns every user with role='student' and the given grade,
// so the modal can display them and you can filter out already-assigned ones client-side.
// batch.service.js

export async function getStudentsByGrade(grade) {
  try {
    // Query for BOTH string and number grade simultaneously
    const gradeAsString = String(grade);
    const gradeAsNumber = Number(grade);

    const [snapString, snapNumber] = await Promise.all([
      getDocs(query(
        collection(db, "users"),
        where("grade", "==", gradeAsString),
        where("role", "==", "student")
      )),
      getDocs(query(
        collection(db, "users"),
        where("grade", "==", gradeAsNumber),
        where("role", "==", "student")
      )),
    ]);

    // Merge both results, deduplicate by id
    const map = new Map();
    [...snapString.docs, ...snapNumber.docs].forEach((d) =>
      map.set(d.id, { id: d.id, ...d.data() })
    );

    return [...map.values()].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  } catch (e) {
    console.warn("getStudentsByGrade fallback:", e.message);

    // Fallback: fetch all users, filter client-side
    const snap = await getDocs(collection(db, "users"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => {
        return (
          String(u.grade) === String(grade) &&
          u.role === "student"
        );
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
}
// ─── Assign student to a batch ────────────────────────────────────────────────
// Sets batchId on the user document.
export async function addStudentToBatch(userId, batchId) {
  await updateDoc(doc(db, "users", userId), { batchId });
}

// ─── Remove student from batch ────────────────────────────────────────────────
// Clears batchId on the user document.
export async function removeStudentFromBatch(userId) {
  await updateDoc(doc(db, "users", userId), { batchId: null });
}
