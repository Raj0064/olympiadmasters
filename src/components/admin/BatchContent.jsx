// src/components/admin/BatchContent.jsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getBatchContent,
  addContent,
  updateContent,
  deleteContent,
  getContentCompletions,
} from '../../services/content.service';
import { getBatchStudents } from '../../services/batch.service';
import {
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentCheck,
  HiOutlineBookOpen,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineEye,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineUsers,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExclamationTriangle,
  HiOutlineLink,
} from 'react-icons/hi2';

// ── Helpers ───────────────────────────────────────────────

function timeAgo(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatFullDate(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDriveEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (!m) return null;
  return `https://drive.google.com/file/d/${m[1]}/preview`;
}

function getDriveViewUrl(url) {
  if (!url) return url;
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (!m) return url;
  return `https://drive.google.com/file/d/${m[1]}/view`;
}

// ── Main Component ────────────────────────────────────────

export default function BatchContent({ batch }) {
  const { currentUser } = useAuth();
  const batchId = batch?.id;

  const [subTab, setSubTab] = useState('notes');
  const [content, setContent] = useState([]);
  const [students, setStudents] = useState([]);
  const [completionsMap, setCompletionsMap] = useState({}); // { contentId: [completions] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [expandedHw, setExpandedHw] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // for confirm dialog

  // ── Load content + students ──
  const loadData = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError('');
    try {
      const [contentData, studentsData] = await Promise.all([
        getBatchContent(batchId),
        getBatchStudents(batchId),
      ]);
      setContent(contentData || []);
      setStudents(studentsData || []);
    } catch (e) {
      console.error('BatchContent load error:', e);
      setError('Failed to load content.');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Load completions for a specific homework ──
  async function loadCompletions(contentId) {
    if (completionsMap[contentId]) return; // already loaded
    try {
      const data = await getContentCompletions(contentId);
      // Map userId to student name
      const enriched = data.map((c) => {
        const student = students.find((s) => s.id === c.userId);
        return { ...c, name: student?.name || 'Unknown Student' };
      });
      setCompletionsMap((prev) => ({ ...prev, [contentId]: enriched }));
    } catch (e) {
      console.error('loadCompletions error:', e);
    }
  }

  // ── Toggle expanded homework ──
  function toggleExpand(contentId) {
    if (expandedHw === contentId) {
      setExpandedHw(null);
    } else {
      setExpandedHw(contentId);
      loadCompletions(contentId);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteContent(batchId, deleteTarget.id);
      setContent((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      // Clean up completions cache
      setCompletionsMap((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
    } catch (e) {
      console.error('deleteContent error:', e);
      setError('Failed to delete.');
      setDeleteTarget(null);
    }
  }

  // ── Save (add/edit) ──
  async function handleSaveContent(formData) {
    try {
      if (editingItem) {
        await updateContent(batchId, editingItem.id, formData);
        setContent((prev) =>
          prev.map((c) =>
            c.id === editingItem.id ? { ...c, ...formData } : c
          )
        );
      } else {
        const newId = await addContent(batchId, {
          ...formData,
          createdBy: currentUser?.uid || '',
        });
        // Reload to get server timestamp
        const updated = await getBatchContent(batchId);
        setContent(updated || []);
      }
      setShowAddModal(false);
      setEditingItem(null);
    } catch (e) {
      console.error('saveContent error:', e);
      throw e; // Let modal handle the error
    }
  }

  // ── Filter & counts ──
  const typeMap = { notes: 'note', homework: 'homework', materials: 'material' };

  const filtered = content
    .filter((c) => c.type === typeMap[subTab])
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

  const tabCounts = {
    notes: content.filter((c) => c.type === 'note').length,
    homework: content.filter((c) => c.type === 'homework').length,
    materials: content.filter((c) => c.type === 'material').length,
  };

  const tabColors = {
    notes: 'bg-blue-100 text-blue-700',
    homework: 'bg-orange-100 text-orange-700',
    materials: 'bg-purple-100 text-purple-700',
  };

  const subTabs = [
    { key: 'notes', label: 'Notes', icon: HiOutlineDocumentText },
    { key: 'homework', label: 'Homework', icon: HiOutlineClipboardDocumentCheck },
    { key: 'materials', label: 'Materials', icon: HiOutlineBookOpen },
  ];

  // ── Loading ──
  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500
                        rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-300">Loading content…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200
                      rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Sub-tabs + Add button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setSubTab(tab.key);
                  setExpandedHw(null);
                }}
                className={`px-2.5 py-1.5 text-[11.5px] font-medium rounded-md transition-all
                  cursor-pointer whitespace-nowrap flex items-center gap-1.5
                  ${subTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-700'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold
                      ${subTab === tab.key ? tabColors[tab.key] : 'bg-gray-200 text-gray-500'}`}
                  >
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setEditingItem(null);
            setShowAddModal(true);
          }}
          className="text-xs bg-blue-600 text-white px-3.5 py-2 rounded-lg
                     hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <HiOutlinePlus className="w-3.5 h-3.5" />
          Add {subTab === 'notes' ? 'Note' : subTab === 'homework' ? 'Homework' : 'Material'}
        </button>
      </div>

      {/* Content list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-300">No {subTab} added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isHw = item.type === 'homework';
            const isExpanded = expandedHw === item.id;
            const completions = completionsMap[item.id] || [];
            const hasFile = !!item.fileUrl;

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden
                           hover:border-gray-200 transition-colors"
              >
                {/* Main row */}
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* File preview */}
                  {hasFile ? (
                    <button
                      onClick={() =>
                        setViewingFile({
                          title: item.title,
                          embedUrl: getDriveEmbedUrl(item.fileUrl),
                          viewUrl: getDriveViewUrl(item.fileUrl),
                        })
                      }
                      className={`w-10 h-10 rounded-lg flex items-center justify-center
                        shrink-0 cursor-pointer hover:scale-105 transition-transform
                        ${item.type === 'note'
                          ? 'bg-blue-50 text-blue-500'
                          : item.type === 'homework'
                            ? 'bg-orange-50 text-orange-500'
                            : 'bg-purple-50 text-purple-500'
                        }`}
                    >
                      <HiOutlineEye className="w-4.5 h-4.5" />
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center
                                    justify-center shrink-0">
                      <HiOutlineDocumentText className="w-4.5 h-4.5 text-gray-300" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <HiOutlineCalendarDays className="w-3 h-3" />
                        {timeAgo(item.createdAt)}
                      </span>
                      {item.description && (
                        <span className="text-[11px] text-gray-300 truncate max-w-[200px]">
                          {item.description}
                        </span>
                      )}
                      {hasFile && (
                        <span className="text-[11px] text-gray-300 flex items-center gap-1">
                          <HiOutlineLink className="w-3 h-3" />
                          File
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Homework completion count */}
                  {isHw && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                                 bg-gray-50 hover:bg-gray-100 transition-colors
                                 cursor-pointer shrink-0"
                    >
                      <HiOutlineUsers className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-700">
                        {completions.length}/{students.length || '?'}
                      </span>
                      {isExpanded ? (
                        <HiOutlineChevronUp className="w-3 h-3 text-gray-400" />
                      ) : (
                        <HiOutlineChevronDown className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {hasFile && (
                      <a
                        href={getDriveViewUrl(item.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400
                                   hover:text-gray-700 transition-colors"
                        title="Open in new tab"
                      >
                        <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setShowAddModal(true);
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400
                                 hover:text-gray-700 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400
                                 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded: Who completed */}
                {isHw && isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                    <p className="text-[11px] font-medium text-gray-500 mb-2">
                      Completed by ({completions.length})
                    </p>
                    {completions.length === 0 ? (
                      <p className="text-[11px] text-gray-300 py-2">
                        No one has completed this yet
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {completions.map((c, idx) => (
                          <div
                            key={c.id || idx}
                            className="flex items-center justify-between py-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 w-4">
                                {idx + 1}.
                              </span>
                              <span className="text-[12px] font-medium text-gray-700">
                                {c.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <HiOutlineCheckCircle className="w-3 h-3 text-green-500" />
                              {formatFullDate(c.completedAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {students.length > completions.length && (
                      <div className="mt-3 pt-2 border-t border-gray-200/50">
                        <p className="text-[10px] text-gray-400">
                          ⚠️ {students.length - completions.length} student
                          {students.length - completions.length !== 1 ? 's' : ''} haven't
                          completed yet
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {deleteTarget && (
        <DeleteConfirmDialog
          item={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Add/Edit Modal ── */}
      {showAddModal && (
        <ContentFormModal
          type={typeMap[subTab]}
          editingItem={editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveContent}
        />
      )}

      {/* ── File Viewer ── */}
      {viewingFile && (
        <FileViewer
          title={viewingFile.title}
          embedUrl={viewingFile.embedUrl}
          viewUrl={viewingFile.viewUrl}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────

function DeleteConfirmDialog({ item, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      setDeleting(false);
    }
  }

  const typeLabel =
    item.type === 'note' ? 'Note' : item.type === 'homework' ? 'Homework' : 'Material';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-red-600">Delete {typeLabel}?</h2>
          <p className="text-xs text-gray-400 mt-1">
            This action cannot be undone
          </p>
        </div>

        {/* What's being deleted */}
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center
                            justify-center shrink-0">
              <HiOutlineTrash className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">
                {item.title}
              </p>
              {item.description && (
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {item.description}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <HiOutlineCalendarDays className="w-3 h-3" />
                Added {timeAgo(item.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Warning for homework */}
        {item.type === 'homework' && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50
                          border border-amber-200 rounded-xl">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-amber-800">
              All student completion records for this homework will also be permanently deleted.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-red-100 bg-red-50/30 py-3">
            <p className="text-lg font-bold text-red-600">1</p>
            <p className="text-[10px] text-red-500 font-medium">{typeLabel}</p>
          </div>
          {item.type === 'homework' && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/30 py-3">
              <p className="text-lg font-bold text-amber-600">All</p>
              <p className="text-[10px] text-amber-500 font-medium">Completions</p>
            </div>
          )}
          {item.fileUrl && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 py-3">
              <p className="text-lg font-bold text-gray-500">1</p>
              <p className="text-[10px] text-gray-400 font-medium">File Link</p>
            </div>
          )}
        </div>

        {/* Confirm text */}
        <p className="text-sm text-gray-500 text-center">
          Are you sure you want to delete this?
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-gray-200 bg-transparent py-2.5
                       text-sm font-medium text-gray-700 hover:bg-gray-50
                       transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold
                       text-white hover:bg-red-700 transition
                       disabled:opacity-50 cursor-pointer"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Content Modal ────────────────────────────────

function ContentFormModal({ type, editingItem, onClose, onSave }) {
  const [form, setForm] = useState({
    title: editingItem?.title || '',
    description: editingItem?.description || '',
    fileUrl: editingItem?.fileUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const typeLabel = type === 'note' ? 'Note' : type === 'homework' ? 'Homework' : 'Material';
  const valid = form.title.trim();

  function field(key) {
    return {
      value: form[key],
      onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        type,
        title: form.title.trim(),
        description: form.description.trim(),
        fileUrl: form.fileUrl.trim() || null,
      });
    } catch (e) {
      setError(e?.message || 'Failed to save.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center
                 justify-center z-50 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {editingItem ? 'Edit' : 'Add'} {typeLabel}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {editingItem
                ? 'Update the details below'
                : `Post a new ${typeLabel.toLowerCase()} for this batch`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       hover:bg-gray-100 text-gray-400 hover:text-gray-700
                       transition-colors text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Title *
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         outline-none focus:border-blue-400 bg-white
                         placeholder:text-gray-300"
              placeholder="e.g. Chapter 5 — Quadratic Equations"
              {...field('title')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Description
              <span className="text-gray-300 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         outline-none focus:border-blue-400 bg-white
                         placeholder:text-gray-300 resize-none"
              rows={2}
              placeholder="Brief description..."
              {...field('description')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Google Drive Link
              <span className="text-gray-300 font-normal ml-1">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         outline-none focus:border-blue-400 bg-white
                         placeholder:text-gray-300"
              placeholder="https://drive.google.com/file/d/..."
              {...field('fileUrl')}
            />
            <p className="text-[10px] text-gray-300 mt-1 flex items-center gap-1">
              <HiOutlineExclamationTriangle className="w-3 h-3" />
              Make sure the link is set to "Anyone with the link can view"
            </p>
          </div>

          {/* Link Preview */}
          {form.fileUrl.trim() && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border
                            border-blue-100 rounded-lg">
              <HiOutlineLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-[11px] text-blue-700 truncate flex-1">
                {form.fileUrl.trim()}
              </span>
              <a
                href={form.fileUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
              >
                Test ↗
              </a>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200
                          rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-5
                        border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2
                       transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="text-sm bg-blue-600 text-white px-5 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving…' : editingItem ? 'Save Changes' : `Post ${typeLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fullscreen File Viewer ────────────────────────────────

function FileViewer({ title, embedUrl, viewUrl, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/60
                      backdrop-blur-sm border-b border-white/10">
        <p className="text-white text-[14px] font-medium truncate flex-1 mr-4">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium
                         rounded-md bg-white/10 text-white hover:bg-white/20
                         transition-colors"
            >
              <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Drive</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors
                       cursor-pointer"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 relative bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="autoplay"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <HiOutlineDocumentText className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/50 text-sm mb-4">Cannot preview this file</p>
              {viewUrl && (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px]
                             font-medium rounded-lg bg-white text-gray-900
                             hover:bg-gray-100 transition-colors"
                >
                  <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
                  Open in Google Drive
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}