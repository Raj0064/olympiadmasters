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
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
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
// ✅ Updated createStudent with cleanup on Firestore failure

export async function createStudent({ name, email, password, grade, batchId }) {
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth, email.trim().toLowerCase(), password
  );
  const uid = cred.user.uid;
  await signOut(secondaryAuth);

  try {
    await setDoc(doc(db, 'users', uid), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'student',
      grade: String(grade),
      batchId: batchId || '',
    });
  } catch (err) {
    // Auth account exists but profile failed — delete the auth user
    // to prevent a ghost account that blocks re-registration
    try { await cred.user.delete(); } catch { /* best-effort */ }
    throw err;
  }

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
export async function updateStudent(uid, data) {
  const normalized = {
    ...data,
    ...(data.grade !== undefined && { grade: String(data.grade) }),
  };
  await updateDoc(doc(db, "users", uid), normalized);
}


export async function resetStudentPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteStudent(uid) {
  // await deleteDoc(doc(db, "users", uid));
  await updateDoc(doc(db, "users", uid), { disabled: true });
}

//Enable Student
export async function enableStudent(uid) {
  await updateDoc(doc(db, "users", uid), { disabled: false });
}



export async function changeStudentPassword(
  currentUser,
  currentPassword,
  newPassword
) {
  const credential = EmailAuthProvider.credential(
    currentUser.email,
    currentPassword
  );
  await reauthenticateWithCredential(currentUser, credential); // required by Firebase before sensitive ops
  await updatePassword(currentUser, newPassword);
}

// Look up a student by email — used by bulk results import
export async function getStudentByEmail(email) {
  const q = query(
    collection(db, "users"),
    where("email", "==", email.trim().toLowerCase()),
    where("role", "==", "student")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}