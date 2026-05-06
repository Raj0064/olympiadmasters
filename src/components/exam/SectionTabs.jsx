import React, { useState, useContext } from 'react';
import { ExamContext } from '../../context/ExamContext';

const SectionTabs = () => {
  const { exam, currentQuestionId, setCurrentQuestionId } = useContext(ExamContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentQuestion = exam.questions.find(q => q.id === currentQuestionId);
  const activeSectionId = currentQuestion?.sectionId;
  const activeSection = exam.sections.find(s => s.id === activeSectionId);

  const handleSectionClick = (sectionId) => {
    const firstQuestion = exam.questions.find(q => q.sectionId === sectionId);
    if (firstQuestion) setCurrentQuestionId(firstQuestion.id);
    setDropdownOpen(false);
  };

  return (
    <>
      {/* Desktop Tabs */}
      <div className="hidden md:flex overflow-x-auto px-6 gap-1">
        {exam.sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            className={`whitespace-nowrap px-6 py-2 text-sm font-semibold transition rounded-t-xl
              ${activeSectionId === section.id
                ? 'bg-surface text-primary border-b-4 border-accent'
                : 'text-white opacity-60 hover:opacity-100'
              }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Mobile Dropdown */}
      <div className="md:hidden relative px-3 py-2">
        <button
          onClick={() => setDropdownOpen(prev => !prev)}
          className="w-full flex items-center justify-between bg-surface text-primary font-semibold text-sm px-4 py-2 rounded-xl"
        >
          <span>{activeSection?.label}</span>
          <span>{dropdownOpen ? '▲' : '▼'}</span>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-3 right-3 bg-surface rounded-xl shadow-lg z-50 overflow-hidden mt-1">
            {exam.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold transition
                  ${activeSectionId === section.id
                    ? 'bg-accent text-white'
                    : 'text-primary hover:bg-gray-100'
                  }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default SectionTabs;