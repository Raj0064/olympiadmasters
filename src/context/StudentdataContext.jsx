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
 *
 * LOADING STATE CONTRACT:
 * - starts true  → skeleton shows immediately on first render
 * - setLoading(false) must be called on EVERY code path, including early returns
 * - the try/finally block handles every path inside the async work
 * - the guard return (no user/profile yet) must call setLoading(false) manually
 *   because it exits BEFORE the try/finally is set up
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { getBatch } from '../services/batch.service';
import { getExamsByIds } from '../services/exam.service';
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

  // Prevents a slow in-flight fetch from overwriting state after a newer
  // fetch has already started (e.g. uid changes mid-flight on logout/login).
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    // ── Guard: auth not ready yet ──────────────────────────────────────
    //
    // CRITICAL: this return is BEFORE the try/finally block, so finally
    // will NOT run. We must call setLoading(false) here ourselves.
    //
    // This fires on first render while AuthContext is still resolving,
    // and also if the user logs out (currentUser becomes null).
    if (!currentUser?.uid || !userProfile) {
      setLoading(false); // ← without this, the skeleton shows forever
      return;
    }

    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current = false;
    const thisLoad = {};
    abortRef.current = thisLoad;

    // Only show full-screen skeleton when we have no cached data.
    // If we're refreshing data the user can already see, keep showing
    // the current content instead of flashing back to a skeleton.
    if (exams.length === 0 && submissions.length === 0) {
      setLoading(true);
    }

    setError(null);

    try {
      const batchId = userProfile.batchId;

      // ── No batch assigned ──────────────────────────────────────────
      // Returns from inside the try block → finally WILL run and call
      // setLoading(false). No manual call needed here.
      if (!batchId) {
        setExams([]);
        setSubmissions([]);
        return;
      }

      // ── Fetch batch + submissions in parallel ──────────────────────
      const [batch, allSubs] = await Promise.all([
        getBatch(batchId).catch(() => null),
        fetchStudentSubmissions(currentUser.uid).catch(() => []),
      ]);

      if (abortRef.current !== thisLoad) return; // superseded — bail out

      if (!batch?.examIds?.length) {
        setExams([]);
        setSubmissions(allSubs || []);
        return; // finally handles setLoading(false)
      }

      // ── Batch exam fetch (single WHERE __name__ IN query) ──────────
      const batchExams = await getExamsByIds(batch.examIds);

      if (abortRef.current !== thisLoad) return; // superseded — bail out

      setExams(batchExams.filter(Boolean));
      setSubmissions(allSubs || []);

    } catch (err) {
      console.error('[StudentData] Load error:', err);
      if (abortRef.current === thisLoad) {
        setError('Failed to load data');
      }
    } finally {
      // Runs on EVERY exit path from inside the try block:
      // - normal completion
      // - early return (no batchId, no examIds)
      // - thrown exception
      // - the abort-bail returns above
      if (abortRef.current === thisLoad) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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