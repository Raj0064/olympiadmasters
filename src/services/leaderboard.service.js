// services/leaderboard.service.js

import { getBatchExams, getBatchStudents } from "./batch.service";
import { fetchExamSubmissions } from "./submission.service";
import { getStudent } from "./student.service";

// ─── Rank helper ──────────────────────────────────────────────────────────────
// Assigns ranks to a pre-sorted array.
// isTied(prev, curr) → true means they share the same rank.
function applyRanks(sorted, isTied) {
  let rank = 1;
  return sorted.map((entry, i) => {
    if (i > 0 && !isTied(sorted[i - 1], entry)) rank = i + 1;
    return { ...entry, rank };
  });
}

// ─── Exam Leaderboard ─────────────────────────────────────────────────────────
/**
 * Builds a sorted + ranked leaderboard for a single exam.
 *
 * Sort order:
 *   1. Score (desc)
 *   2. Time taken (asc) — tiebreaker; null time treated as Infinity
 *   3. Same on both → shared rank
 *
 * @param {string} examId
 * @returns {Promise<ExamEntry[]>}
 */
export async function buildExamLeaderboard(examId) {
  const subs = await fetchExamSubmissions(examId);
  if (!subs.length) return [];

  // Fetch all student profiles in parallel
  const uids = [...new Set(subs.map((s) => s.userId))];
  const profilePairs = await Promise.all(
    uids.map(async (uid) => [uid, await getStudent(uid)])
  );
  const profiles = Object.fromEntries(profilePairs);

  const entries = subs.map((s) => ({
    userId: s.userId,
    name: profiles[s.userId]?.name ?? "Student",
    batchId: s.batchId ?? null,
    score: s.score ?? 0,
    totalMarks: s.totalMarks ?? 0,
    percentage: s.percentage ?? 0,
    timeTaken: s.timeTaken ?? null, // null = untimed / not recorded
  }));

  const sorted = entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aT = a.timeTaken ?? Infinity;
    const bT = b.timeTaken ?? Infinity;
    return aT - bT;
  });

  return applyRanks(
    sorted,
    (a, b) =>
      a.score === b.score &&
      (a.timeTaken ?? Infinity) === (b.timeTaken ?? Infinity)
  );
}

// ─── Batch Leaderboard ────────────────────────────────────────────────────────
/**
 * Builds a sorted + ranked leaderboard for a full batch,
 * aggregating across every exam assigned to that batch.
 *
 * Sort order:
 *   1. Average percentage (desc)
 *   2. Exams attempted (desc) — tiebreaker
 *   3. Average time taken (asc) — tiebreaker; null treated as Infinity
 *   4. Same on all three → shared rank
 *
 * Only students who attempted at least one exam are included.
 *
 * @param {string} batchId
 * @returns {Promise<BatchEntry[]>}
 */
export async function buildBatchLeaderboard(batchId) {
  const [exams, students] = await Promise.all([
    getBatchExams(batchId),
    getBatchStudents(batchId),
  ]);

  if (!exams.length || !students.length) return [];

  // Fetch submissions for all exams in parallel
  const allSubArrays = await Promise.all(
    exams.map((exam) => fetchExamSubmissions(exam.id))
  );

  // Group submissions by userId
  const byUser = {};
  for (const sub of allSubArrays.flat()) {
    (byUser[sub.userId] ??= []).push(sub);
  }

  // Build one entry per student (only those with ≥1 submission)
  const entries = students
    .filter((s) => byUser[s.id])
    .map((student) => {
      const subs = byUser[student.id];
      const attempted = subs.length;

      const avgPercentage =
        subs.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / attempted;

      // Avg time only from timed submissions (timeTaken > 0)
      const timedSubs = subs.filter((s) => s.timeTaken > 0);
      const avgTimeTaken =
        timedSubs.length > 0
          ? timedSubs.reduce((sum, s) => sum + s.timeTaken, 0) /
            timedSubs.length
          : null;

      return {
        userId: student.id,
        name: student.name ?? "Student",
        avgPercentage,
        examsAttempted: attempted,
        totalExams: exams.length,
        avgTimeTaken,
      };
    });

  const sorted = entries.sort((a, b) => {
    // 1. Avg % desc
    const pctDiff = b.avgPercentage - a.avgPercentage;
    if (Math.abs(pctDiff) > 0.01) return pctDiff;
    // 2. Exams attempted desc
    if (b.examsAttempted !== a.examsAttempted)
      return b.examsAttempted - a.examsAttempted;
    // 3. Avg time asc
    const aT = a.avgTimeTaken ?? Infinity;
    const bT = b.avgTimeTaken ?? Infinity;
    return aT - bT;
  });

  return applyRanks(
    sorted,
    (a, b) =>
      Math.abs(a.avgPercentage - b.avgPercentage) < 0.01 &&
      a.examsAttempted === b.examsAttempted &&
      (a.avgTimeTaken ?? Infinity) === (b.avgTimeTaken ?? Infinity)
  );
}
