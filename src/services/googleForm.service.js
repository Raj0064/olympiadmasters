const APPS_SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;

// ─── Guard: catch missing env var early ──────────────────────────────────────
function getScriptUrl() {
  if (!APPS_SCRIPT_URL) {
    throw new Error("VITE_APPSCRIPT_URL is not set. Check your .env file.");
  }
  return APPS_SCRIPT_URL;
}

// ─── Extract exam from Google Form URL ────────────────────────────────────────
export async function extractFromGoogleForm(formUrl) {
  const url =
    getScriptUrl() + // ← throws early if env missing
    "?action=extractAndCreate" +
    "&formUrl=" +
    encodeURIComponent(formUrl);

  console.log("📡 Calling:", url);

  const resp = await fetch(url);

  // ── Guard: check HTTP status before reading body ──────────────────────────
  if (!resp.ok) {
    throw new Error(`Apps Script HTTP ${resp.status} ${resp.statusText}`);
  }

  const text = await resp.text();

  console.log("📥 Response:", text.slice(0, 200));

  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    throw new Error(
      "Apps Script returned HTML instead of JSON.\n" +
        "This means deployment failed or URL is wrong.\n" +
        "Check console for details."
    );
  }

  const data = JSON.parse(text);

  if (data.error) {
    throw new Error(data.message || data.error);
  }

  return data;
}

function convertAnswers(firebaseAnswers, questions, studentName, studentEmail) {
  const googleAnswers = {};

  // ── Guard: null/undefined inputs ─────────────────────────────────────────
  const safeQuestions = questions || [];
  const safeAnswers = firebaseAnswers || {};

  console.log("[Convert] Firebase answers:", safeAnswers);
  console.log("[Convert] Total questions:", safeQuestions.length);
  console.log(
    "[Convert] Questions with googleFormItemId:",
    safeQuestions.filter((q) => q.googleFormItemId).length
  );
  console.log("[Convert] Sample question:", {
    id: safeQuestions[0]?.id,
    googleFormItemId: safeQuestions[0]?.googleFormItemId,
    options: safeQuestions[0]?.options,
  });

  safeQuestions.forEach((q) => {
    if (!q.googleFormItemId) {
      console.log("[Convert] SKIP - no googleFormItemId:", q.id);
      return;
    }

    if (q.isNameField) {
      googleAnswers[q.googleFormItemId] = studentName || "";
      console.log(
        "[Convert] Name field:",
        q.googleFormItemId,
        "→",
        studentName
      );
      return;
    }

    if (q.isEmailField) {
      googleAnswers[q.googleFormItemId] = studentEmail || "";
      console.log(
        "[Convert] Email field:",
        q.googleFormItemId,
        "→",
        studentEmail
      );
      return;
    }

    const selectedOption = safeAnswers[q.id];
    console.log(
      "[Convert] Q:",
      q.id,
      "answer:",
      selectedOption,
      "gfId:",
      q.googleFormItemId
    );

    if (!selectedOption) return;

    const optionText = q.options?.[selectedOption];
    console.log("[Convert] Option text:", optionText);

    if (!optionText) return;

    googleAnswers[q.googleFormItemId] = optionText;
  });

  console.log("[Convert] Final googleAnswers:", googleAnswers);
  return googleAnswers;
}

// ─── Submit to Google Form via Apps Script ────────────────────────────────────
export async function submitToGoogleForm({
  token,
  studentName,
  studentEmail,
  answers,
  questions,
  timedOut,
}) {
  const googleAnswers = convertAnswers(
    answers,
    questions,
    studentName,
    studentEmail
  );

  const answeredCount = Object.keys(googleAnswers).length;

  // ── Always submit — even if student skipped everything. ───────────────────
  // Name/email fields count as a valid response. A blank MCQ response
  // still needs to be recorded in the Form (token + timedOut are always sent).
  // Previous guard `if (answeredCount === 0) return` was wrong — removed.
  if (answeredCount === 0) {
    console.warn(
      "[GoogleForm] No answers after conversion — submitting anyway (name/email/token still sent)"
    );
  }

  console.log("[GoogleForm] Submitting:", {
    token,
    studentName,
    studentEmail,
    answeredCount,
    timedOut,
  });

  const resp = await fetch(getScriptUrl(), {
    // ← env guard
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      token,
      studentName: studentName || "",
      studentEmail: studentEmail || "",
      answers: googleAnswers,
      timedOut: timedOut || false,
    }),
  });

  if (!resp.ok) {
    throw new Error("Apps Script HTTP " + resp.status);
  }

  const result = await resp.json();

  if (result.error) {
    throw new Error(result.message || result.error);
  }

  console.log("[GoogleForm] Success:", result);
  return result;
}
