const ConfirmDialog = ({ exam, answers, submitting, onConfirm, onClose, onJumpToQuestion }) => {
  const unattempted = exam.questions.filter(q => !answers[q.id]);
  const attempted = exam.questions.length - unattempted.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
      <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-5">

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-primary">Submit Exam?</h2>
          <p className="text-sm text-gray-400">Please review before submitting.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-answered/10 border border-answered rounded-xl py-3">
            <p className="text-xl font-black text-answered">{attempted}</p>
            <p className="text-xs font-semibold text-answered mt-0.5">Attempted</p>
          </div>
          <div className="bg-red-50 border border-red-300 rounded-xl py-3">
            <p className="text-xl font-black text-red-500">{unattempted.length}</p>
            <p className="text-xs font-semibold text-red-500 mt-0.5">Skipped</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl py-3">
            <p className="text-xl font-black text-primary">{exam.questions.length}</p>
            <p className="text-xs font-semibold text-primary mt-0.5">Total</p>
          </div>
        </div>

        {/* Unattempted list */}
        {unattempted.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-1">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
              Not Attempted
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {unattempted.map(q => {
                const qIndex = exam.questions.findIndex(eq => eq.id === q.id) + 1;
                return (
                  <button
                    key={q.id}
                    onClick={() => onJumpToQuestion(q.id)}
                    className="w-8 h-8 rounded-lg bg-red-100 text-red-500 text-xs font-bold hover:bg-red-200 transition"
                  >
                    {qIndex}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-red-400 mt-1">
              Tap a number to go back to that question.
            </p>
          </div>
        )}

        <p className="text-sm font-semibold text-gray-500 text-center">
          Are you sure you want to submit?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-primary font-bold text-sm hover:border-primary transition"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Yes, Submit"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;