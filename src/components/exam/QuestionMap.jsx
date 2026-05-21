import React, { useContext } from "react";
import { ExamContext } from "../../context/ExamContext";

const QuestionMap = () => {
  const {
    exam,
    answers,
    currentQuestionId,
    visitedQuestions,
    setCurrentQuestionId,
  } = useContext(ExamContext);

  const getStatus = (questionId) => {
    if (questionId === currentQuestionId) return "active";
    if (answers[questionId]) return "answered";
    if (visitedQuestions.has(questionId)) return "skipped";
    return "unseen";
  };

  const getStyle = (questionId) => {
    const status = getStatus(questionId);
    if (status === "active")
      return "bg-blue-600 text-white border-2 border-blue-600 ring-2 ring-blue-300 ring-offset-1 scale-110 shadow-md";
    if (status === "answered")
      return "bg-green-500 text-white border border-green-500 shadow-sm";
    if (status === "skipped")
      return "bg-amber-400 text-white border border-amber-400 shadow-sm";
    return "bg-white text-gray-400 border border-gray-200 hover:border-blue-300 hover:text-gray-600";
  };

  const answeredCount = (exam.questions ?? []).filter((q) => answers[q.id]).length;

  const skippedCount = (exam.questions ?? []).filter(
    (q) =>
      !answers[q.id] &&
      visitedQuestions.has(q.id) &&
      q.id !== currentQuestionId
  ).length;

  const unseenCount = (exam.questions ?? []).length - answeredCount;

  return (
    <div className="flex h-full flex-col">

      {/* Summary */}
      <div className="shrink-0 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-bold text-green-700 min-w-[34px] text-center">
            {answeredCount}
          </span>
          <span className="text-xs text-gray-600">Answered</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 min-w-[34px] text-center">
            {skippedCount}
          </span>
          <span className="text-xs text-gray-600">Skipped</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500 min-w-[34px] text-center">
            {unseenCount}
          </span>
          <span className="text-xs text-gray-600">Not Answered</span>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-3 flex flex-1 flex-col gap-4 overflow-y-auto">
        {(exam.sections ?? []).map((section) => {
          const sectionQuestions = (exam.questions ?? []).filter(
            (q) => q.sectionId === section.id
          );
          const questionIndex = (q) =>
            exam.questions.findIndex((eq) => eq.id === q.id) + 1;

          return (
            <div key={section.id} className="flex flex-col gap-2">
              {exam.sections.length > 1 && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  {section.name}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {sectionQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionId(q.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-all hover:scale-105 ${getStyle(q.id)}`}
                  >
                    {questionIndex(q)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionMap;