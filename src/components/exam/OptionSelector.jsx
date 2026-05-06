import React, { useContext } from 'react';
import { ExamContext } from '../../context/ExamContext';

const OptionSelector = () => {
  const { exam, currentQuestionId, answers, setAnswers } = useContext(ExamContext);

  const currentQuestion = exam.questions.find(q => q.id === currentQuestionId);
  if (!currentQuestion) return null;

  const selectedAnswer = answers[currentQuestionId];

  const handleSelect = (key) => {
    setAnswers(prev => ({ ...prev, [currentQuestionId]: key }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
      {Object.entries(currentQuestion.options).map(([key, val]) => (
        <button
          key={key}
          onClick={() => handleSelect(key)}
          className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm md:text-base transition
            ${selectedAnswer === key
              ? 'bg-accent text-white border-accent shadow-md'
              : 'bg-surface text-text-dark border-gray-200 hover:border-accent hover:text-accent'
            }`}
        >
          <span className="font-bold mr-3 text-inherit">{key}.</span>{val}
        </button>
      ))}
    </div>
  );
};

export default OptionSelector;