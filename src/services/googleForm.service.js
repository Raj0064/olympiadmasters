/**
 * googleForm.service.js
 *
 * 1. Extract exam from Google Form URL (calls Apps Script)
 * 2. Submit answers to Google Form (calls Apps Script)
 *
 * Name field handling:
 *   Google Form has "Name" as first text question.
 *   On submit, automatically fills it with student's name.
 */

const APPS_SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
  
// ─── Extract exam from Google Form URL ────────────────────────────────────────

export async function extractFromGoogleForm(formUrl) {
  const url =
    APPS_SCRIPT_URL +
    "?action=extractAndCreate" +
    "&formUrl=" +
    encodeURIComponent(formUrl);

  console.log("📡 Calling:", url);

  const resp = await fetch(url);
  const text = await resp.text();

  console.log("📥 Response:", text.slice(0, 200)); // ← Shows first 200 chars

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

  console.log("[Convert] Firebase answers:", firebaseAnswers);
  console.log("[Convert] Total questions:", questions.length);
  console.log(
    "[Convert] Questions with googleFormItemId:",
    questions.filter((q) => q.googleFormItemId).length
  );
  console.log("[Convert] Sample question:", {
    id: questions[0]?.id,
    googleFormItemId: questions[0]?.googleFormItemId,
    options: questions[0]?.options,
  });

  questions.forEach((q) => {
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

    const selectedOption = firebaseAnswers[q.id];
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
  answers, // Firebase format: { firebaseQId: "A" }
  questions, // Full question objects with googleFormItemId + options
  timedOut,
}) {
  // Convert answers + fill name/email fields
  const googleAnswers = convertAnswers(
    answers,
    questions,
    studentName,
    studentEmail
  );

  const answeredCount = Object.keys(googleAnswers).length;
  if (answeredCount === 0) {
    console.warn("[GoogleForm] No answers to submit after conversion");
    return { ok: false, reason: "no_answers", answeredCount: 0 };
  }

  console.log("[GoogleForm] Submitting:", {
    token,
    studentName,
    studentEmail,
    answeredCount,
    timedOut,
  });

  // POST to Apps Script
  const resp = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoid CORS preflight
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
