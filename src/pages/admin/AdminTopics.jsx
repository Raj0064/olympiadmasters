// pages/admin/AdminTopics.jsx
import { useEffect, useState, useRef } from 'react';
import {
  getTopics, createTopic, updateTopic, deleteTopic,
  getSubtopics, createSubtopic, updateSubtopic, deleteSubtopic,
} from '../../services/topic.service';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Loader from '../../components/ui/Loader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiCheck, FiX, FiPlus, FiTrash2, FiChevronDown, FiChevronRight } from 'react-icons/fi';

// ─── Grade options — add more as platform grows ────────────────────────────────
const GRADE_OPTIONS = ['4', '5', '6', '7', '8'];

// ─── Create Topic Modal ────────────────────────────────────────────────────────
function CreateTopicModal({ open, onClose, onCreated }) {
  const [topicName, setTopicName] = useState('');
  const [grade, setGrade] = useState('4');
  const [subtopics, setSubtopics] = useState(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTopicName(''); setGrade('4'); setSubtopics(['']); setError('');
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSubtopicChange(i, val) {
    setSubtopics((p) => p.map((s, idx) => (idx === i ? val : s)));
  }

  function addSubtopicRow() { setSubtopics((p) => [...p, '']); }
  function removeSubtopicRow(i) { setSubtopics((p) => p.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    if (!topicName.trim()) { setError('Topic name is required.'); return; }
    setSaving(true); setError('');
    try {
      const topicId = await createTopic({ name: topicName.trim(), grade });
      const validSubs = subtopics.map((s) => s.trim()).filter(Boolean);
      await Promise.all(validSubs.map((name) => createSubtopic({ name, topicId, grade })));
      onCreated({ id: topicId, name: topicName.trim(), grade });
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text-dark">Create Topic</h3>
            <p className="text-xs text-text-muted mt-0.5">Add a new topic and its subtopics</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-text-faint hover:text-text-dark transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2 text-sm text-danger bg-danger-bg border border-danger/20 rounded-lg px-3 py-2.5">
              <FiX className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Topic Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
              Topic Name <span className="text-danger">*</span>
            </label>
            <input
              ref={nameRef}
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Fractions, Geometry, Measurement…"
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-colors"
            />
          </div>

          {/* Grade Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
              Grade <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GRADE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={[
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    grade === g
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-white text-text-muted border-border hover:border-accent/60 hover:text-accent',
                  ].join(' ')}
                >
                  Class {g}
                </button>
              ))}
            </div>
          </div>

          {/* Subtopics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                Subtopics
              </label>
              <span className="text-xs text-text-faint">optional · press Enter to add next</span>
            </div>

            <div className="space-y-2">
              {subtopics.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-text-faint text-xs w-5 text-right flex-shrink-0 font-mono">
                    {i + 1}.
                  </span>
                  <input
                    id={`sub-input-${i}`}
                    value={s}
                    onChange={(e) => handleSubtopicChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (i === subtopics.length - 1) {
                          addSubtopicRow();
                          setTimeout(() => document.getElementById(`sub-input-${i + 1}`)?.focus(), 50);
                        } else {
                          document.getElementById(`sub-input-${i + 1}`)?.focus();
                        }
                      }
                    }}
                    placeholder={`Subtopic ${i + 1}…`}
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-colors"
                  />
                  <button
                    onClick={() => removeSubtopicRow(i)}
                    aria-label="Remove subtopic"
                    className={[
                      'w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0',
                      subtopics.length > 1
                        ? 'text-text-faint hover:text-danger hover:bg-danger-bg'
                        : 'opacity-0 pointer-events-none',
                    ].join(' ')}
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                addSubtopicRow();
                setTimeout(() => document.getElementById(`sub-input-${subtopics.length}`)?.focus(), 50);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors mt-1"
            >
              <FiPlus className="w-3.5 h-3.5" />
              Add another subtopic
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-black/[0.01] flex-shrink-0 rounded-b-2xl sm:rounded-b-2xl">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !topicName.trim()}>
            {saving ? 'Creating…' : 'Create Topic'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Edit ──────────────────────────────────────────────────────────────
function InlineEdit({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = val.trim();
    if (!trimmed || trimmed === value) { cancel(); return; }
    setSaving(true);
    try { await onSave(trimmed); setEditing(false); }
    catch { setVal(value); setEditing(false); }
    finally { setSaving(false); }
  }

  function cancel() { setVal(value); setEditing(false); }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-1">
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancel(); }}
          className="flex-1 text-sm border border-accent rounded-md px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-accent/25 min-w-0"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          aria-label="Save"
          className="w-6 h-6 flex items-center justify-center text-success hover:text-success/80 flex-shrink-0"
        >
          <FiCheck className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={cancel}
          aria-label="Cancel"
          className="w-6 h-6 flex items-center justify-center text-text-faint hover:text-danger flex-shrink-0"
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <span className="group flex items-center gap-1.5 min-w-0">
      <span className="text-sm font-medium text-text-dark truncate">{value}</span>
      <button
        onClick={() => { setVal(value); setEditing(true); }}
        aria-label="Edit"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-faint hover:text-accent flex-shrink-0"
      >
        <FiEdit2 className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── Topic Row ────────────────────────────────────────────────────────────────
function TopicRow({ topic, onDelete, onRename }) {
  const [subtopics, setSubtopics] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [addingSubtopic, setAddingSubtopic] = useState(false);
  const [deleteSubTarget, setDeleteSubTarget] = useState(null);
  const [deletingSubtopic, setDeletingSubtopic] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newSub, setNewSub] = useState('');

  useEffect(() => {
    getSubtopics(topic.id)
      .then(setSubtopics)
      .finally(() => setLoadingSubs(false));
  }, [topic.id]);

  async function handleRenameSubtopic(subtopicId, name) {
    await updateSubtopic(subtopicId, { name });
    setSubtopics((p) => p.map((s) => (s.id === subtopicId ? { ...s, name } : s)));
  }

  async function handleAddSubtopic() {
    const name = newSub.trim();
    if (!name) return;
    setAddingSubtopic(true);
    try {
      const id = await createSubtopic({ name, topicId: topic.id, grade: topic.grade });
      setSubtopics((p) => [...p, { id, name, topicId: topic.id, grade: topic.grade }]);
      setNewSub('');
    } finally {
      setAddingSubtopic(false);
    }
  }

  async function handleDeleteSubtopic() {
    if (!deleteSubTarget) return;
    setDeletingSubtopic(true);
    try {
      await deleteSubtopic(deleteSubTarget.id);
      setSubtopics((p) => p.filter((s) => s.id !== deleteSubTarget.id));
      setDeleteSubTarget(null);
    } finally {
      setDeletingSubtopic(false);
    }
  }

  return (
    <div className={[
      'border rounded-xl overflow-hidden transition-colors',
      expanded ? 'border-accent/30 shadow-sm' : 'border-border',
    ].join(' ')}>

      {/* ── Topic Header ── */}
      <div
        className={[
          'flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors',
          expanded ? 'bg-accent/[0.04]' : 'bg-black/[0.01] hover:bg-black/[0.03]',
        ].join(' ')}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand icon */}
        <span className="text-text-faint flex-shrink-0">
          {expanded
            ? <FiChevronDown className="w-4 h-4" />
            : <FiChevronRight className="w-4 h-4" />}
        </span>

        {/* Name — stop propagation so InlineEdit click doesn't toggle */}
        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <InlineEdit value={topic.name} onSave={(name) => onRename(topic.id, name)} />
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="info">Class {topic.grade}</Badge>
          <Badge variant="neutral" className="hidden sm:inline-flex">
            {loadingSubs ? '…' : `${subtopics.length} sub`}
          </Badge>
        </div>

        {/* Delete — stop propagation */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(topic); }}
          aria-label="Delete topic"
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-faint hover:text-danger hover:bg-danger-bg transition-colors flex-shrink-0"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Expanded Subtopics ── */}
      {expanded && (
        <div className="px-4 py-4 border-t border-border/60 bg-white space-y-3">

          {loadingSubs ? (
            <p className="text-xs text-text-muted py-2 text-center">Loading subtopics…</p>
          ) : subtopics.length === 0 ? (
            <p className="text-xs text-text-faint py-2 text-center">
              No subtopics yet — add one below.
            </p>
          ) : (
            <div className="space-y-1">
              {subtopics.map((s, i) => (
                <div
                  key={s.id}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-black/[0.02] transition-colors"
                >
                  <span className="text-text-faint text-xs font-mono w-4 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <InlineEdit value={s.name} onSave={(name) => handleRenameSubtopic(s.id, name)} />
                  </div>
                  <button
                    onClick={() => setDeleteSubTarget(s)}
                    aria-label={`Remove ${s.name}`}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-text-faint hover:text-danger hover:bg-danger-bg transition-all flex-shrink-0"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Subtopic */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <FiPlus className="w-3.5 h-3.5 text-text-faint flex-shrink-0" />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtopic()}
              placeholder="Add subtopic…"
              className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-text-faint py-1"
            />
            <button
              onClick={handleAddSubtopic}
              disabled={!newSub.trim() || addingSubtopic}
              className="text-xs font-medium text-accent hover:text-accent/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 px-2 py-1"
            >
              {addingSubtopic ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteSubTarget}
        title="Remove Subtopic?"
        description={
          <>
            "<span className="font-semibold text-text-dark">{deleteSubTarget?.name}</span>"
            will be removed. Questions using this subtopic will lose their tag.
          </>
        }
        confirmLabel={deletingSubtopic ? 'Removing…' : 'Remove'}
        confirmVariant="danger"
        loading={deletingSubtopic}
        onConfirm={handleDeleteSubtopic}
        onCancel={() => setDeleteSubTarget(null)}
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminTopics() {
  const navigate = useNavigate();
  const [allTopics, setAllTopics] = useState([]);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Grade pills derived from actual data
  const uniqueGrades = [...new Set(allTopics.map((t) => t.grade).filter(Boolean))].sort();

  const filteredTopics = gradeFilter === 'all'
    ? allTopics
    : allTopics.filter((t) => t.grade === gradeFilter);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setAllTopics(await getTopics()); }
    catch { setError('Failed to load topics.'); }
    finally { setLoading(false); }
  }

  function handleTopicCreated(newTopic) {
    setAllTopics((p) => [...p, newTopic]);
  }

  async function handleRenameTopic(topicId, newName) {
    const prev = allTopics.find((t) => t.id === topicId);
    setAllTopics((p) => p.map((t) => (t.id === topicId ? { ...t, name: newName } : t)));
    try { await updateTopic(topicId, { name: newName }); }
    catch { setAllTopics((p) => p.map((t) => (t.id === topicId ? prev : t))); setError('Rename failed.'); }
  }

  async function handleDeleteTopic() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTopic(deleteTarget.id);
      setAllTopics((p) => p.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6 sm:mb-8">
        {[
          { key: 'exams', label: 'Exams', path: '/admin/exams' },
          { key: 'topics', label: 'Topics', path: '/admin/topics' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab.key === 'topics'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-dark',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-text-dark">Topics</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Manage topics and subtopics used to tag questions
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          + Create Topic
        </Button>
      </div>

      {/* Grade Filter — only show once data loaded */}
      {!loading && uniqueGrades.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {['all', ...uniqueGrades].map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                gradeFilter === g
                  ? 'bg-accent text-white border-accent'
                  : 'text-text-muted border-border hover:border-accent/60 hover:text-accent',
              ].join(' ')}
            >
              {g === 'all' ? `All (${allTopics.length})` : `Class ${g} (${allTopics.filter(t => t.grade === g).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-5 flex items-start gap-3 text-sm bg-danger-bg border border-danger/20 rounded-xl px-4 py-3 text-danger">
          <FiX className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-danger/50 hover:text-danger font-bold text-lg leading-none">×</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card className="py-16 flex items-center justify-center">
          <Loader />
        </Card>
      )}

      {/* Content */}
      {!loading && (
        <Card className="p-5 sm:p-6">
          {/* Card Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-dark">
              {gradeFilter === 'all' ? 'All Topics' : `Class ${gradeFilter} Topics`}
              <span className="ml-2 font-normal text-text-faint">({filteredTopics.length})</span>
            </h3>
            {filteredTopics.length > 0 && (
              <span className="text-xs text-text-faint hidden sm:block">
                Click a row to expand · click name to rename
              </span>
            )}
          </div>

          {filteredTopics.length === 0 ? (
            <EmptyState
              title={gradeFilter === 'all' ? 'No topics yet' : `No topics for Class ${gradeFilter}`}
              description={
                gradeFilter === 'all'
                  ? 'Create your first topic to start tagging questions.'
                  : 'Try switching to All or create a topic for this grade.'
              }
              action={
                gradeFilter === 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setShowModal(true)}>
                    + Create your first topic
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredTopics.map((t) => (
                <TopicRow
                  key={t.id}
                  topic={t}
                  onDelete={(topic) => setDeleteTarget({ id: topic.id, name: topic.name })}
                  onRename={handleRenameTopic}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      <CreateTopicModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleTopicCreated}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Topic?"
        description={
          <>
            "<span className="font-semibold text-text-dark">{deleteTarget?.name}</span>"
            and all its subtopics will be permanently deleted. Questions tagged with this
            topic will lose their link. This cannot be undone.
          </>
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDeleteTopic}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
