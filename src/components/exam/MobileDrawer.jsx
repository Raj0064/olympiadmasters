import { useEffect } from "react";
import QuestionMap from "./QuestionMap";

const MobileDrawer = ({ onClose, answeredCount, totalQuestions, formattedTime, onSubmit }) => {
  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex xl:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer panel — slides in from right */}
      <div className="relative ml-auto flex h-full w-[min(320px,90vw)] flex-col bg-surface shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
          <span className="text-sm font-bold text-text-dark">Question Map</span>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-background hover:text-text-dark transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2.5">
          <span className="text-[11px] font-medium text-text-muted">
            <span className="text-accent font-bold">{answeredCount}</span>
            {" / "}{totalQuestions} answered
          </span>
          <span className="font-mono text-[11px] font-semibold text-text-faint tabular-nums">
            {formattedTime}
          </span>
        </div>

        {/* Scrollable map */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <QuestionMap onQuestionClick={onClose} />
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-border p-4">
          <button
            onClick={onSubmit}
            className="w-full h-11 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Submit Exam
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to  { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.22s cubic-bezier(0.32, 0.72, 0, 1) both;
        }
      `}</style>
    </div>
  );
};

export default MobileDrawer;