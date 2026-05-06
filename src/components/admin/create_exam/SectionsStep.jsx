import { useEffect, useRef, useState } from 'react';
import { uploadImage } from '../../../lib/cloudinary';

const OPTIONS = ['A', 'B', 'C', 'D'];
const SIZES = [
  { key: 'small', label: 'Small', hint: 'Formula / icon', barH: 'h-3' },
  { key: 'medium', label: 'Medium', hint: 'Diagram / table', barH: 'h-5' },
  { key: 'large', label: 'Large', hint: 'Detailed chart', barH: 'h-7' },
  { key: 'full', label: 'Full', hint: 'Map / main visual', barH: 'h-10' },
];

const uid = () => Math.random().toString(36).slice(2, 9);

const blankQ = () => ({
  id: uid(),
  text: '',
  imageUrl: '',
  imageSize: 'medium',
  imageUploading: false,
  options: { A: '', B: '', C: '', D: '' },
  correctAnswer: 'A',
  marks: '',
  explanation: '',
  explanationImageUrl: '',
  explanationUploading: false,
  tags: [],
});

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

// ─── ImageAttach ──────────────────────────────────────────────────────────────
function ImageAttach({ label, imageUrl, uploading, onUpload, onRemove, folder }) {
  const ref = useRef(null);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files[0];
          if (f) onUpload(f, folder);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="mt-1.5 text-xs text-accent/70 hover:text-accent flex items-center gap-1.5 transition-colors disabled:opacity-50"
      >
        {uploading ? '⏳ Uploading…' : `📎 ${label}`}
      </button>
      {imageUrl && (
        <div className="mt-2 relative w-fit">
          <img src={imageUrl} alt="" className="max-h-28 rounded-lg border border-black/10 object-contain" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ImageSizePicker ──────────────────────────────────────────────────────────
function ImageSizePicker({ value = 'medium', onChange }) {
  return (
    <div className="mt-3 p-3 bg-black/2 border border-black/8 rounded-xl">
      <p className="text-[11px] font-semibold text-text-dark/50 uppercase tracking-wide mb-2">
        Image display size for students
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {SIZES.map(size => {
          const active = value === size.key;
          return (
            <button
              key={size.key}
              type="button"
              onClick={() => onChange(size.key)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border-2 py-2 px-1 transition-all
                ${active ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:border-black/20'}`}
            >
              <div className="w-full flex items-end justify-center bg-black/5 rounded h-10 px-2 pb-1">
                <div className={`w-full rounded-sm ${size.barH} ${active ? 'bg-primary/50' : 'bg-black/20'}`} />
              </div>
              <span className={`text-[10px] font-bold leading-none ${active ? 'text-primary' : 'text-text-dark/50'}`}>
                {size.label}
              </span>
              <span className="text-[9px] text-text-dark/30 leading-none text-center">
                {size.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── QuestionForm ─────────────────────────────────────────────────────────────
function QuestionForm({ sectionDefaultMarks, initial, onSave, onCancel }) {
  const [q, setQ] = useState(() => initial ? { ...initial } : blankQ());
  const [imgErr, setImgErr] = useState('');
  const [showExplanation, setShowExplanation] = useState(
    !!(initial?.explanation || initial?.explanationImageUrl)
  );
  const questionRef = useRef(null);

  const set = (key, val) => setQ(p => ({ ...p, [key]: val }));
  const setOpt = (k, v) => setQ(p => ({ ...p, options: { ...p.options, [k]: v } }));
  const allOptsValid = OPTIONS.every(k => q.options[k]?.trim());
  const isValid = (q.text.trim() || q.imageUrl) && allOptsValid;

  const resizeTextarea = (el) => {
    if (!el) return;
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 24;
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const minHeight = lineHeight * 3 + padding + border;
    const maxHeight = lineHeight * 8 + padding + border;
    el.style.height = '0px';
    const newHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  useEffect(() => {
    resizeTextarea(questionRef.current);
  }, [q.text]);

  async function handleImgUpload(file, folder, urlKey, loadingKey) {
    setImgErr('');
    set(loadingKey, true);
    try {
      const url = await uploadImage(file, folder);
      setQ(p => ({ ...p, [urlKey]: url, [loadingKey]: false }));
    } catch (e) {
      setImgErr(e.message);
      set(loadingKey, false);
    }
  }

  return (
    <div className="border border-accent/25 rounded-xl p-4 bg-accent/3 space-y-4 mt-2">

      {imgErr && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{imgErr}</p>
      )}

      {/* Question text */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-text-dark/50 uppercase tracking-wide">
          Question
        </legend>
        <textarea
          ref={questionRef}
          className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm leading-6 outline-none focus:border-accent resize-none bg-white"
          placeholder="Enter question text — leave blank if image only"
          value={q.text}
          onChange={e => { set('text', e.target.value); resizeTextarea(e.target); }}
          style={{ minHeight: '72px', maxHeight: '200px', resize: 'none' }}
        />
        <ImageAttach
          label="Attach question image"
          imageUrl={q.imageUrl}
          uploading={q.imageUploading}
          folder="questions"
          onUpload={(f, folder) => handleImgUpload(f, folder, 'imageUrl', 'imageUploading')}
          onRemove={() => setQ(p => ({ ...p, imageUrl: '', imageSize: 'medium' }))}
        />
        {q.imageUrl && (
          <ImageSizePicker value={q.imageSize} onChange={val => set('imageSize', val)} />
        )}
      </fieldset>

      {/* Options */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-text-dark/50 uppercase tracking-wide">
          Options <span className="normal-case font-normal text-text-dark/30">— click letter to mark correct</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OPTIONS.map(opt => {
            const isCorrect = q.correctAnswer === opt;
            return (
              <div
                key={opt}
                className={`flex items-center gap-2.5 border rounded-lg px-3 py-2 transition-colors
                  ${isCorrect ? 'border-answered bg-answered/5' : 'border-black/10 bg-white'}`}
              >
                <button
                  type="button"
                  onClick={() => set('correctAnswer', opt)}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors
                    ${isCorrect ? 'border-answered bg-answered text-white' : 'border-black/20 text-text-dark/40 hover:border-accent'}`}
                >
                  {opt}
                </button>
                <input
                  className="flex-1 text-sm outline-none bg-transparent min-w-0"
                  placeholder={`Option ${opt}`}
                  value={q.options[opt] || ''}
                  onChange={e => setOpt(opt, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Marks + Tags */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-text-dark/50 uppercase tracking-wide mb-1.5 block">
            Marks
            <span className="normal-case font-normal text-text-dark/30 ml-1">
              default {sectionDefaultMarks || 1}
            </span>
          </label>
          <input
            type="number" min="0" step="0.5"
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white"
            placeholder={String(sectionDefaultMarks || 1)}
            value={q.marks}
            onChange={e => set('marks', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-dark/50 uppercase tracking-wide mb-1.5 block">
            Tags <span className="normal-case font-normal text-text-dark/30">optional</span>
          </label>
          <TagInput tags={q.tags} onChange={tags => set('tags', tags)} placeholder="Chapter…" />
        </div>
      </div>

      {/* Explanation */}
      <div>
        <button
          type="button"
          onClick={() => setShowExplanation(p => !p)}
          className="text-xs font-semibold text-text-dark/40 hover:text-accent flex items-center gap-1.5 transition-colors"
        >
          <span>{showExplanation ? '▾' : '▸'}</span>
          {showExplanation ? 'Hide explanation' : 'Add explanation (optional)'}
        </button>
        {showExplanation && (
          <div className="mt-2 space-y-2">
            <textarea
              rows={2}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-none bg-white"
              placeholder="Why is this the correct answer?"
              value={q.explanation}
              onChange={e => set('explanation', e.target.value)}
            />
            <ImageAttach
              label="Attach explanation image"
              imageUrl={q.explanationImageUrl}
              uploading={q.explanationUploading}
              folder="explanations"
              onUpload={(f, folder) => handleImgUpload(f, folder, 'explanationImageUrl', 'explanationUploading')}
              onRemove={() => set('explanationImageUrl', '')}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/6">
        <button
          type="button"
          disabled={!isValid}
          onClick={() => isValid && onSave(q)}
          className="text-sm bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initial ? 'Update Question' : 'Save Question'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-text-dark/50 hover:text-text-dark px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
        {!isValid && (
          <span className="text-[11px] text-red-400">
            {!(q.text.trim() || q.imageUrl) ? 'Add text or image' : 'Fill all 4 options'}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── GoogleFormPanel ──────────────────────────────────────────────────────────
function mapGFormJSON(data) {
  const mcq = data.questions.filter(q =>
    q.type !== 'open-ended' &&
    q.options &&
    Object.keys(q.options).length === 4 &&
    q.correctAnswer
  );
  const sections = (data.sections || []).map(s => ({
    id: s.id,
    name: s.label || s.name || 'Section',
    defaultMarks: s.marks || 1,
    questions: mcq
      .filter(q => q.sectionId === s.id)
      .map((q, idx) => ({
        id: uid(),
        text: q.text || '',
        imageUrl: q.image?.url || '',
        imageSize: (q.text?.trim().replace(/^\d+\.?\s*$/, '')) ? 'medium' : 'full',
        imageUploading: false,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || s.marks || 1,
        explanation: q.feedback?.incorrect || q.feedback?.correct || '',
        explanationImageUrl:
          q.feedback?.incorrectLinks?.find(l => l.isImage)?.url ||
          q.feedback?.correctLinks?.find(l => l.isImage)?.url || '',
        explanationUploading: false,
        tags: [],
        order: idx,
      })),
  })).filter(s => s.questions.length > 0);

  return {
    sections,
    title: data.title || '',
    duration: data.duration || 60,
    totalQ: sections.reduce((a, s) => a + s.questions.length, 0),
  };
}

function GoogleFormPanel({ onImport, hasExistingQuestions }) {
  const [json, setJson] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  function handleParse() {
    setError(''); setPreview(null);
    try {
      const data = JSON.parse(json.trim());
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('No "questions" array found in JSON.');
      }
      const result = mapGFormJSON(data);
      if (result.totalQ === 0) throw new Error('No valid MCQ questions found.');
      setPreview(result);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="w-8 h-8 bg-violet-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">G</div>
        <div>
          <p className="text-sm font-medium text-text-dark">Import from Google Form</p>
          <p className="text-xs text-text-dark/50 mt-0.5">
            Run <span className="font-mono bg-black/5 px-1 rounded">extractFormToExamJSON()</span> in Apps Script → copy the JSON → paste below
          </p>
        </div>
      </div>

      {!preview && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-dark/60">Paste JSON output</label>
          <textarea
            rows={10}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-xs font-mono outline-none focus:border-accent resize-y bg-white placeholder:text-text-dark/20"
            placeholder={'{\n  "title": "Grade 5 Fractions Test",\n  "sections": [...],\n  "questions": [...]\n}'}
            value={json}
            onChange={e => setJson(e.target.value)}
          />
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</div>
          )}
          <button
            type="button"
            onClick={handleParse}
            disabled={!json.trim()}
            className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Parse & Preview →
          </button>
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-green-800">{preview.title}</p>
              <p className="text-xs text-green-600 mt-0.5">
                {preview.totalQ} questions · {preview.sections.length} section{preview.sections.length !== 1 ? 's' : ''} · {preview.duration} min
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setPreview(null); setJson(''); setError(''); }}
              className="text-xs text-green-700/50 hover:text-green-800 transition-colors"
            >
              ← Re-paste
            </button>
          </div>

          {hasExistingQuestions && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ This will replace your existing questions.
            </div>
          )}

          <div className="border border-black/8 rounded-xl overflow-hidden">
            {preview.sections.map(s => (
              <div key={s.id}>
                <div className="bg-black/3 px-4 py-2 flex items-center justify-between border-b border-black/6">
                  <span className="text-xs font-semibold text-text-dark/55 uppercase tracking-wide">{s.name}</span>
                  <span className="text-xs text-text-dark/35">{s.questions.length} Q · {s.defaultMarks} mark each</span>
                </div>
                <div className="divide-y divide-black/5">
                  {s.questions.map((q, qi) => (
                    <div key={q.id} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="text-[11px] font-semibold text-text-dark/20 w-5 pt-px flex-shrink-0">{qi + 1}</span>
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt="" className="h-12 w-16 object-cover rounded-lg border border-black/8 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-dark line-clamp-2">
                          {q.text || <span className="text-text-dark/30 italic">Image-only question</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-text-dark/30">A · B · C · D</span>
                          <span className="text-[11px] font-semibold text-answered">✓ {q.correctAnswer}</span>
                          {(q.explanation || q.explanationImageUrl) && (
                            <span className="text-[11px] text-accent/60 bg-accent/8 px-1.5 py-0.5 rounded-full">has solution</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onImport(preview)}
              className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:bg-accent transition-colors font-medium"
            >
              Import {preview.totalQ} Questions →
            </button>
            <p className="text-xs text-text-dark/35">You can edit any question after import</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SectionsStep ─────────────────────────────────────────────────────────────
export default function SectionsStep({ sections, setSections, onGFormImport }) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id);
  const [importTab, setImportTab] = useState('manual');
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);

  const activeSection = sections.find(s => s.id === activeSectionId);
  const totalExistingQ = sections.reduce((a, s) => a + s.questions.length, 0);

  const closeForm = () => { setShowForm(false); setEditingQ(null); };
  const switchSection = (id) => { setActiveSectionId(id); closeForm(); };

  const addSection = () => {
    const s = { id: uid(), name: `Section ${sections.length + 1}`, defaultMarks: 1, questions: [] };
    setSections(p => [...p, s]);
    setActiveSectionId(s.id);
    closeForm();
  };

  const updateSection = (id, key, val) =>
    setSections(p => p.map(s => s.id === id ? { ...s, [key]: val } : s));

  const deleteSection = (id) => {
    if (sections.length === 1) return;
    const rest = sections.filter(s => s.id !== id);
    setSections(rest);
    setActiveSectionId(rest[0].id);
    closeForm();
  };

  const saveQuestion = (q) => {
    setSections(p => p.map(s => {
      if (s.id !== activeSectionId) return s;
      const exists = s.questions.find(x => x.id === q.id);
      return {
        ...s,
        questions: exists
          ? s.questions.map(x => x.id === q.id ? q : x)
          : [...s.questions, { ...q, order: s.questions.length }],
      };
    }));
    closeForm();
  };

  const deleteQuestion = (qId) =>
    setSections(p => p.map(s =>
      s.id === activeSectionId
        ? {
          ...s,
          questions: s.questions
            .filter(q => q.id !== qId)
            .map((q, i) => ({ ...q, order: i })),
        }
        : s
    ));

  const handleEditQuestion = (q) => {
    setEditingQ(q);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('question-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleGFormImport = (parsed) => {

    // ✅ Debug
    parsed.sections.forEach(s => {
      s.questions.forEach(q => {
        console.log(q.text?.slice(0, 20) || '[img only]', '→', q.imageSize);
      });
    });


    setSections(parsed.sections);
    setActiveSectionId(parsed.sections[0]?.id);
    closeForm();
    setImportTab('manual');
    onGFormImport?.(parsed);
  };

  return (
    <div className="flex flex-col md:flex-row gap-5">

      {/* Section sidebar */}
      <div className="w-full md:w-48 flex-shrink-0">
        <p className="text-[11px] font-medium text-text-dark/40 uppercase tracking-wide mb-2">Sections</p>
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0">
          {sections.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => switchSection(s.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex-shrink-0
                ${s.id === activeSectionId
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface border border-black/8 text-text-dark hover:border-accent/30'}`}
            >
              <div className="font-medium truncate max-w-[120px] md:max-w-none">{s.name || 'Untitled'}</div>
              <div className={`text-[11px] mt-0.5 ${s.id === activeSectionId ? 'text-white/55' : 'text-text-dark/35'}`}>
                {s.questions.length} Q
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={addSection}
            className="text-left px-3 py-2 rounded-lg text-sm border border-dashed border-black/15 text-text-dark/40 hover:border-accent hover:text-accent transition-colors flex-shrink-0"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Active section editor */}
      {activeSection && (
        <div className="flex-1 min-w-0">

          {/* Section config */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              className={`border rounded-lg px-3 py-1.5 text-sm font-medium outline-none bg-white flex-1 min-w-[140px] max-w-xs
                ${!activeSection.name.trim() ? 'border-red-300 focus:border-red-400' : 'border-black/10 focus:border-accent'}`}
              value={activeSection.name}
              onChange={e => updateSection(activeSection.id, 'name', e.target.value)}
              placeholder="Section name"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-text-dark/50 whitespace-nowrap">Default marks</span>
              <input
                type="number" min="0" step="0.5"
                className="w-14 border border-black/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent text-center bg-white"
                value={activeSection.defaultMarks}
                onChange={e => updateSection(activeSection.id, 'defaultMarks', e.target.value)}
              />
            </div>
            {sections.length > 1 && (
              <button
                type="button"
                onClick={() => deleteSection(activeSection.id)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
              >
                Delete section
              </button>
            )}
          </div>

          {/* Import tabs */}
          <div className="flex gap-0 mb-4 border border-black/8 rounded-lg p-0.5 bg-black/3 w-fit">
            {[['manual', 'Manual Entry'], ['gform', 'Google Form']].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setImportTab(k); closeForm(); }}
                className={`text-xs px-4 py-1.5 rounded-[7px] font-medium transition-colors whitespace-nowrap
                  ${importTab === k ? 'bg-white text-text-dark shadow-sm' : 'text-text-dark/40 hover:text-text-dark'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {importTab === 'gform' ? (
            <GoogleFormPanel onImport={handleGFormImport} hasExistingQuestions={totalExistingQ > 0} />
          ) : (
            <>
              {/* Question list */}
              <div className="space-y-2 mb-3">
                {activeSection.questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 border border-black/8 rounded-lg px-3 py-2.5 bg-surface hover:border-black/15 group transition-colors"
                  >
                    <span className="text-[11px] font-semibold text-text-dark/25 w-6 pt-0.5 flex-shrink-0">
                      Q{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      {q.imageUrl && !q.text && (
                        <img src={q.imageUrl} alt="" className="h-14 rounded mb-1 object-contain" />
                      )}
                      <p className="text-sm text-text-dark truncate">{q.text || '[Image question]'}</p>
                      <p className="text-[11px] text-text-dark/40 mt-0.5">
                        Correct: <span className="font-medium text-answered">{q.correctAnswer}</span>
                        {' · '}{q.marks || activeSection.defaultMarks || 1} mark
                        {q.imageUrl && (
                          <span className="ml-1.5 text-accent/60 bg-accent/8 px-1.5 py-0.5 rounded-full">
                            img · {q.imageSize || 'medium'}
                          </span>
                        )}
                        {q.tags?.length > 0 && ` · ${q.tags.join(', ')}`}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button type="button" onClick={() => handleEditQuestion(q)} className="text-xs text-accent hover:underline">Edit</button>
                      <button type="button" onClick={() => deleteQuestion(q.id)} className="text-xs text-red-400 hover:underline">Del</button>
                    </div>
                  </div>
                ))}

                {activeSection.questions.length === 0 && !showForm && (
                  <div className="border border-dashed border-black/10 rounded-xl py-10 text-center">
                    <p className="text-sm text-text-dark/30">No questions in this section yet</p>
                  </div>
                )}
              </div>

              {showForm ? (
                <div id="question-form">
                  <QuestionForm
                    key={editingQ?.id || 'new'}
                    sectionDefaultMarks={activeSection.defaultMarks}
                    initial={editingQ}
                    onSave={saveQuestion}
                    onCancel={closeForm}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditingQ(null); setShowForm(true); }}
                  className="text-sm border border-dashed border-accent/35 text-accent px-4 py-2.5 rounded-lg hover:bg-accent/5 transition-colors w-full"
                >
                  + Add Question
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}