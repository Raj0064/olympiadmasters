import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { getStudentByEmail } from "../../../services/student.service";
import { importSubmission } from "../../../services/submission.service";
import { getExamQuestions } from "../../../services/exam.service";

const STAGES = {
  UPLOAD: "upload",
  PREVIEW: "preview",
  IMPORTING: "importing",
  DONE: "done",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Reverse-map option text → "A"/"B"/"C"/"D"
function matchAnswer(question, answerText) {
  if (!answerText?.trim()) return null;
  const clean = answerText.trim().toUpperCase();

  // Direct key match — Google Form exports A/B/C/D as-is
  if (/^[ABCD]$/.test(clean)) return clean;

  // Fallback: match against option text (for other form setups)
  for (const [key, val] of Object.entries(question.options || {})) {
    if (String(val).trim().toLowerCase() === answerText.trim().toLowerCase())
      return key;
  }
  return null;
}

// Parse Google Form sheet rows into structured data
function parseGoogleFormRows(rawRows, questions) {
  if (!rawRows.length) return [];

  const headers = Object.keys(rawRows[0]);

  // Identify metadata columns to skip
  const META = new Set(
    headers.filter((h) => {
      const l = h.toLowerCase();
      return (
        l.includes("timestamp") ||
        l.includes("email") ||
        l === "score" ||
        l.includes("/ ") || // "10 / 20" style score headers
        l === "name" ||
        (l.includes("name") && !l.match(/^\d/)) // skip name unless it starts with a number
      );
    })
  );

  // Email and timestamp columns
  const emailCol = headers.find((h) => h.toLowerCase().includes("email"));
  const timestampCol = headers.find((h) => h.toLowerCase().includes("timestamp"));

  // Question columns = everything that's not metadata, in order
  const questionCols = headers.filter((h) => !META.has(h));

  return rawRows.map((row, i) => {
    const email = String(row[emailCol] ?? "").trim().toLowerCase();

    const answers = {};
    let matched = 0;
    let unmatched = 0;

    questionCols.forEach((col, qi) => {
      const question = questions[qi];
      if (!question) return;
      const answerText = String(row[col] ?? "").trim();
      if (!answerText) return;
      const key = matchAnswer(question, answerText);
      if (key) {
        answers[question.id] = key;
        matched++;
      } else {
        unmatched++;
      }
    });

    return {
      _row: i + 2,
      email,
      answers,
      matched,
      unmatched,
      totalQuestionCols: questionCols.length,
      submittedAt: row[timestampCol] ? new Date(row[timestampCol]) : null,
    };
  });
}

// ─── Trigger Button ───────────────────────────────────────────────────────────
export function BulkImportResultsButton({ exam, onImported, className }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ||
          "text-xs border border-black/10 text-text-dark/60 px-3.5 py-2 rounded-lg hover:bg-black/5 transition-colors"
        }
      >
        ↑ Import Results
      </button>
      {open && (
        <BulkResultsImportModal
          exam={exam}
          onClose={() => setOpen(false)}
          onImported={() => {
            setOpen(false);
            onImported?.();
          }}
        />
      )}
    </>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function BulkResultsImportModal({ exam, onClose, onImported }) {
  const [stage, setStage] = useState(STAGES.UPLOAD);
  const [questions, setQuestions] = useState(exam?.questions ?? []);
  const [enrichedRows, setEnrichedRows] = useState([]);
  const [overwrite, setOverwrite] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [parseError, setParseError] = useState("");
  const fileRef = useRef();

  // ── Fetch questions on mount if not already loaded ──────────────────────────
  useEffect(() => {
    if (questions.length > 0) return;
    getExamQuestions(exam.id)
      .then((qs) => {
        if (qs?.length) setQuestions(qs);
      })
      .catch(() =>
        setParseError("Failed to load exam questions. Please close and retry.")
      );
  }, [exam.id, questions.length]);

  // ── Parse uploaded file ─────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    setParseError("");
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!raw.length) {
        setParseError("Sheet is empty.");
        return;
      }

      const rows = parseGoogleFormRows(raw, questions);

      // Resolve emails → userIds in parallel
      const uniqueEmails = [
        ...new Set(rows.map((r) => r.email).filter(Boolean)),
      ];
      const userMap = {};
      await Promise.all(
        uniqueEmails.map(async (email) => {
          const user = await getStudentByEmail(email);
          userMap[email] = user ?? null;
        })
      );

      const enriched = rows.map((row) => {
        const user = userMap[row.email];
        return {
          ...row,
          userId: user?.id ?? null,
          batchId: user?.batchId ?? "",
          userFound: !!user,
        };
      });

      setEnrichedRows(enriched);
      setStage(STAGES.PREVIEW);
    } catch (e) {
      setParseError("Could not parse file: " + e.message);
    }
  }

  const validRows = enrichedRows.filter((r) => r.userFound && r.email);
  const notFoundRows = enrichedRows.filter((r) => !r.userFound);

  // ── Run import ──────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!validRows.length) return;
    setStage(STAGES.IMPORTING);
    setProgress({ done: 0, total: validRows.length });
    const res = [];

    for (const row of validRows) {
      try {
        const result = await importSubmission({
          userId: row.userId,
          examId: exam.id,
          batchId: row.batchId,
          answers: row.answers,
          questions,
          overwrite,
          submittedAt: row.submittedAt,
        });

        res.push({
          email: row.email,
          status: result.skipped ? "skipped" : "success",
          reason: result.reason ?? null,
        });
      } catch (e) {
        res.push({ email: row.email, status: "error", reason: e.message });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setResults(res);
    setStage(STAGES.DONE);
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;
  const failCount = results.filter((r) => r.status === "error").length;

  const questionsReady = questions.length > 0;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/8 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text-dark">
              Import Results
            </h3>
            <p className="text-xs text-text-dark/40 mt-0.5">
              {stage === STAGES.UPLOAD && `${exam.title} · Google Form sheet`}
              {stage === STAGES.PREVIEW &&
                `${enrichedRows.length} rows · ${validRows.length} valid · ${notFoundRows.length} not found`}
              {stage === STAGES.IMPORTING &&
                `Importing ${progress.done} of ${progress.total}…`}
              {stage === STAGES.DONE &&
                `Done — ${successCount} saved${skippedCount ? `, ${skippedCount} skipped` : ""}${failCount ? `, ${failCount} failed` : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 text-text-dark/40 hover:text-text-dark transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── UPLOAD ── */}
          {stage === STAGES.UPLOAD && (
            <div className="space-y-4">

              {/* Loading questions */}
              {!questionsReady && (
                <div className="flex items-center gap-2 text-xs text-text-dark/40 bg-black/[0.02] border border-black/8 rounded-xl px-4 py-3">
                  <div className="w-3.5 h-3.5 border border-black/20 border-t-black/60 rounded-full animate-spin shrink-0" />
                  Loading exam questions…
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
                <p className="font-medium">Expected Google Form export format:</p>
                <p className="font-mono text-[11px] bg-white/60 rounded px-2 py-1">
                  Timestamp · Email address · Score · Name · 1. Q… · 2. Q…
                </p>
                <p className="text-blue-600/70">
                  Students are matched by email. Answers are matched by option
                  text or A/B/C/D key. Original submission timestamps will be preserved.
                </p>
              </div>

              <div className="flex items-center justify-between bg-black/[0.02] border border-black/8 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-text-dark">
                    Overwrite existing submissions
                  </p>
                  <p className="text-[11px] text-text-dark/40 mt-0.5">
                    If off, students who already submitted are skipped
                  </p>
                </div>
                <button
                  onClick={() => setOverwrite((p) => !p)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${overwrite ? "bg-accent" : "bg-black/15"
                    }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${overwrite ? "left-5" : "left-0.5"
                      }`}
                  />
                </button>
              </div>

              {/* Drop zone — disabled until questions are loaded */}
              <div
                onClick={() => questionsReady && fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${questionsReady
                  ? "border-black/15 cursor-pointer hover:border-accent hover:bg-accent/5"
                  : "border-black/8 opacity-40 cursor-not-allowed"
                  }`}
              >
                <p className="text-3xl mb-2">📊</p>
                <p className="text-sm font-medium text-text-dark">
                  {questionsReady
                    ? "Click to choose Excel file"
                    : "Waiting for questions to load…"}
                </p>
                <p className="text-xs text-text-dark/40 mt-1">
                  .xlsx or .xls exported from Google Sheets
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />

              {parseError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {parseError}
                </p>
              )}
            </div>
          )}

          {/* ── PREVIEW ── */}
          {stage === STAGES.PREVIEW && (
            <div className="space-y-3">
              {notFoundRows.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                  <p className="font-medium mb-1">
                    {notFoundRows.length} email
                    {notFoundRows.length > 1 ? "s" : ""} not found and will be
                    skipped:
                  </p>
                  <p className="text-amber-600/80 break-all">
                    {notFoundRows.map((r) => r.email).join(", ")}
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-black/8">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-black/8 bg-black/[0.02]">
                      {["Row", "Email", "Answers matched", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-medium text-text-dark/45"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {enrichedRows.map((r, i) => (
                      <tr
                        key={i}
                        className={!r.userFound ? "bg-amber-50/40" : ""}
                      >
                        <td className="px-3 py-2 text-text-dark/35">
                          {r._row}
                        </td>
                        <td className="px-3 py-2 text-text-dark/70">
                          {r.email || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              r.unmatched > 0
                                ? "text-amber-600"
                                : "text-text-dark/60"
                            }
                          >
                            {r.matched} / {r.totalQuestionCols}
                            {r.unmatched > 0 && ` (${r.unmatched} unmatched)`}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {r.userFound ? (
                            <span className="text-emerald-600">✓ Ready</span>
                          ) : (
                            <span className="text-amber-600">
                              Email not found
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {enrichedRows.some((r) => r.unmatched > 0) && (
                <p className="text-[11px] text-text-dark/40">
                  Unmatched answers happen when option text in the sheet doesn't
                  exactly match the exam. Those answers will be skipped.
                </p>
              )}
            </div>
          )}

          {/* ── IMPORTING ── */}
          {stage === STAGES.IMPORTING && (
            <div className="py-12 text-center space-y-5">
              <div className="w-8 h-8 border-2 border-accent/25 border-t-accent rounded-full animate-spin mx-auto" />
              <div className="w-full max-w-xs mx-auto bg-black/8 rounded-full h-1.5">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm text-text-dark/50">
                Saving submission {progress.done} of {progress.total}…
              </p>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === STAGES.DONE && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">
                    {successCount}
                  </p>
                  <p className="text-xs text-emerald-600/70 mt-1">Saved</p>
                </div>
                {skippedCount > 0 && (
                  <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-gray-400">
                      {skippedCount}
                    </p>
                    <p className="text-xs text-gray-400/70 mt-1">Skipped</p>
                  </div>
                )}
                {failCount > 0 && (
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">
                      {failCount}
                    </p>
                    <p className="text-xs text-red-500/70 mt-1">Failed</p>
                  </div>
                )}
              </div>

              {(failCount > 0 || skippedCount > 0) && (
                <div className="overflow-x-auto rounded-xl border border-black/8">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/8 bg-black/[0.02]">
                        <th className="px-3 py-2 text-left font-medium text-text-dark/45">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-text-dark/45">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-text-dark/45">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {results
                        .filter((r) => r.status !== "success")
                        .map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-text-dark/60">
                              {r.email}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  r.status === "skipped"
                                    ? "text-gray-400"
                                    : "text-red-500"
                                }
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-text-dark/40">
                              {r.reason || "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/8 p-5 shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm text-text-dark/50 hover:text-text-dark px-4 py-2 transition-colors"
          >
            {stage === STAGES.DONE ? "Close" : "Cancel"}
          </button>
          {stage === STAGES.PREVIEW && (
            <button
              onClick={handleImport}
              disabled={!validRows.length}
              className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {validRows.length} Results
            </button>
          )}
          {stage === STAGES.DONE && successCount > 0 && (
            <button
              onClick={onImported}
              className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}