import QuestionMap from "./QuestionMap";

const MobileDrawer = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-72 h-full bg-surface flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
          <span className="font-bold text-sm">Question Map</span>
          <button onClick={onClose} className="text-xl font-bold">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <QuestionMap />
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;