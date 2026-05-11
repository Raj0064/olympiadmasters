import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { getBatches } from "../../../services/batch.service";
import { createStudent } from "../../../services/student.service";

const GRADES = ["4", "5", "6", "7", "8"];
const STAGES = { UPLOAD: "upload", PREVIEW: "preview", IMPORTING: "importing", DONE: "done" };

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase()] = String(v ?? "").trim();
  }
  return out;
}

// ─── Trigger Button ───────────────────────────────────────────────────────────
export function BulkImportStudentsButton({ onImported, className }) {
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
        ↑ Bulk Import
      </button>
      {open && (
        <BulkStudentImportModal
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
export default function BulkStudentImportModal({ onClose, onImported }) {
  const [stage, setStage] = useState(STAGES.UPLOAD);
  const [rows, setRows] = useState([]);
  const [defaultPassword, setDefaultPassword] = useState("123456");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [parseError, setParseError] = useState("");
  const fileRef = useRef();

  // ── Parse file ──────────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    setParseError("");
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!raw.length) { setParseError("Sheet is empty."); return; }

      const batches = await getBatches();
      const batchByName = Object.fromEntries(
        batches.map((b) => [b.name.trim().toLowerCase(), b.id])
      );

      const parsed = raw.map((r, i) => {
        const n = normalizeRow(r);
        const name = n.name || "";
        const email = n.email || "";
        const password = n.password || "";  
        const grade = String(n.grade || "");
        const batchName = n.batch || "";
        const batchId = batchByName[batchName.toLowerCase()] || "";

        const errors = [];
        if (!name) errors.push("Missing name");
        if (!email || !email.includes("@")) errors.push("Invalid email");
        if (password && password.length < 6) errors.push("Password too short (min 6)");
        if (!GRADES.includes(grade)) errors.push(`Invalid grade "${grade}"`);
        if (batchName && !batchId) errors.push(`Batch "${batchName}" not found`);

        return { _row: i + 2, name, email, password, grade, batchName, batchId, errors };
      });

      setRows(parsed);
      setStage(STAGES.PREVIEW);
    } catch (e) {
      setParseError("Could not parse file: " + e.message);
    }
  }

  const validRows = rows.filter((r) => r.errors.length === 0);

  // ── Import ──────────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!validRows.length || !defaultPassword) return;
    setStage(STAGES.IMPORTING);
    setProgress({ done: 0, total: validRows.length });
    const res = [];

    for (const row of validRows) {
      try {
        await createStudent({
          name: row.name,
          email: row.email,
          password: row.password || defaultPassword,
          grade: row.grade,
          batchId: row.batchId,
        });
        res.push({ ...row, status: "success" });
      } catch (e) {
        const msg =
          e.code === "auth/email-already-in-use" ? "Email already registered" :
            e.code === "auth/invalid-email" ? "Invalid email" :
              e.code === "auth/weak-password" ? "Password too weak" :
                e.message || "Failed";
        res.push({ ...row, status: "error", errorMsg: msg });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setResults(res);
    setStage(STAGES.DONE);
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const failCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/8 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text-dark">Bulk Import Students</h3>
            <p className="text-xs text-text-dark/40 mt-0.5">
              {stage === STAGES.UPLOAD && "Upload an Excel file with student data"}
              {stage === STAGES.PREVIEW && `${rows.length} rows · ${validRows.length} valid · ${rows.length - validRows.length} skipped`}
              {stage === STAGES.IMPORTING && `Creating account ${progress.done} of ${progress.total}…`}
              {stage === STAGES.DONE && `Done — ${successCount} imported${failCount ? `, ${failCount} failed` : ""}`}
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

          {/* UPLOAD stage */}
          {stage === STAGES.UPLOAD && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
                <p className="font-medium">Expected columns (any order):</p>
                <p className="font-mono tracking-wide">Name · Email · Password · Grade · Batch</p>
<p className="text-blue-600/70">Password is optional per row — falls back to the default below if blank.</p>
                <p className="text-blue-600/70">Batch is optional. Grade must be: {GRADES.join(", ")}.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
                  Default password for all imported students
                </label>
                <input
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="e.g. Welcome@123"
                />
                <p className="text-[11px] text-text-dark/35 mt-1">
                  Students can reset this after their first login.
                </p>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-black/15 rounded-xl p-10 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all"
              >
                <p className="text-3xl mb-2">📂</p>
                <p className="text-sm font-medium text-text-dark">Click to choose Excel file</p>
                <p className="text-xs text-text-dark/40 mt-1">.xlsx or .xls</p>
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

          {/* PREVIEW stage */}
          {stage === STAGES.PREVIEW && (
            <div className="space-y-3">
              {rows.some((r) => r.errors.length > 0) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {rows.filter((r) => r.errors.length).length} rows have errors and will be skipped.
                  Only <strong>{validRows.length}</strong> valid rows will be imported.
                </p>
              )}
              <div className="overflow-x-auto rounded-xl border border-black/8">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-black/8 bg-black/[0.02]">
                      {["Row", "Name", "Email", "Grade", "Batch", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-text-dark/45">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.errors.length ? "bg-red-50/60" : ""}>
                        <td className="px-3 py-2 text-text-dark/35">{r._row}</td>
                        <td className="px-3 py-2 text-text-dark font-medium">{r.name || "—"}</td>
                        <td className="px-3 py-2 text-text-dark/60">{r.email || "—"}</td>
                        <td className="px-3 py-2 text-text-dark/60">{r.grade || "—"}</td>
                        <td className="px-3 py-2 text-text-dark/60">{r.batchName || "—"}</td>
                        <td className="px-3 py-2">
                          {r.errors.length ? (
                            <span className="text-red-500">{r.errors.join(", ")}</span>
                          ) : (
                            <span className="text-emerald-600">✓ Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IMPORTING stage */}
          {stage === STAGES.IMPORTING && (
            <div className="py-12 text-center space-y-5">
              <div className="w-8 h-8 border-2 border-accent/25 border-t-accent rounded-full animate-spin mx-auto" />
              <div className="w-full max-w-xs mx-auto bg-black/8 rounded-full h-1.5">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-text-dark/50">
                Creating account {progress.done} of {progress.total}…
              </p>
            </div>
          )}

          {/* DONE stage */}
          {stage === STAGES.DONE && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{successCount}</p>
                  <p className="text-xs text-emerald-600/70 mt-1">Imported</p>
                </div>
                {failCount > 0 && (
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">{failCount}</p>
                    <p className="text-xs text-red-500/70 mt-1">Failed</p>
                  </div>
                )}
              </div>
              {failCount > 0 && (
                <div className="overflow-x-auto rounded-xl border border-black/8">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/8 bg-black/[0.02]">
                        <th className="px-3 py-2 text-left font-medium text-text-dark/45">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-text-dark/45">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {results
                        .filter((r) => r.status === "error")
                        .map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-text-dark/60">{r.email}</td>
                            <td className="px-3 py-2 text-red-500">{r.errorMsg}</td>
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
            onClick={stage === STAGES.DONE ? onClose : onClose}
            className="text-sm text-text-dark/50 hover:text-text-dark px-4 py-2 transition-colors"
          >
            {stage === STAGES.DONE ? "Close" : "Cancel"}
          </button>
          {stage === STAGES.PREVIEW && (
            <button
              onClick={handleImport}
              disabled={!validRows.length || !defaultPassword}
              className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {validRows.length} Students
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