import React, { useContext, useMemo } from "react";
import { ExamContext } from "../../context/ExamContext";

const OptionSelector = () => {
  const { exam, currentQuestionId, answers, setAnswers } =
    useContext(ExamContext);

  const currentQuestion = useMemo(
    () => exam?.questions?.find((q) => q.id === currentQuestionId),
    [exam, currentQuestionId]
  );

  if (!currentQuestion?.options) return null;

  const selectedAnswer = answers[currentQuestionId];

  const handleSelect = (key) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionId]:
        prev[currentQuestionId] === key ? undefined : key,
    }));
  };

  const optionKeys = Object.keys(currentQuestion.options);

  return (
    <div
      role="radiogroup"
      aria-label="Answer options"
      className="flex flex-col gap-3 w-full"
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
              w-full flex items-start gap-2
              rounded-xl border-2 px-4 py-3
              text-left text-sm sm:text-base
              font-medium transition-all duration-150
              focus:outline-none focus:ring-2
              focus:ring-accent focus:ring-offset-1
              select-none

              ${
                isSelected
                  ? "bg-accent/10 text-accent border-accent shadow-sm"
                  : "bg-surface text-text-dark border-border hover:border-accent hover:bg-accent/5"
              }
            `}
          >
            <span className="font-bold shrink-0">
              {key}.
            </span>

            <span className="flex-1 min-w-0 whitespace-pre-wrap">
              {currentQuestion.options[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default OptionSelector;
