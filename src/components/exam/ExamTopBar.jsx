const ExamTopBar = ({ title, formattedTime, onHamburgerClick }) => {
  return (
    <div className="bg-primary text-white flex items-center justify-between px-4 md:px-8 py-3 shrink-0">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden flex flex-col gap-1 p-1"
          onClick={onHamburgerClick}
        >
          <span className="w-5 h-0.5 bg-white block"></span>
          <span className="w-5 h-0.5 bg-white block"></span>
          <span className="w-5 h-0.5 bg-white block"></span>
        </button>
        <h1 className="text-sm md:text-lg font-bold tracking-wide">{title}</h1>
      </div>
      <span className="font-mono text-xl md:text-2xl font-bold text-white bg-accent px-4 py-1 rounded-lg">
        {formattedTime}
      </span>
    </div>
  );
};

export default ExamTopBar;