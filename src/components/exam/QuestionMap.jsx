import React, { useContext } from 'react';
import { ExamContext } from '../../context/ExamContext';

const QuestionMap = () => {
  const { exam, answers, currentQuestionId, visitedQuestions, setCurrentQuestionId } = useContext(ExamContext);

  const getStatus = (questionId) => {
    if (questionId === currentQuestionId) return 'active';
    if (answers[questionId]) return 'answered';
    if (visitedQuestions.has(questionId)) return 'skipped';
    return 'unseen';
  };

  // Question number button colours — unchanged from original
  const getStyle = (questionId) => {
    const status = getStatus(questionId);
    if (status === 'active') return 'bg-accent text-white scale-110 shadow-md';
    if (status === 'answered') return 'bg-answered text-white';
    if (status === 'skipped') return 'bg-skipped text-black';
    return 'bg-unseen text-black border border-gray-300';
  };

  const answeredCount = exam.questions.filter(q => answers[q.id]).length;
  const skippedCount = exam.questions.filter(
    q => !answers[q.id] && visitedQuestions.has(q.id) && q.id !== currentQuestionId
  ).length;
  const unseenCount = exam.questions.length - answeredCount;

  return (
    <div className="flex flex-col h-full">

      {/* ── Summary (3 rows only) ── */}
      <div className="flex flex-col gap-2 shrink-0 pb-3 border-b border-gray-200">

        {/* Answered */}
        <div className="flex items-center gap-3">
          <span className="bg-answered text-white text-xs font-bold px-2 py-1 rounded-md min-w-[36px] text-center">
            {answeredCount}
          </span>
          <span className="text-xs font-medium text-black">Answered</span>
        </div>

        {/* Skipped / Visited not answered */}
        <div className="flex items-center gap-3">
          <span className="bg-skipped text-black text-xs font-bold px-2 py-1 rounded-md min-w-[36px] text-center">
            {skippedCount}
          </span>
          <span className="text-xs font-medium text-black">Skipped (visited)</span>
        </div>

        {/* Not seen — grey in summary, white in grid */}
        <div className="flex items-center gap-3">
          <span className="bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-md min-w-[36px] text-center">
            {unseenCount}
          </span>
          <span className="text-xs font-medium text-black">Not Answered</span>
        </div>

      </div>

      {/* ── Question grid (scrollable) ── */}
      <div className="flex flex-col gap-4 mt-3 overflow-y-auto flex-1">
        {exam.sections.map((section) => {
          const sectionQuestions = exam.questions.filter(q => q.sectionId === section.id);
          const questionIndex = (q) => exam.questions.findIndex(eq => eq.id === q.id) + 1;

          return (
            <div key={section.id} className="flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {section.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {sectionQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionId(q.id)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-transform hover:opacity-80 ${getStyle(q.id)}`}
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