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

    if (status === "active") {
      return "bg-accent/90 text-white border border-primary shadow-sm scale-105";
    }

    if (status === "answered") {
      return "bg-success/20 text-success border border-success/40";
    }

    if (status === "skipped") {
      return "bg-warning-bg text-warning border border-warning/20";
    }

    return "bg-surface text-text-muted border border-border hover:bg-primary/5 hover:border-primary/20";
  };

  const answeredCount = exam.questions.filter((q) => answers[q.id]).length;

  const skippedCount = exam.questions.filter(
    (q) =>
      !answers[q.id] &&
      visitedQuestions.has(q.id) &&
      q.id !== currentQuestionId
  ).length;

  const unseenCount = exam.questions.length - answeredCount;

  return (
    <div className="flex h-full flex-col">

      {/* Summary */}
      <div className="shrink-0 border-b border-border pb-3">

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-success-bg px-2 py-1 text-xs font-bold text-success min-w-[34px] text-center">
            {answeredCount}
          </span>
          <span className="text-xs text-text-dark">Answered</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-md bg-warning-bg px-2 py-1 text-xs font-semibold text-warning min-w-[34px] text-center">
            {skippedCount}
          </span>
          <span className="text-xs text-text-dark">Skipped</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-md bg-text-muted/90 px-2 py-1 text-xs font-semibold text-white min-w-[34px] text-center">
            {unseenCount}
          </span>
          <span className="text-xs text-text-dark">Not Answered</span>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-3 flex flex-1 flex-col gap-4 overflow-y-auto">

        {exam.sections.map((section) => {
          const sectionQuestions = exam.questions.filter(
            (q) => q.sectionId === section.id
          );

          const questionIndex = (q) =>
            exam.questions.findIndex((eq) => eq.id === q.id) + 1;

          return (
            <div key={section.id} className="flex flex-col gap-2">

              <p className="text-[11px] font-bold uppercase tracking-widest text-text-faint">
                {section.name}
              </p>

              <div className="flex flex-wrap gap-2">

                {sectionQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionId(q.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-all hover:scale-105 ${getStyle(
                      q.id
                    )}`}
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