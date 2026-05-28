/**
 * StudentDataContext.jsx
 *
 * WHY THIS EXISTS:
 * StudentDashboard, StudentExams, and StudentPerformance all fetched the same
 * data (batch → exams → submissions) independently. Switching tabs triggered
 * a full re-fetch every time — getBatch + N individual getExam calls + getSubmissions.
 *
 * This context fetches once when the student layout mounts and shares the result
 * across all three pages. Tab switches are now instant.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { getBatch } from '../services/batch.service';
import { getExamsByIds } from '../services/exam.service'; // ← new batched function
import { fetchStudentSubmissions } from '../services/submission.service';

const StudentDataContext = createContext(null);

export const useStudentData = () => {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error('useStudentData must be used inside StudentDataProvider');
  return ctx;
};

export default function StudentDataProvider({ children }) {
  const { currentUser, userProfile } = useAuth();

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!currentUser?.uid || !userProfile) return;

    setLoading(true);
    setError(null);

    try {
      const batchId = userProfile.batchId;

      // No batch assigned — nothing to show
      if (!batchId) {
        setExams([]);
        setSubmissions([]);
        return;
      }

      // ── Fetch batch + submissions in parallel ─────────────────────────
      // Previously each page did this separately on every mount.
      const [batch, allSubs] = await Promise.all([
        getBatch(batchId).catch(() => null),
        fetchStudentSubmissions(currentUser.uid).catch(() => []),
      ]);

      if (!batch?.examIds?.length) {
        setExams([]);
        setSubmissions(allSubs || []);
        return;
      }

      // ── Batch exam fetch (single query) ───────────────────────────────
      // Previously: batch.examIds.map(id => getExam(id)) = N Firestore reads
      // Now: one `where(__name__, in, ids)` query = 1 Firestore read
      const batchExams = await getExamsByIds(batch.examIds);

      setExams(batchExams.filter(Boolean));
      setSubmissions(allSubs || []);

    } catch (err) {
      console.error('[StudentData] Load error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, userProfile?.batchId]);

  // Fetch once on mount (or when uid/batchId changes)
  useEffect(() => {
    load();
  }, [load]);

  return (
    <StudentDataContext.Provider value={{ exams, submissions, loading, error, refresh: load }}>
      {children}
    </StudentDataContext.Provider>
  );
}