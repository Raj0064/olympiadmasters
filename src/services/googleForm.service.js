const APPS_SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;

// ─── Guard: catch missing env var early ──────────────────────────────────────
function getScriptUrl() {
  if (!APPS_SCRIPT_URL) {
    throw new Error("VITE_APPSCRIPT_URL is not set. Check your .env file.");
  }
  return APPS_SCRIPT_URL;
}

// ─── Extract exam from Google Form URL ───────────────────────────────────────
export async function extractFromGoogleForm(formUrl) {
  const url =
    getScriptUrl() +
    "?action=extractAndCreate" +
    "&formUrl=" +
    encodeURIComponent(formUrl);

  const resp = await fetch(url);

  if (!resp.ok) {
    throw new Error(`Apps Script HTTP ${resp.status} ${resp.statusText}`);
  }

  const text = await resp.text();

  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    throw new Error(
      "Apps Script returned HTML instead of JSON. " +
        "This means deployment failed or the URL is wrong."
    );
  }

  const data = JSON.parse(text);

  if (data.error) {
    throw new Error(data.message || data.error);
  }

  return data;
}

// ─── Convert Firebase answers → Google Form field map ────────────────────────
function convertAnswers(firebaseAnswers, questions, studentName, studentEmail) {
  const googleAnswers = {};
  const safeQuestions = questions || [];
  const safeAnswers = firebaseAnswers || {};

  safeQuestions.forEach((q) => {
    if (!q.googleFormItemId) return;

    // Email field
    if (q.isEmailField) {
      googleAnswers[q.googleFormItemId] = studentEmail || "";
      return;
    }

    // MCQ — map selected option key → option text
    const selectedOption = safeAnswers[q.id];
    if (!selectedOption) return;

    const optionText = q.options?.[selectedOption];
    if (!optionText) return;

    googleAnswers[q.googleFormItemId] = optionText;
  });

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

  if (answeredCount === 0) {
    console.warn(
      "[GoogleForm] No answers after conversion — submitting anyway (token still sent)."
    );
  }

  const resp = await fetch(getScriptUrl(), {
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
    throw new Error(`Apps Script HTTP ${resp.status}`);
  }

  const result = await resp.json();

  if (result.error) {
    throw new Error(result.message || result.error);
  }

  return result;
}
