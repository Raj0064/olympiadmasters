// src/services/content.service.js

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Content CRUD ─────────────────────────────────────────

/**
 * Add a new content item to a batch
 */
export async function addContent(
  batchId,
  { type, title, description, fileUrl, createdBy }
) {
  const ref = collection(db, "batches", batchId, "content");
  const docRef = await addDoc(ref, {
    type,
    title: title.trim(),
    description: description?.trim() || "",
    fileUrl: fileUrl?.trim() || null,
    createdBy: createdBy || "",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all content for a batch (optionally filter by type)
 */
export async function getBatchContent(batchId, type = null) {
  const ref = collection(db, "batches", batchId, "content");
  const q = type
    ? query(ref, where("type", "==", type), orderBy("createdAt", "desc"))
    : query(ref, orderBy("createdAt", "desc"));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single content item
 */
export async function getContent(batchId, contentId) {
  const ref = doc(db, "batches", batchId, "content", contentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Update a content item
 */
export async function updateContent(batchId, contentId, data) {
  const ref = doc(db, "batches", batchId, "content", contentId);
  await updateDoc(ref, {
    ...(data.title !== undefined && { title: data.title.trim() }),
    ...(data.description !== undefined && {
      description: data.description.trim(),
    }),
    ...(data.fileUrl !== undefined && {
      fileUrl: data.fileUrl?.trim() || null,
    }),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a content item and all its completions
 */
export async function deleteContent(batchId, contentId) {
  const batch = writeBatch(db);

  // Delete the content doc
  const contentRef = doc(db, "batches", batchId, "content", contentId);
  batch.delete(contentRef);

  // Delete all completions for this content
  const completionsSnap = await getDocs(
    query(collection(db, "completions"), where("contentId", "==", contentId))
  );
  completionsSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

// ─── Completions ──────────────────────────────────────────

/**
 * Mark homework as completed by a student
 * Uses contentId_userId as document ID to prevent duplicates
 */
// export async function markComplete(contentId, userId, batchId) {
//   const docId = `${contentId}_${userId}`;
//   const ref = doc(db, "completions", docId);

//   // Check if already completed
//   const existing = await getDoc(ref);
//   if (existing.exists()) {
//     throw new Error("Already marked as completed");
//   }

//   await updateDoc(ref, {
//     contentId,
//     userId,
//     batchId,
//     completedAt: serverTimestamp(),
//   }).catch(async () => {
//     // Doc doesn't exist yet → create it
//     const { setDoc } = await import("firebase/firestore");
//     await setDoc(ref, {
//       contentId,
//       userId,
//       batchId,
//       completedAt: serverTimestamp(),
//     });
//   });
// }


export async function markComplete(contentId, userId, batchId) {
  const docId = `${contentId}_${userId}`;
  const ref = doc(db, "completions", docId);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("Already marked as completed");
  }

  await setDoc(ref, {
    contentId,
    userId,
    batchId,
    completedAt: serverTimestamp(),
  });
}

/**
 * Check if a student has completed a specific homework
 */
export async function checkCompleted(contentId, userId) {
  const docId = `${contentId}_${userId}`;
  const ref = doc(db, "completions", docId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Get all completions for a specific homework (admin view)
 * Returns list of { userId, completedAt }
 */
export async function getContentCompletions(contentId) {
  const q = query(
    collection(db, "completions"),
    where("contentId", "==", contentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all completions for a student (student view)
 * Returns Set of completed contentIds for quick lookup
 */
export async function getStudentCompletions(userId) {
  const q = query(collection(db, "completions"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all completions for a batch's homework (admin dashboard)
 */
export async function getBatchCompletions(batchId) {
  const q = query(
    collection(db, "completions"),
    where("batchId", "==", batchId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
