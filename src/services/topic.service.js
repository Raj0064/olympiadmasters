/**
 * topic.service.js
 * All operations for topics and subtopics.
 *
 * Schema:
 *   topics/{topicId}       → { name, grade, createdAt }
 *   subtopics/{subtopicId} → { name, topicId, grade, createdAt }
 *
 * grade is stored on both topic and subtopic (denormalized)
 * so you can filter subtopics by grade without joining through topic.
 */

// CSV
// topic,subtopic,grade
// Fractions,Adding Fractions,7
// Fractions,Dividing Fractions,7
// Algebra,Linear Equations,8

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
} from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// TOPICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a single topic.
 * @param {{ name: string, grade: string }} param
 * @returns {string} new topicId
 */
export async function createTopic({ name, grade }) {
  const ref = await addDoc(collection(db, "topics"), {
    name: name.trim(),
    grade: String(grade),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetch all topics, optionally filtered by grade.
 * @param {string} [grade]
 * @returns {Array}
 */
export async function getTopics(grade) {
  const constraints = [orderBy("name")];
  if (grade) constraints.unshift(where("grade", "==", String(grade)));

  const snap = await getDocs(query(collection(db, "topics"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single topic by id.
 * @param {string} topicId
 * @returns {object|null}
 */
export async function getTopic(topicId) {
  const snap = await getDoc(doc(db, "topics", topicId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Update a topic's name (grade should not change after creation).
 * @param {string} topicId
 * @param {{ name: string }} data
 */
export async function updateTopic(topicId, { name }) {
  await updateDoc(doc(db, "topics", topicId), { name: name.trim() });
}

/**
 * Delete a topic AND all its subtopics in one batch.
 * @param {string} topicId
 */
export async function deleteTopic(topicId) {
  const batch = writeBatch(db);

  // delete all subtopics under this topic
  const subSnap = await getDocs(
    query(collection(db, "subtopics"), where("topicId", "==", topicId))
  );
  subSnap.docs.forEach((d) => batch.delete(d.ref));

  // delete the topic itself
  batch.delete(doc(db, "topics", topicId));

  await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBTOPICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a single subtopic under a topic.
 * @param {{ name: string, topicId: string, grade: string }} param
 * @returns {string} new subtopicId
 */
export async function createSubtopic({ name, topicId, grade }) {
  const ref = await addDoc(collection(db, "subtopics"), {
    name: name.trim(),
    topicId,
    grade: String(grade),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetch subtopics for a specific topic.
 * @param {string} topicId
 * @returns {Array}
 */
export async function getSubtopics(topicId) {
  const snap = await getDocs(
    query(
      collection(db, "subtopics"),
      where("topicId", "==", topicId)
      // no orderBy("name") – we'll sort client‑side
    )
  );
  const subtopics = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Sort alphabetically by name (case‑insensitive)
  return subtopics.sort((a, b) => a.name.localeCompare(b.name));
}
/**
 * Fetch all subtopics for a grade (used in question form dropdowns).
 * @param {string} grade
 * @returns {Array}
 */
export async function getSubtopicsByGrade(grade) {
  const snap = await getDocs(
    query(
      collection(db, "subtopics"),
      where("grade", "==", String(grade)),
      orderBy("name")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Update a subtopic's name.
 * @param {string} subtopicId
 * @param {{ name: string }} data
 */
export async function updateSubtopic(subtopicId, { name }) {
  await updateDoc(doc(db, "subtopics", subtopicId), { name: name.trim() });
}

/**
 * Delete a single subtopic.
 * @param {string} subtopicId
 */
export async function deleteSubtopic(subtopicId) {
  await deleteDoc(doc(db, "subtopics", subtopicId));
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK IMPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bulk import topics and subtopics from a parsed CSV array.
 * CSV format: topic, subtopic, grade
 * e.g. "Fractions, Adding Fractions, 7"
 *
 * - Creates topic if it doesn't already exist (matched by name+grade)
 * - Creates subtopic under that topic
 * - Skips duplicates (same subtopic name under same topic)
 *
 * @param {Array<{ topic: string, subtopic: string, grade: string }>} rows
 * @returns {{ created: number, skipped: number }}
 */
export async function bulkImportTopics(rows) {
  // fetch existing topics once to avoid duplicates
  const existingTopics = await getTopics();
  const topicMap = {}; // "name__grade" → topicId
  existingTopics.forEach((t) => {
    topicMap[`${t.name.toLowerCase()}__${t.grade}`] = t.id;
  });

  // fetch existing subtopics once
  const subSnap = await getDocs(collection(db, "subtopics"));
  const existingSubs = new Set(
    subSnap.docs.map(
      (d) => `${d.data().name.toLowerCase()}__${d.data().topicId}`
    )
  );

  const batch = writeBatch(db);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const topicName = row.topic.trim();
    const subtopicName = row.subtopic.trim();
    const grade = String(row.grade).trim();

    if (!topicName || !subtopicName || !grade) {
      skipped++;
      continue;
    }

    // get or create topic
    const topicKey = `${topicName.toLowerCase()}__${grade}`;
    let topicId = topicMap[topicKey];

    if (!topicId) {
      const topicRef = doc(collection(db, "topics"));
      batch.set(topicRef, {
        name: topicName,
        grade,
        createdAt: serverTimestamp(),
      });
      topicId = topicRef.id;
      topicMap[topicKey] = topicId;
    }

    // skip if subtopic already exists under this topic
    const subKey = `${subtopicName.toLowerCase()}__${topicId}`;
    if (existingSubs.has(subKey)) {
      skipped++;
      continue;
    }

    const subRef = doc(collection(db, "subtopics"));
    batch.set(subRef, {
      name: subtopicName,
      topicId,
      grade,
      createdAt: serverTimestamp(),
    });
    existingSubs.add(subKey);
    created++;
  }

  await batch.commit();
  return { created, skipped };
}

/**
 * Assign a topic + subtopic to multiple questions at once.
 * @param {string[]} questionIds
 * @param {string}   topicId
 * @param {string}   subtopicId
 */
export async function bulkAssignTopic(questionIds, topicId, subtopicId) {
  const CHUNK_SIZE = 500;
  for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
    const chunk = questionIds.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);          // writeBatch already imported in your file
    chunk.forEach((qId) => {
      batch.update(doc(db, "questions", qId), { topicId, subtopicId });
    });
    await batch.commit();
  }
}

/**
 * Remove topic assignment from multiple questions.
 * @param {string[]} questionIds
 */
export async function bulkClearTopic(questionIds) {
  const CHUNK_SIZE = 500;
  for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
    const chunk = questionIds.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((qId) => {
      batch.update(doc(db, "questions", qId), { topicId: null, subtopicId: null });
    });
    await batch.commit();
  }
}