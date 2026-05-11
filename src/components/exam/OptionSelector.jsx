import React, { useContext, useMemo } from "react";
import { ExamContext } from "../../context/ExamContext";

const OptionSelector = () => {
  const { exam, currentQuestionId, answers, setAnswers } =
    useContext(ExamContext);

  // ✅ Memoize current question lookup
  const currentQuestion = useMemo(() => {
    return exam?.questions?.find((q) => q.id === currentQuestionId);
  }, [exam, currentQuestionId]);

  if (!currentQuestion || !currentQuestion.options) return null;

  const selectedAnswer = answers[currentQuestionId];

  const handleSelect = (key) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionId]: key,
    }));
  };

  return (
    <div
      className="mt-6 flex flex-wrap gap-3"
      role="radiogroup"
      aria-label="Answer options"
    >
      {Object.entries(currentQuestion.options).map(([key]) => {
        const isSelected = selectedAnswer === key;

        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => handleSelect(key)}
            className={`flex h-12 w-12 items-center justify-center rounded-xl
              border-2 text-sm font-bold transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-accent
              ${isSelected
                ? "bg-accent text-white border-accent shadow-md scale-105"
                : "bg-surface text-text-dark border-border hover:border-accent hover:text-accent"
              }
            `}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
};

export default OptionSelector;