const ExamTopBar = ({
  title,
  formattedTime,
  timeLeft,
  onHamburgerClick,
}) => {

  const isUrgent = timeLeft !== null && timeLeft <= 300;
  const isCritical = timeLeft !== null && timeLeft <= 60;

  const timerClass = isCritical
    ? "bg-red-100 text-red-600 animate-pulse"
    : isUrgent
      ? "bg-yellow-100 text-yellow-600"
      : "bg-accent/10 text-accent";

  return (
    <header className="grid h-12 shrink-0 grid-cols-3 items-center border-b border-border bg-surface px-3 md:px-5">

      {/* Left */}
      <div className="flex min-w-0 items-center gap-2">
        <button className="flex md:hidden" onClick={onHamburgerClick}>
          <svg className="h-5 w-5 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="truncate text-sm font-semibold text-text-dark md:text-[15px]">
          {title || "Exam"}
        </h1>
      </div>

      {/* Center Timer — hidden until hydrated */}
      <div className="flex justify-center">
        {timeLeft !== null && (
          <div className={`rounded-full px-4 py-1 font-mono text-sm font-bold tracking-wide transition-colors md:text-xl ${timerClass}`}>
            {formattedTime}
          </div>
        )}
      </div>

      {/* Right Spacer */}
      <div />

    </header>
  );
};

export default ExamTopBar;