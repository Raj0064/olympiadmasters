import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import StatCard from "../../components/admin/StatCard";
import Button from "../../components/ui/button";

import { getExams } from "../../services/exam.service";
import {
  fetchExamSubmissions,
  rescoreExamSubmissions,
} from "../../services/submission.service";
import { getStudent } from "../../services/student.service";

export default function AdminResults() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");

  const [submissions, setSubmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Load exams
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const data = await getExams();

        setExams(data);

        if (data.length > 0) {
          setSelectedExamId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Load submissions
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedExamId) return;

    async function loadSubmissions() {
      try {
        setTableLoading(true);

        const subs = await fetchExamSubmissions(selectedExamId);

        const enriched = await Promise.all(
          subs.map(async (s) => {
            const student = await getStudent(s.userId);

            return {
              id: s.id,
              userId: s.userId,
              name: student?.name || "Student",
              score: s.score || 0,
              totalMarks: s.totalMarks || 0,
              percentage: s.percentage || 0,
              correct: s.correct || 0,
              wrong: s.wrong || 0,
              skipped: s.skipped || 0,
              timeTaken: s.timeTaken || 0,
            };
          })
        );

        enriched.sort(
          (a, b) =>
            b.score - a.score || a.timeTaken - b.timeTaken
        );

        setSubmissions(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setTableLoading(false);
      }
    }

    loadSubmissions();
  }, [selectedExamId]);

  // ─────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (submissions.length === 0) {
      return {
        avg: 0,
        high: 0,
        low: 0,
      };
    }

    const percentages = submissions.map((s) => s.percentage);

    return {
      avg: Math.round(
        percentages.reduce((a, b) => a + b, 0) /
        percentages.length
      ),
      high: Math.max(...percentages),
      low: Math.min(...percentages),
    };
  }, [submissions]);

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  function formatTime(seconds) {
    if (!seconds && seconds !== 0) return "—";

    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    if (m === 0) return `${s}s`;

    return `${m}m ${String(s).padStart(2, "0")}s`;
  }

  // ─────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-20 text-center">
        Loading results...
      </div>
    );
  }

  return (
    <div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-medium text-text-dark">
            Results
          </h2>

          <p className="text-sm text-text-dark/50 mt-0.5">
            View submission analytics per exam
          </p>
        </div>

        {/* Rescore */}
        {selectedExamId && (
          <Button
            variant="warning"
            size="sm"
            disabled={rescoring}
            onClick={async () => {
              try {
                setRescoring(true);

                await rescoreExamSubmissions(selectedExamId);

                const updated =
                  await fetchExamSubmissions(selectedExamId);

                setSubmissions(updated);

                alert("Results rescored successfully");
              } catch (err) {
                console.error(err);
                alert("Failed to rescore");
              } finally {
                setRescoring(false);
              }
            }}
          >
            {rescoring
              ? "Rescoring..."
              : "♻️ Rescore Results"}
          </Button>
        )}
      </div>

      {/* Exam selector */}
      <div className="bg-surface border border-black/8 rounded-xl p-4 mb-4">
        <p className="text-xs font-medium text-text-dark/45 mb-2 tracking-wide">
          Select Exam
        </p>

        <select
          value={selectedExamId}
          onChange={(e) =>
            setSelectedExamId(e.target.value)
          }
          className="w-full text-sm border border-black/10 rounded-lg px-3 py-2 bg-background text-text-dark outline-none focus:border-accent"
        >
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.title}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Submitted"
          value={submissions.length}
        />

        <StatCard
          label="Average"
          value={`${stats.avg}%`}
        />

        <StatCard
          label="Highest"
          value={`${stats.high}%`}
        />

        <StatCard
          label="Lowest"
          value={`${stats.low}%`}
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-black/8 rounded-xl p-4">
        <p className="text-sm font-medium text-text-dark mb-3">
          Submissions
        </p>

        {tableLoading ? (
          <div className="py-10 text-center text-sm text-text-muted">
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted">
            No submissions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-black/8">
                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">
                    Student
                  </th>

                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">
                    Score
                  </th>

                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">
                    %
                  </th>

                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">
                    Correct
                  </th>

                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">
                    Wrong
                  </th>

                  <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">
                    Time
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody className="divide-y divide-black/6">
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 font-medium text-text-dark">
                      {s.name}
                    </td>

                    <td className="py-3 font-medium text-text-dark">
                      {s.score}/{s.totalMarks}
                    </td>

                    <td className="py-3">
                      <span
                        className={`text-xs font-semibold ${s.percentage >= 75
                            ? "text-green-600"
                            : s.percentage >= 50
                              ? "text-yellow-600"
                              : "text-red-500"
                          }`}
                      >
                        {s.percentage.toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 text-green-700">
                      {s.correct}
                    </td>

                    <td className="py-3 text-red-500">
                      {s.wrong}
                    </td>

                    <td className="py-3 text-text-dark/50">
                      {formatTime(s.timeTaken)}
                    </td>

                    <td className="py-3">
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/exams/${selectedExamId}/submissions/${s.id}`
                          )
                        }
                        className="text-[12px] text-accent hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}