export default function ReviewStep({ exam, sections, batchName, isEditMode }) {
  const duration = parseInt(exam.duration) === 0 || !exam.duration
    ? 'Unlimited'
    : `${exam.duration} min`;

  const totalQ = sections.reduce((a, s) => a + s.questions.length, 0);
  const totalMarks = parseFloat(
    sections.reduce((a, s) =>
      a + s.questions.reduce((qa, q) =>
        qa + parseFloat(q.marks || s.defaultMarks || 1), 0), 0
    ).toFixed(2)
  );
  const emptySections = sections.filter(s => s.questions.length === 0);

  return (
    <div className="space-y-5 max-w-lg">

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-blue-500">✏️</span>
          <p className="text-xs text-blue-700 font-medium">
            Editing existing exam — review changes before saving
          </p>
        </div>
      )}

      {/* Exam details */}
      <div className="bg-surface border border-black/8 rounded-xl p-4">
        <p className="text-[11px] font-medium text-text-dark/40 uppercase tracking-wide mb-3">
          Exam Details
        </p>
        <div className="space-y-2">
          {[
            ['Title', exam.title],
            ['Grade', exam.grade ? `Grade ${exam.grade}` : '—'],
            ['Batch', batchName || '—'],
            ['Duration', duration],
            ['Starts', exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleString() : 'Immediately on publish'],
            ['Closes', exam.windowEnd ? new Date(exam.windowEnd).toLocaleString() : 'Until unpublished'],
            ['Tags', exam.tags?.length ? exam.tags.join(', ') : '—'],
          ].map(([l, v]) => (
            <div key={l} className="flex gap-3 text-sm flex-wrap">
              <span className="w-20 text-text-dark/40 flex-shrink-0">{l}</span>
              <span className="text-text-dark font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Google Form */}
      {exam.googleForm?.linked && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-violet-500 text-sm">🔗</span>
          <p className="text-xs text-violet-700">
            Google Form linked · Token:{' '}
            <span className="font-mono font-bold">{exam.googleForm.token}</span>
          </p>
        </div>
      )}

      {/* Sections summary */}
      <div className="bg-surface border border-black/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium text-text-dark/40 uppercase tracking-wide">
            {sections.length} Section{sections.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3 text-[11px] text-text-dark/40">
            <span>{totalQ} question{totalQ !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{totalMarks} total marks</span>
          </div>
        </div>
        <div className="divide-y divide-black/6">
          {sections.map(s => {
            const sMarks = parseFloat(
              s.questions.reduce((a, q) =>
                a + parseFloat(q.marks || s.defaultMarks || 1), 0
              ).toFixed(2)
            );
            return (
              <div key={s.id} className="flex items-center justify-between py-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-dark">{s.name}</span>
                  {s.questions.length === 0 && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      empty
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-dark/40">
                    {s.questions.length} Q · {sMarks} marks
                  </span>
                  {s.questions.some(q => q.imageUrl) && (
                    <span className="ml-2 text-[10px] text-accent/60 bg-accent/8 px-1.5 py-0.5 rounded-full">
                      has images
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalQ === 0 && (
          <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Add at least one question before saving.
          </p>
        )}
        {totalQ > 0 && emptySections.length > 0 && (
          <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Empty sections:{' '}
            <span className="font-medium">{emptySections.map(s => s.name).join(', ')}</span>
          </p>
        )}
      </div>
    </div>
  );
}