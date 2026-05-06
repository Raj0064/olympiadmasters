/**
 * student.service.js
 * All operations for creating and managing student accounts.
 *
 * Why secondaryAuth?
 *   createUserWithEmailAndPassword on the primary auth instance
 *   immediately signs in as the new user — logging the admin out.
 *   secondaryAuth is a separate Firebase app instance with its own
 *   auth state, so the admin session is never touched.
 *
 * Delete note:
 *   deleteStudent removes the Firestore profile only.
 *   The Firebase Auth account remains but the student cannot access
 *   the app — ProtectedRoute checks the Firestore role doc.
 */

import {
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db, auth, secondaryAuth } from "../firebase";

// ─── Create ───────────────────────────────────────────────────────────────────
/**
 * Creates a Firebase Auth account + Firestore profile for a student.
 * Admin session is never affected.
 *
 * @param {{ name, email, password, grade, batchId }} param
 * @returns {string} new student uid
 */
export async function createStudent({ name, email, password, grade, batchId }) {
  // 1. Create Auth account on secondary instance
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    email.trim().toLowerCase(),
    password
  );
  const uid = cred.user.uid;

  // 2. Sign out of secondary immediately — keeps it clean for next call
  await signOut(secondaryAuth);

  // 3. Write Firestore profile
  await setDoc(doc(db, "users", uid), {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: "student",
    grade: String(grade), // ← always store as string
    batchId: batchId || "",
  });

  return uid;
}

// ─── Read: all students ───────────────────────────────────────────────────────
/**
 * Fetches all users with role 'student', ordered by name.
 * @returns {Array}
 */
export async function getStudents() {
  const q = query(
    collection(db, "users"),
    where("role", "==", "student"),
    orderBy("name")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Read: single student ─────────────────────────────────────────────────────
/**
 * Fetches a single student profile by uid.
 * @param {string} uid
 * @returns {object|null}
 */
export async function getStudent(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Update ───────────────────────────────────────────────────────────────────
/**
 * Updates a student's Firestore profile.
 * Only pass fields you want to change.
 *
 * @param {string} uid
 * @param {{ name?, grade?, batchId? }} data
 */
export async function updateStudent(uid, data) {
  // Always normalize grade to string if present
  const normalized = {
    ...data,
    ...(data.grade !== undefined && { grade: String(data.grade) }),
  };
  await updateDoc(doc(db, "users", uid), normalized);
}

// ─── Reset Password ───────────────────────────────────────────────────────────
/**
 * Sends a Firebase password reset email to the student.
 * Uses the primary auth instance (admin is still signed in).
 *
 * @param {string} email
 */
export async function resetStudentPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
/**
 * Removes a student's Firestore profile.
 * Auth account is not deleted (requires Admin SDK / Cloud Function).
 *
 * @param {string} uid
 */
export async function deleteStudent(uid) {
  await deleteDoc(doc(db, "users", uid));
}
