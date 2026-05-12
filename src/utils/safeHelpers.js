/**
 * utils/safe.js
 *
 * Null-safe math, date, and formatting helpers.
 *
 * KEY FIX: safeDate(null) previously returned new Date(0) — Jan 1 1970.
 * Any deadline check like `now > safeDate(exam.windowEnd)` would then
 * evaluate to `now > 1970` = always true, showing "Exam window has closed"
 * even when windowEnd was intentionally set to null (= no deadline).
 *
 * safeDate now returns null for null/undefined inputs. Callers guard with
 * `if (end && now > end)` — the null propagates correctly.
 */

// ─── Numbers ──────────────────────────────────────────────────────────────────

export function safeNum(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

export function safeDivide(n, d, fallback = 0) {
  if (!d || d === 0) return fallback;
  const r = n / d;
  return isNaN(r) || !isFinite(r) ? fallback : r;
}

export function safeRound(val, fallback = 0) {
  const rounded = Math.round(val);
  return isNaN(rounded) || !isFinite(rounded) ? fallback : rounded;
}


export function formatTime(seconds) {
  const s = safeNum(seconds);
  if (s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/**
 * Converts a Firestore Timestamp, JS Date, ISO string, or number to a Date.
 *
 * Returns `null` (not new Date(0)!) when the value is:
 *   - null / undefined
 *   - a Firestore Timestamp whose .toDate() throws
 *   - any value that produces an invalid Date
 *
 * Why null and not new Date(0)?
 *   new Date(0) = Jan 1 1970. If a caller does `now > safeDate(exam.windowEnd)`
 *   and windowEnd is null, they'd get `now > 1970 = true` → false "expired" error.
 *   Returning null lets callers use the standard `if (end && now > end)` guard.
 */
export function safeDate(val) {
  // Explicit null / undefined → no date set, not an expired date
  if (val === null || val === undefined) return null;

  // Firestore Timestamp
  if (typeof val.toDate === "function") {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  // JS Date passthrough
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // ISO string or Unix ms number
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a Date for display. Returns "—" for null or invalid dates.
 * (No longer needs to check getTime() === 0 since safeDate never returns Date(0))
 */
export function formatDate(date, options) {
  if (!date) return "—"; // handles null, undefined, 0, ""
  try {
    return date.toLocaleDateString("en-IN", options);
  } catch {
    return "—";
  }
}
