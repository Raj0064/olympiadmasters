import { useNavigate } from 'react-router-dom';

const SuccessDialog = ({ submitting, submitResult, examId, isResultPublished }) => {
  const navigate = useNavigate();

  const answered = submitResult ? submitResult.correct + submitResult.wrong : 0;
  const notAnswered = submitResult ? submitResult.skipped : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      style={{ pointerEvents: 'all' }}
    >
      <div className="bg-surface rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-6">

        {submitting ? (

          /* ── Submitting — spinner ── */
          <>
            <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-400">Submitting your exam...</p>
          </>

        ) : (

          /* ── Success state ── */
          <>
            {/* Checkmark */}
            <div className="w-16 h-16 rounded-full bg-answered/10 border-2 border-answered flex items-center justify-center">
              <svg
                className="w-8 h-8 text-answered"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <div className="text-center flex flex-col gap-1">
              <h2 className="text-xl font-black text-primary">Submitted Successfully!</h2>
              <p className="text-sm text-gray-400">Your answers have been recorded.</p>
            </div>

            {/* Stats */}
            <div className="w-full grid grid-cols-2 gap-3">
              <div className="bg-answered/10 border border-answered rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-answered">{answered}</p>
                <p className="text-xs font-semibold text-answered mt-1">Answered</p>
              </div>
              <div className="bg-gray-100 border border-gray-300 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-gray-500">{notAnswered}</p>
                <p className="text-xs font-semibold text-gray-500 mt-1">Not Answered</p>
              </div>
            </div>

            {/* Result not published notice */}
            {!isResultPublished && (
              <div className="w-full flex items-start gap-2.5 bg-warning-bg border border-warning/20 rounded-xl px-3.5 py-3">
                <span className="text-base mt-0.5">🔒</span>
                <div>
                  <p className="text-[11px] font-bold text-warning uppercase tracking-wide mb-0.5">
                    Results Pending
                  </p>
                  <p className="text-xs text-warning/80 leading-relaxed">
                    Your teacher hasn't published the results yet. You'll be able to view them once released.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate('/dashboard')}
                className={`py-3 rounded-xl border-2 border-gray-200 text-primary font-bold text-sm hover:border-primary transition cursor-pointer ${isResultPublished ? 'flex-1' : 'w-full'
                  }`}
              >
                Dashboard
              </button>

              {/* Only show if results are published */}
              {isResultPublished && (
                <button
                  onClick={() => navigate(`/student/results/${examId}`)}
                  className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition cursor-pointer"
                >
                  View Results
                </button>
              )}
            </div>
          </>

        )}

      </div>
    </div>
  );
};

export default SuccessDialog;