import { useState } from 'react';

const GRADES = ['4', '5', '6', '7', '8'];

// ─── TagInput ─────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder = 'Type & press Enter…' }) {
  const [val, setVal] = useState('');
  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-black/10 rounded-lg min-h-[38px] bg-white focus-within:border-accent transition-colors">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-500">×</button>
        </span>
      ))}
      <input
        className="text-xs outline-none flex-1 min-w-[80px] bg-transparent placeholder-text-dark/30"
        placeholder={placeholder}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
      />
    </div>
  );
}

// ─── ExamDetailsStep ──────────────────────────────────────────────────────────
export default function ExamDetailsStep({ exam, setExam, batches, batchesLoading }) {
  const field = key => ({
    value: exam[key],
    onChange: e => setExam(p => ({ ...p, [key]: e.target.value })),
  });

  const windowError =
    exam.scheduledAt &&
    exam.windowEnd &&
    new Date(exam.windowEnd) <= new Date(exam.scheduledAt);

  return (
    <div className="space-y-5 max-w-lg">

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-text-dark/60 mb-1.5">Exam Title *</label>
        <input
          className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
          placeholder="e.g. Math Olympiad Mock 1"
          {...field('title')}
        />
        {!exam.title.trim() && (
          <p className="text-[11px] text-red-400 mt-1">Title is required to continue</p>
        )}
      </div>

      {/* Grade + Batch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-dark/60 mb-1.5">Grade *</label>
          <select
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
            {...field('grade')}
          >
            <option value="">Select grade</option>
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {!exam.grade && (
            <p className="text-[11px] text-red-400 mt-1">Grade is required to continue</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
            Batch <span className="text-text-dark/30 font-normal">optional</span>
          </label>
          <select
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
            value={exam.batchId}
            onChange={e => setExam(p => ({ ...p, batchId: e.target.value }))}
          >
            <option value="">{batchesLoading ? 'Loading…' : 'Select batch'}</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
          Duration (minutes)
          <span className="text-text-dark/30 font-normal ml-1.5">— 0 or blank = unlimited</span>
        </label>
        <input
          type="number"
          min="0"
          className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
          placeholder="60 (blank = unlimited)"
          {...field('duration')}
        />
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
            Scheduled At <span className="text-text-dark/30 font-normal">optional</span>
          </label>
          <input
            type="datetime-local"
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
            {...field('scheduledAt')}
          />
          <p className="text-[11px] text-text-dark/35 mt-1">Blank = live immediately on publish</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
            Window End <span className="text-text-dark/30 font-normal">optional</span>
          </label>
          <input
            type="datetime-local"
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
            {...field('windowEnd')}
          />
          <p className="text-[11px] text-text-dark/35 mt-1">Blank = open until unpublished</p>
        </div>
      </div>

      {/* Window validation */}
      {windowError && (
        <p className="text-[11px] text-red-400 -mt-3">
          ⚠️ Window end must be after scheduled start
        </p>
      )}

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-text-dark/60 mb-1.5">
          Exam Tags <span className="text-text-dark/30 font-normal">optional</span>
        </label>
        <TagInput tags={exam.tags} onChange={tags => setExam(p => ({ ...p, tags }))} />
      </div>

    </div>
  );
}