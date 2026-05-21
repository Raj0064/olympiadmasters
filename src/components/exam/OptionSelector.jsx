import React, { useContext, useMemo } from "react";
import { ExamContext } from "../../context/ExamContext";

const OptionSelector = () => {
  const { exam, currentQuestionId, answers, setAnswers } = useContext(ExamContext);

  const currentQuestion = useMemo(
    () => exam?.questions?.find((q) => q.id === currentQuestionId),
    [exam, currentQuestionId]
  );

  if (!currentQuestion?.options) return null;

  const selectedAnswer = answers[currentQuestionId];

  const handleSelect = (key) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionId]: prev[currentQuestionId] === key ? undefined : key,
    }));
  };

  const optionKeys = Object.keys(currentQuestion.options);

  return (
    <div
      role="radiogroup"
      aria-label="Answer options"
      className="flex flex-wrap gap-3"
    >
      {optionKeys.map((key) => {
        const isSelected = selectedAnswer === key;

        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => handleSelect(key)}
            className={`
              relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center
              rounded-xl border-2 text-sm font-bold transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1
              select-none
              ${isSelected
                ? "bg-accent text-white border-accent shadow-md scale-105"
                : "bg-surface text-text-dark border-border hover:border-accent hover:text-accent hover:scale-105 active:scale-95"
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