const ConfirmDialog = ({
  exam,
  answers,
  submitting,
  onConfirm,
  onClose,
  onJumpToQuestion,
}) => {
  const unattempted = exam.questions.filter(q => !answers[q.id]);
  const attempted = exam.questions.length - unattempted.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">

      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl flex flex-col gap-5">

        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-primary">
            Submit Exam?
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Review your answers before final submission
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">

          <div className="rounded-xl border border-success/20 bg-success-bg py-3">
            <p className="text-xl font-bold text-success">{attempted}</p>
            <p className="text-xs text-success font-medium">Attempted</p>
          </div>

          <div className="rounded-xl border border-danger/20 bg-danger-bg py-3">
            <p className="text-xl font-bold text-danger">{unattempted.length}</p>
            <p className="text-xs text-danger font-medium">Skipped</p>
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/10 py-3">
            <p className="text-xl font-bold text-primary">
              {exam.questions.length}
            </p>
            <p className="text-xs text-primary font-medium">Total</p>
          </div>

        </div>

        {/* Unattempted */}
        {unattempted.length > 0 && (
          <div className="rounded-xl border border-danger/20 bg-danger-bg p-3">

            <p className="text-xs font-bold uppercase tracking-wide text-danger">
              Not Attempted
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {unattempted.map(q => {
                const qIndex =
                  exam.questions.findIndex(eq => eq.id === q.id) + 1;

                return (
                  <button
                    key={q.id}
                    onClick={() => onJumpToQuestion(q.id)}
                    className="h-8 w-8 rounded-lg bg-white text-danger text-xs font-bold border border-danger/20 hover:bg-danger/10 transition"
                  >
                    {qIndex}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[11px] text-text-muted">
              Click a number to revisit question
            </p>

          </div>
        )}

        {/* Footer text */}
        <p className="text-sm text-text-muted text-center">
          Are you sure you want to submit?
        </p>

        {/* Actions */}
        <div className="flex gap-3">

          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-transparent py-2.5 text-sm font-medium text-text-dark hover:bg-black/5 transition"
          >
            Go Back
          </button>

          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white hover:bg-accent-hover transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>

        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;