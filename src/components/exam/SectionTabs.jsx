import React, { useContext } from "react";
import { ExamContext } from "../../context/ExamContext";

const SectionTabs = () => {
  const { exam, currentQuestionId, setCurrentQuestionId } =
    useContext(ExamContext);

  const currentQuestion = exam.questions.find(
    (q) => q.id === currentQuestionId
  );

  const activeSectionId = currentQuestion?.sectionId;

  const handleSectionClick = (sectionId) => {
    const firstQuestion = exam.questions.find(
      (q) => q.sectionId === sectionId
    );

    if (firstQuestion) {
      setCurrentQuestionId(firstQuestion.id);
    }
  };

  return (
    // Reduced top padding (pt-2 instead of pt-4) for a smaller footprint
    <div className="flex items-end gap-1 overflow-x-auto px-4 pt-2 mb-[1px]">

      {exam.sections.map((section) => {
        const isActive = activeSectionId === section.id;

        return (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            className={`
              relative whitespace-nowrap px-3 text-xs font-medium transition-all duration-200
              /* Smaller curve (rounded-t-md) for tiny tabs */
              rounded-t-md border-x border-t
              
              ${isActive
                // Active: Very small height (pt-1.5 pb-1)
                ? "bg-accent text-white border-accent pt-1.5 pb-1 z-10"
                // Inactive: Barely peeping out (pt-0.5 pb-1)
                : "bg-surface text-text-dark/70 border-border border-b-transparent hover:bg-black/5 pt-0.5 pb-1 hover:pt-1"
              }
            `}
          >
            {section.name}
          </button>
        );
      })}

    </div>
  );
};

export default SectionTabs;