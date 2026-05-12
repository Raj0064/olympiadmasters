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

// Add this once near the top (alongside uid, blankQ)
const normalizeNewlines = (str) =>
  (str || '').replace(/\\n/g, '\n').replace(/\\t/g, '\t').trim();

// ─── TagInput ──────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder = 'Type & press Enter…' }) {
  const [val, setVal] = useState('');
  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };
  return (
    <div className="
      flex flex-wrap gap-1.5 p-2 min-h-[38px]
      bg-surface border border-border rounded-lg
      focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10
      transition-all duration-150
    ">
      {tags.map(t => (
        <span
          key={t}
          className="
            flex items-center gap-1 text-xs font-medium
            bg-indigo-bg text-indigo px-2 py-0.5 rounded-full
          "
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter(x => x !== t))}
            className="hover:text-danger transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="text-xs outline-none flex-1 min-w-[80px] bg-transparent placeholder:text-text-faint text-text-dark"
        placeholder={placeholder}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
        }}
        onBlur={add}
      />
    </div>
  );
}

// ─── ImageAttach ───────────────────────────────────────────────────────────────
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
        className="
          mt-1.5 text-xs font-medium
          text-text-muted hover:text-accent
          flex items-center gap-1.5
          transition-colors duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        {uploading
          ? <><span className="animate-spin">⏳</span> Uploading…</>
          : <>📎 {label}</>
        }
      </button>

      {imageUrl && (
        <div className="mt-2 relative w-fit">
          <img
            src={imageUrl}
            alt=""
            className="max-h-28 rounded-xl border border-border object-contain shadow-sm"
          />
          <button
            type="button"
            onClick={onRemove}
            className="
              absolute -top-1.5 -right-1.5
              w-5 h-5 rounded-full
              bg-danger text-white
              text-xs flex items-center justify-center
              shadow-md hover:scale-110 transition-transform
            "
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ImageSizePicker ───────────────────────────────────────────────────────────
function ImageSizePicker({ value = 'medium', onChange }) {
  return (
    <div className="mt-3 p-3 bg-blue-soft-bg border border-border rounded-xl">
      <p className="text-[11px] font-semibold text-text-faint uppercase tracking-widest mb-2.5">
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
              className={`
                flex flex-col items-center gap-1.5 rounded-xl border-2 py-2 px-1
                transition-all duration-150
                ${active
                  ? 'border-primary bg-primary/8 shadow-sm'
                  : 'border-border bg-surface hover:border-border-strong hover:bg-background'
                }
              `}
            >
              <div className="w-full flex items-end justify-center bg-black/5 rounded-lg h-10 px-2 pb-1">
                <div className={`
                  w-full rounded-sm transition-colors
                  ${size.barH}
                  ${active ? 'bg-primary/50' : 'bg-text-faint/40'}
                `} />
              </div>
              <span className={`text-[10px] font-bold leading-none ${active ? 'text-primary' : 'text-text-muted'}`}>
                {size.label}
              </span>
              <span className="text-[9px] text-text-faint leading-none text-center">
                {size.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── QuestionForm ──────────────────────────────────────────────────────────────
function QuestionForm({ sectionDefaultMarks, initial, onSave, onCancel }) {
  const [q, setQ] = useState(() => initial ? { ...initial } : blankQ());
  const [imgErr, setImgErr] = useState('');
  const [showExplanation, setShowExp] = useState(
    !!(initial?.explanation || initial?.explanationImageUrl)
  );
  const questionRef = useRef(null);

  const set = (key, val) => setQ(p => ({ ...p, [key]: val }));
  const setOpt = (k, v) => setQ(p => ({ ...p, options: { ...p.options, [k]: v } }));

  const allOptsValid = OPTIONS.every(k => q.options[k]?.trim());
  const isValid = (q.text.trim() || q.imageUrl) && allOptsValid;

  const resizeTextarea = (el) => {
    if (!el) return;
    const s = window.getComputedStyle(el);
    const lh = parseFloat(s.lineHeight) || 24;
    const pad = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
    const brd = parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth);
    const minH = lh * 3 + pad + brd;
    const maxH = lh * 8 + pad + brd;
    el.style.height = '0px';
    const next = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  };

  useEffect(() => { resizeTextarea(questionRef.current); }, [q.text]);

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
    <div className="
      border border-accent/20 rounded-2xl p-5
      bg-gradient-to-b from-accent/3 to-transparent
      space-y-5 mt-2 shadow-sm
    ">
      {/* Upload error */}
      {imgErr && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 px-3 py-2 rounded-lg">
          ⚠️ {imgErr}
        </p>
      )}

      {/* ── Question text ── */}
      <fieldset className="space-y-2">
        <legend className="text-[11px] font-semibold text-text-faint uppercase tracking-widest mb-1">
          Question
        </legend>
        <textarea
          ref={questionRef}
          className="
            w-full border border-border rounded-xl px-3 py-2.5
            text-sm leading-6 text-text-dark
            outline-none focus:border-accent focus:ring-2 focus:ring-accent/10
            resize-none bg-surface transition-all duration-150
            placeholder:text-text-faint
          "
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

      {/* ── Options ── */}
      <fieldset className="space-y-2">
        <legend className="text-[11px] font-semibold text-text-faint uppercase tracking-widest mb-1">
          Options{' '}
          <span className="normal-case font-normal text-text-faint/70">
            — click letter to mark correct
          </span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OPTIONS.map(opt => {
            const isCorrect = q.correctAnswer === opt;
            return (
              <div
                key={opt}
                className={`
                  flex items-center gap-2.5 border rounded-xl px-3 py-2
                  transition-all duration-150
                  ${isCorrect
                    ? 'border-success/40 bg-success-bg shadow-sm'
                    : 'border-border bg-surface hover:border-accent/30 hover:bg-background'
                  }
                `}
              >
                <button
                  type="button"
                  onClick={() => set('correctAnswer', opt)}
                  className={`
                    w-6 h-6 rounded-full border-2 flex-shrink-0
                    flex items-center justify-center
                    text-[11px] font-bold transition-all duration-150
                    ${isCorrect
                      ? 'border-success bg-success text-white shadow-sm'
                      : 'border-border bg-surface text-text-muted hover:border-accent hover:text-accent'
                    }
                  `}
                >
                  {opt}
                </button>
                <input
                  className={`
                    flex-1 text-sm outline-none bg-transparent min-w-0
                    ${isCorrect ? 'text-success font-medium' : 'text-text-dark'}
                    placeholder:text-text-faint
                  `}
                  placeholder={`Option ${opt}`}
                  value={q.options[opt] || ''}
                  onChange={e => setOpt(opt, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* ── Marks + Tags ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-text-faint uppercase tracking-widest mb-1.5 block">
            Marks{' '}
            <span className="normal-case font-normal text-text-faint/70 ml-1">
              default {sectionDefaultMarks || 1}
            </span>
          </label>
          <input
            type="number" min="0" step="0.5"
            className="
              w-full border border-border rounded-xl px-3 py-2
              text-sm text-text-dark outline-none
              focus:border-accent focus:ring-2 focus:ring-accent/10
              bg-surface transition-all duration-150
              placeholder:text-text-faint
            "
            placeholder={String(sectionDefaultMarks || 1)}
            value={q.marks}
            onChange={e => set('marks', e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-faint uppercase tracking-widest mb-1.5 block">
            Tags{' '}
            <span className="normal-case font-normal text-text-faint/70">optional</span>
          </label>
          <TagInput
            tags={q.tags}
            onChange={tags => set('tags', tags)}
            placeholder="Chapter…"
          />
        </div>
      </div>

      {/* ── Explanation ── */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowExp(p => !p)}
          className="
            text-xs font-semibold text-text-muted hover:text-accent
            flex items-center gap-1.5 transition-colors duration-150
          "
        >
          <span className="text-[10px]">{showExplanation ? '▾' : '▸'}</span>
          {showExplanation ? 'Hide explanation' : 'Add explanation (optional)'}
        </button>

        {showExplanation && (
          <div className="mt-3 space-y-2 pl-4 border-l-2 border-accent/20">
            <textarea
              rows={2}
              className="
                w-full border border-border rounded-xl px-3 py-2.5
                text-sm text-text-dark outline-none
                focus:border-accent focus:ring-2 focus:ring-accent/10
                resize-none bg-surface transition-all duration-150
                placeholder:text-text-faint
              "
              placeholder="Why is this the correct answer?"
              value={q.explanation}
              onChange={e => set('explanation', e.target.value)}
            />
            <ImageAttach
              label="Attach explanation image"
              imageUrl={q.explanationImageUrl}
              uploading={q.explanationUploading}
              folder="explanations"
              onUpload={(f, folder) =>
                handleImgUpload(f, folder, 'explanationImageUrl', 'explanationUploading')
              }
              onRemove={() => set('explanationImageUrl', '')}
            />
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
        <button
          type="button"
          disabled={!isValid}
          onClick={() => isValid && onSave(q)}
          className="
            text-sm font-medium
            bg-primary hover:bg-primary-hover
            text-white px-5 py-2 rounded-xl
            transition-all duration-150 shadow-sm
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:shadow-md active:scale-[0.98]
          "
        >
          {initial ? 'Update Question' : 'Save Question'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="
            text-sm text-text-muted hover:text-text-dark
            px-3 py-2 rounded-xl
            hover:bg-background transition-all duration-150
          "
        >
          Cancel
        </button>
        {!isValid && (
          <span className="text-[11px] text-danger bg-danger-bg px-2 py-1 rounded-lg">
            {!(q.text.trim() || q.imageUrl)
              ? '⚠️ Add text or image'
              : '⚠️ Fill all 4 options'
            }
          </span>
        )}
      </div>
    </div>
  );
}

// ─── GoogleFormPanel ───────────────────────────────────────────────────────────
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
        googleFormItemId: q.googleFormItemId || '',
        text: normalizeNewlines(q.text),
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
    googleForm: data.googleForm || null,
    totalQ: sections.reduce((a, s) => a + s.questions.length, 0),
  };
}

// ─── GoogleFormPanel shell ─────────────────────────────────────────────────────
function GoogleFormPanel({ onImport, hasExistingQuestions }) {
  const [mode, setMode] = useState('url');

  return (
    <div className="space-y-4 mt-2">
      {/* Header */}
      <div className="flex items-start gap-3 bg-indigo-bg border border-indigo/20 rounded-2xl p-4">
        <div className="
          w-9 h-9 rounded-xl flex-shrink-0
          bg-gradient-to-br from-indigo to-primary
          text-white flex items-center justify-center
          font-bold text-sm shadow-sm
        ">
          G
        </div>
        <div>
          <p className="text-sm font-semibold text-text-dark">Import from Google Form</p>
          <p className="text-xs text-text-muted mt-0.5">
            Extract questions, images, answers and feedback automatically
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-0 border border-border rounded-lg p-0.5 bg-background w-fit">
        {[['url', '🔗 Form URL'], ['json', '📋 Paste JSON']].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`
              text-xs px-4 py-1.5 rounded-[7px] font-medium
              transition-all duration-150 whitespace-nowrap
              ${mode === k
                ? 'bg-surface text-text-dark shadow-sm'
                : 'text-text-muted hover:text-text-dark'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'url'
        ? <UrlExtractor onImport={onImport} hasExistingQuestions={hasExistingQuestions} />
        : <JsonPaster onImport={onImport} hasExistingQuestions={hasExistingQuestions} />
      }
    </div>
  );
}

// ─── URL Extractor ─────────────────────────────────────────────────────────────
function UrlExtractor({ onImport, hasExistingQuestions }) {
  const [formUrl, setFormUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  async function handleExtract() {
    if (!formUrl.trim()) return;
    setLoading(true);
    setError('');
    setErrorDetail('');
    setPreview(null);

    setProgress('Connecting to Google Form...');
    const t1 = setTimeout(() => setProgress('Extracting questions...'), 3000);
    const t2 = setTimeout(() => setProgress('Uploading images to Cloudinary...'), 8000);
    const t3 = setTimeout(() => setProgress('Building question map...'), 20000);
    const t4 = setTimeout(() => setProgress('Almost done...'), 40000);

    try {
      const { extractFromGoogleForm } = await import('../../../services/googleForm.service');
      const data = await extractFromGoogleForm(formUrl.trim());
      [t1, t2, t3, t4].forEach(clearTimeout);
      const result = mapExtractedData(data);
      setPreview(result);
    } catch (e) {
      [t1, t2, t3, t4].forEach(clearTimeout);
      setError(e.message || 'Extraction failed');
      setErrorDetail(e.stack || '');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  return (
    <div className="space-y-3">
      {!preview && (
        <>
          {/* URL input */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Google Form URL or Form ID
            </label>
            <input
              className="
                w-full border border-border rounded-xl px-3 py-2.5
                text-sm text-text-dark outline-none
                focus:border-accent focus:ring-2 focus:ring-accent/10
                bg-surface transition-all duration-150
                placeholder:text-text-faint
                disabled:opacity-50
              "
              placeholder="https://docs.google.com/forms/d/1ABC.../edit  or  1ABC..."
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="
              text-xs text-danger bg-danger-bg
              border border-danger/20 rounded-xl px-3 py-2.5 space-y-1
            ">
              <p className="font-semibold">⚠️ {error}</p>
              {errorDetail && (
                <details className="mt-1">
                  <summary className="text-danger/60 cursor-pointer hover:text-danger">
                    Show details
                  </summary>
                  <pre className="
                    mt-1 text-[10px] text-danger/50
                    whitespace-pre-wrap break-all
                    max-h-32 overflow-y-auto
                  ">
                    {errorDetail}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="bg-sky-bg border border-sky/20 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="
                  w-4 h-4 rounded-full flex-shrink-0
                  border-2 border-sky/30 border-t-sky
                  animate-spin
                " />
                <p className="text-sm text-sky font-medium">{progress}</p>
              </div>
              <div className="w-full bg-sky/15 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-sky rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-[11px] text-sky/60 mt-2">
                This takes 30–60 seconds for exams with images
              </p>
            </div>
          )}

          {/* Extract button */}
          <button
            type="button"
            onClick={handleExtract}
            disabled={!formUrl.trim() || loading}
            className="
              text-sm font-medium
              bg-primary hover:bg-primary-hover
              text-white px-5 py-2.5 rounded-xl
              transition-all duration-150 shadow-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:shadow-md active:scale-[0.98]
            "
          >
            {loading ? 'Extracting…' : 'Extract & Preview →'}
          </button>
        </>
      )}

      {preview && (
        <ImportPreview
          preview={preview}
          hasExistingQuestions={hasExistingQuestions}
          onImport={onImport}
          onReset={() => { setPreview(null); setFormUrl(''); }}
        />
      )}
    </div>
  );
}

// ─── JSON Paster ───────────────────────────────────────────────────────────────
function JsonPaster({ onImport, hasExistingQuestions }) {
  const [json, setJson] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  function handleParse() {
    setError('');
    setPreview(null);
    try {
      const data = JSON.parse(json.trim());
      if (!data.questions || !Array.isArray(data.questions))
        throw new Error('No "questions" array found in JSON.');
      const result = mapGFormJSON(data);
      if (result.totalQ === 0) throw new Error('No valid MCQ questions found.');
      setPreview(result);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-3">
      {!preview && (
        <>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Paste JSON output from{' '}
              <span className="font-mono text-[11px] bg-background border border-border px-1.5 py-0.5 rounded-md text-text-dark">
                extractFormToExamJSON()
              </span>
            </label>
            <textarea
              rows={10}
              className="
                w-full border border-border rounded-xl px-3 py-2.5
                text-xs font-mono text-text-dark
                outline-none focus:border-accent focus:ring-2 focus:ring-accent/10
                resize-y bg-surface transition-all duration-150
                placeholder:text-text-faint
              "
              placeholder={'{\n  "title": "Grade 5 Fractions Test",\n  "sections": [...],\n  "questions": [...]\n}'}
              value={json}
              onChange={e => setJson(e.target.value)}
            />
          </div>

          {error && (
            <div className="
              text-xs text-danger bg-danger-bg
              border border-danger/20 rounded-xl px-3 py-2.5
            ">
              ⚠️ {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleParse}
            disabled={!json.trim()}
            className="
              text-sm font-medium
              bg-primary hover:bg-primary-hover
              text-white px-5 py-2 rounded-xl
              transition-all duration-150 shadow-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:shadow-md active:scale-[0.98]
            "
          >
            Parse & Preview →
          </button>
        </>
      )}

      {preview && (
        <ImportPreview
          preview={preview}
          hasExistingQuestions={hasExistingQuestions}
          onImport={onImport}
          onReset={() => { setPreview(null); setJson(''); setError(''); }}
        />
      )}
    </div>
  );
}

// ─── ImportPreview ─────────────────────────────────────────────────────────────
function ImportPreview({ preview, hasExistingQuestions, onImport, onReset }) {
  return (
    <div className="space-y-3">
      {/* Success header */}
      <div className="
        flex items-center justify-between
        bg-success-bg border border-success/25 rounded-2xl px-4 py-3
      ">
        <div>
          <p className="text-sm font-semibold text-success">{preview.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {preview.googleForm?.linked && (
              <span className="
                text-[10px] font-semibold
                bg-emerald-bg text-emerald
                px-2 py-0.5 rounded-full border border-emerald/20
              ">
                ✅ Google Form linked
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-success/50 hover:text-success transition-colors font-medium"
        >
          ← Re-enter
        </button>
      </div>

      {/* Warning */}
      {hasExistingQuestions && (
        <div className="
          text-xs text-warning bg-warning-bg
          border border-warning/25 rounded-xl px-3 py-2.5
          flex items-start gap-2
        ">
          <span className="flex-shrink-0">⚠️</span>
          <span>This will replace your existing questions.</span>
        </div>
      )}

      {/* Question list */}
      <div className="border border-border rounded-2xl overflow-hidden">
        {preview.sections.map(s => (
          <div key={s.id}>
            {/* Section header */}
            <div className="
              bg-background px-4 py-2.5
              flex items-center justify-between
              border-b border-border
            ">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                {s.name}
              </span>
              <span className="
                text-[11px] text-text-faint
                bg-surface border border-border
                px-2 py-0.5 rounded-full
              ">
                {s.questions.length} Q · {s.defaultMarks} mark each
              </span>
            </div>

            {/* Questions */}
            <div className="divide-y divide-border/50">
              {s.questions.map((q, qi) => (
                <div key={q.id} className="flex items-start gap-3 px-4 py-3 hover:bg-background transition-colors">
                  <span className="
                    text-[11px] font-bold text-text-faint
                    w-5 pt-px flex-shrink-0
                  ">
                    {qi + 1}
                  </span>
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt=""
                      className="h-12 w-16 object-cover rounded-lg border border-border flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-dark line-clamp-2">
                      {q.text || (
                        <span className="text-text-faint italic">Image-only question</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-text-faint">A · B · C · D</span>
                      <span className="
                        text-[11px] font-bold text-success
                        bg-success-bg px-1.5 py-0.5 rounded-full
                      ">
                        ✓ {q.correctAnswer}
                      </span>
                      {q.googleFormItemId && (
                        <span className="
                          text-[10px] font-medium text-indigo
                          bg-indigo-bg border border-indigo/15
                          px-1.5 py-0.5 rounded-full
                        ">
                          GForm linked
                        </span>
                      )}
                      {(q.explanation || q.explanationImageUrl) && (
                        <span className="
                          text-[10px] font-medium text-accent
                          bg-accent/8 border border-accent/15
                          px-1.5 py-0.5 rounded-full
                        ">
                          has solution
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Import CTA */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onImport(preview)}
          className="
            text-sm font-semibold
            bg-primary hover:bg-primary-hover
            text-white px-5 py-2.5 rounded-xl
            transition-all duration-150 shadow-sm
            hover:shadow-md active:scale-[0.98]
          "
        >
          Import {preview.totalQ} Questions →
        </button>
        <p className="text-xs text-text-faint">You can edit any question after import</p>
      </div>
    </div>
  );
}

// ─── mapExtractedData ──────────────────────────────────────────────────────────
function mapExtractedData(data) {
  const mcq = data.questions.filter(q =>
    q.type !== 'open-ended' &&
    q.options &&
    Object.keys(q.options).length >= 2 &&
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
        googleFormItemId: q.googleFormItemId || '',
        text: normalizeNewlines(q.text),
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
        isNameField: q.isNameField || false,
        isEmailField: q.isEmailField || false,
      })),
  })).filter(s => s.questions.length > 0);

  return {
    sections,
    title: data.title || '',
    googleForm: data.googleForm || null,
    totalQ: sections.reduce((a, s) => a + s.questions.length, 0),
  };
}

// ─── SectionsStep (default export) ────────────────────────────────────────────
export default function SectionsStep({ sections, setSections, onGFormImport }) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id);
  const [importTab, setImportTab] = useState('manual');
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);

  const activeSection = sections.find(s => s.id === activeSectionId);
  const totalExistingQ = sections.reduce((a, s) => a + s.questions.length, 0);

  const closeForm = () => { setShowForm(false); setEditingQ(null); };
  const switchSection = id => { setActiveSectionId(id); closeForm(); };

  const addSection = () => {
    const s = {
      id: uid(),
      name: `Section ${sections.length + 1}`,
      defaultMarks: 1,
      questions: [],
    };
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
      document.getElementById('question-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleGFormImport = (parsed) => {
    parsed.sections.forEach(s =>
      s.questions.forEach(q =>
        console.log(q.text?.slice(0, 20) || '[img only]', '→', q.imageSize)
      )
    );
    setSections(parsed.sections);
    setActiveSectionId(parsed.sections[0]?.id);
    closeForm();
    setImportTab('manual');
    onGFormImport?.(parsed);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">

      {/* ── Section sidebar ── */}
      <div className="w-full md:w-48 flex-shrink-0">
        <p className="text-[11px] font-semibold text-text-faint uppercase tracking-widest mb-2.5">
          Sections
        </p>
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0">
          {sections.map(s => {
            const active = s.id === activeSectionId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => switchSection(s.id)}
                className={`
                  text-left px-3 py-2.5 rounded-xl text-sm
                  transition-all duration-150 flex-shrink-0
                  ${active
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-surface border border-border text-text-dark hover:border-accent/30 hover:bg-background'
                  }
                `}
              >
                <div className="font-semibold truncate max-w-[120px] md:max-w-none">
                  {s.name || 'Untitled'}
                </div>
                <div className={`text-[11px] mt-0.5 ${active ? 'text-white/60' : 'text-text-faint'}`}>
                  {s.questions.length} Q
                </div>
              </button>
            );
          })}

          {/* Add section */}
          <button
            type="button"
            onClick={addSection}
            className="
              text-left px-3 py-2.5 rounded-xl text-sm
              border border-dashed border-border text-text-faint
              hover:border-accent hover:text-accent hover:bg-accent/3
              transition-all duration-150 flex-shrink-0
            "
          >
            + Add
          </button>
        </div>
      </div>

      {/* ── Active section editor ── */}
      {activeSection && (
        <div className="flex-1 min-w-0">

          {/* Section config bar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <input
              className={`
                border rounded-xl px-3 py-2 text-sm font-semibold
                outline-none bg-surface flex-1 min-w-[140px] max-w-xs
                transition-all duration-150
                ${!activeSection.name.trim()
                  ? 'border-danger/50 focus:border-danger focus:ring-2 focus:ring-danger/10'
                  : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/10'
                }
              `}
              value={activeSection.name}
              onChange={e => updateSection(activeSection.id, 'name', e.target.value)}
              placeholder="Section name"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-text-muted whitespace-nowrap">Default marks</span>
              <input
                type="number" min="0" step="0.5"
                className="
                  w-16 border border-border rounded-xl px-2 py-2
                  text-sm text-text-dark outline-none text-center bg-surface
                  focus:border-accent focus:ring-2 focus:ring-accent/10
                  transition-all duration-150
                "
                value={activeSection.defaultMarks}
                onChange={e => updateSection(activeSection.id, 'defaultMarks', e.target.value)}
              />
            </div>
            {sections.length > 1 && (
              <button
                type="button"
                onClick={() => deleteSection(activeSection.id)}
                className="
                  text-xs text-danger/60 hover:text-danger
                  hover:bg-danger-bg px-2 py-1 rounded-lg
                  transition-all duration-150 flex-shrink-0
                "
              >
                Delete section
              </button>
            )}
          </div>

          {/* Import tabs */}
          <div className="flex gap-0 mb-5 border border-border rounded-lg p-0.5 bg-background w-fit">
            {[['manual', 'Manual Entry'], ['gform', 'Google Form']].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setImportTab(k); closeForm(); }}
                className={`
                  text-xs px-4 py-1.5 rounded-[7px] font-medium
                  transition-all duration-150 whitespace-nowrap
                  ${importTab === k
                    ? 'bg-surface text-text-dark shadow-sm'
                    : 'text-text-muted hover:text-text-dark'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          {importTab === 'gform' ? (
            <GoogleFormPanel
              onImport={handleGFormImport}
              hasExistingQuestions={totalExistingQ > 0}
            />
          ) : (
            <>
              {/* Question list */}
              <div className="space-y-2 mb-3">
                {activeSection.questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="
                      flex items-start gap-3
                      border border-border rounded-xl px-3 py-3
                      bg-surface hover:border-border-strong hover:bg-background
                      group transition-all duration-150
                    "
                  >
                    {/* Index */}
                    <span className="
                      text-[11px] font-bold text-text-faint
                      w-6 pt-0.5 flex-shrink-0
                    ">
                      Q{i + 1}
                    </span>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      {q.imageUrl && !q.text && (
                        <img src={q.imageUrl} alt="" className="h-14 rounded-lg mb-1.5 object-contain" />
                      )}
                      <p className="text-sm text-text-dark truncate font-medium">
                        {q.text || '[Image question]'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-text-faint">A · B · C · D</span>
                        <span className="
                          text-[11px] font-bold text-success
                          bg-success-bg px-1.5 py-0.5 rounded-full
                        ">
                          ✓ {q.correctAnswer}
                        </span>
                        <span className="
                          text-[11px] text-text-faint
                          bg-background border border-border
                          px-1.5 py-0.5 rounded-full
                        ">
                          {q.marks || activeSection.defaultMarks || 1} mark
                        </span>
                        {q.imageUrl && (
                          <span className="
                            text-[10px] font-medium text-accent
                            bg-accent/8 border border-accent/15
                            px-1.5 py-0.5 rounded-full
                          ">
                            img · {q.imageSize || 'medium'}
                          </span>
                        )}
                        {q.tags?.length > 0 && (
                          <span className="
                            text-[10px] font-medium text-indigo
                            bg-indigo-bg border border-indigo/15
                            px-1.5 py-0.5 rounded-full
                          ">
                            {q.tags.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditQuestion(q)}
                        className="
                          text-xs font-medium text-accent
                          hover:bg-accent/8 px-2 py-1 rounded-lg
                          transition-colors
                        "
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuestion(q.id)}
                        className="
                          text-xs font-medium text-danger/60
                          hover:text-danger hover:bg-danger-bg
                          px-2 py-1 rounded-lg transition-colors
                        "
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {activeSection.questions.length === 0 && !showForm && (
                  <div className="
                    border-2 border-dashed border-border rounded-2xl py-12 text-center
                    bg-background
                  ">
                    <p className="text-2xl mb-2">📝</p>
                    <p className="text-sm font-medium text-text-muted">No questions yet</p>
                    <p className="text-xs text-text-faint mt-1">
                      Add your first question below
                    </p>
                  </div>
                )}
              </div>

              {/* Question form / Add button */}
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
                  className="
                    text-sm font-medium
                    border-2 border-dashed border-accent/30 text-accent
                    px-4 py-3 rounded-xl w-full
                    hover:bg-accent/5 hover:border-accent/50
                    transition-all duration-150
                    flex items-center justify-center gap-2
                  "
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