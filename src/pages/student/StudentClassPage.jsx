// src/pages/student/StudentClass.jsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getBatchContent,
  markComplete,
  getStudentCompletions,
} from '../../services/content.service';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentCheck,
  HiOutlineBookOpen,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineSquares2X2,
  HiOutlineListBullet,
  HiOutlineUsers,
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

function getDriveEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/) || url.match(/\/document\/d\/([^/]+)/);
  if (!m) return null;
  return `https://drive.google.com/file/d/${m[1]}/preview`;
}

function getDriveThumbnailUrl(url) {
  if (!url) return null;
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/) || url.match(/\/document\/d\/([^/]+)/);
  if (!m) return null;
  return `https://lh3.googleusercontent.com/d/${m[1]}=w400`;
}

function getDriveViewUrl(url) {
  if (!url) return url;
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/) || url.match(/\/document\/d\/([^/]+)/);
  if (!m) return url;
  return `https://drive.google.com/file/d/${m[1]}/view`;
}

// ── Main Component ────────────────────────────────────────

export default function StudentClass() {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('homework');
  const [viewMode, setViewMode] = useState('grid');
  const [content, setContent] = useState([]);
  // { [contentId]: { completedAt } }
  const [completedMap, setCompletedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [viewingFile, setViewingFile] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [markingId, setMarkingId] = useState(null); // loading state per item

  const batchId = userProfile?.batchId;
  const uid = currentUser?.uid;

  // ── Load content + completions ──
  const loadData = useCallback(async () => {
    if (!batchId || !uid) return;
    setLoading(true);
    setError('');
    try {
      const [contentData, completionsData] = await Promise.all([
        getBatchContent(batchId),
        getStudentCompletions(uid),
      ]);

      setContent(contentData || []);

      // Build completedMap { contentId: { completedAt } }
      const map = {};
      (completionsData || []).forEach((c) => {
        if (c.contentId) map[c.contentId] = { completedAt: c.completedAt };
      });
      setCompletedMap(map);
    } catch (e) {
      console.error('StudentClass load error:', e);
      setError('Failed to load class content. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [batchId, uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Mark Complete ──
  async function handleMarkComplete(contentId) {
    if (!uid || !batchId) return;
    setMarkingId(contentId);
    try {
      await markComplete(contentId, uid, batchId);
      setCompletedMap((prev) => ({
        ...prev,
        [contentId]: { completedAt: new Date() },
      }));
    } catch (e) {
      console.error('markComplete error:', e);
      // Already completed or error — refresh to sync
      if (e?.message === 'Already marked as completed') {
        setCompletedMap((prev) => ({
          ...prev,
          [contentId]: { completedAt: new Date() },
        }));
      }
    } finally {
      setMarkingId(null);
      setConfirmingId(null);
    }
  }

  // ── Filter & sort ──
  const typeMap = { homework: 'homework', notes: 'note', materials: 'material' };

  const filtered = content
    .filter((c) => c.type === typeMap[activeTab])
    .sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return db_ - da;
    });

  const allHomework = content.filter((c) => c.type === 'homework');
  const completedCount = allHomework.filter((h) => completedMap[h.id]).length;
  const pendingCount = allHomework.length - completedCount;

  const tabCounts = {
    notes: content.filter((c) => c.type === 'note').length,
    homework: allHomework.length,
    materials: content.filter((c) => c.type === 'material').length,
  };

  const tabColors = {
    homework: 'bg-orange-100 text-orange-700',
    notes: 'bg-blue-100 text-blue-700',
    materials: 'bg-purple-100 text-purple-700',
  };

  const tabs = [
    { key: 'homework', label: 'Homework', icon: HiOutlineClipboardDocumentCheck },
    { key: 'notes', label: 'Notes', icon: HiOutlineDocumentText },
    { key: 'materials', label: 'Materials', icon: HiOutlineBookOpen },
  ];

  const emptyMessages = {
    notes: 'No class notes posted yet',
    homework: 'No homework assigned yet',
    materials: 'No materials shared yet',
  };

  // ── No batch ──
  if (!batchId && !loading) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-dark">Class</h2>
          <p className="text-sm text-muted mt-0.5">
            Grade {userProfile?.grade || '—'} · Olympiad Maths
          </p>
        </div>
        <EmptyState message="You are not assigned to a batch yet. Contact your admin." />
      </div>
    );
  }

  // ── Loading ──
  if (loading) return <ClassSkeleton viewMode={viewMode} />;

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-dark">Class</h2>
        </div>
        <EmptyState message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-dark">Class</h2>
          <p className="text-sm text-muted mt-0.5">
            Grade {userProfile?.grade || '—'} · Olympiad Maths
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'grid'
              ? 'bg-white shadow-sm text-dark'
              : 'text-muted hover:text-dark'
              }`}
            title="Grid view"
          >
            <HiOutlineSquares2X2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'list'
              ? 'bg-white shadow-sm text-dark'
              : 'text-muted hover:text-dark'
              }`}
            title="List view"
          >
            <HiOutlineListBullet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Homework Progress */}
      {activeTab === 'homework' && allHomework.length > 0 && (
        <Card className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-dark">
                  {completedCount}/{allHomework.length} Completed
                </p>
                <p className="text-[11.5px] text-muted">
                  {pendingCount > 0 ? `${pendingCount} pending` : 'All done! 🎉'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-orange-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${allHomework.length > 0
                      ? (completedCount / allHomework.length) * 100
                      : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-orange-600">
                {allHomework.length > 0
                  ? Math.round((completedCount / allHomework.length) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setConfirmingId(null);
              }}
              className={`px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-all
                cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.key
                  ? 'bg-white text-dark shadow-sm'
                  : 'text-muted hover:text-dark'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key
                    ? tabColors[tab.key]
                    : 'bg-slate-200 text-slate-500'
                    }`}
                >
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState message={emptyMessages[activeTab]} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) => (
            <GridCard
              key={item.id}
              item={item}
              isHomework={item.type === 'homework'}
              isCompleted={!!completedMap[item.id]}
              isConfirming={confirmingId === item.id}
              isMarking={markingId === item.id}
              completedAt={completedMap[item.id]?.completedAt}
              onView={() =>
                setViewingFile({
                  title: item.title,
                  embedUrl: getDriveEmbedUrl(item.fileUrl),
                  viewUrl: getDriveViewUrl(item.fileUrl),
                })
              }
              onConfirmStart={() => setConfirmingId(item.id)}
              onConfirmCancel={() => setConfirmingId(null)}
              onMarkComplete={() => handleMarkComplete(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <ListCard
              key={item.id}
              item={item}
              isHomework={item.type === 'homework'}
              isCompleted={!!completedMap[item.id]}
              isConfirming={confirmingId === item.id}
              isMarking={markingId === item.id}
              completedAt={completedMap[item.id]?.completedAt}
              onView={() =>
                setViewingFile({
                  title: item.title,
                  embedUrl: getDriveEmbedUrl(item.fileUrl),
                  viewUrl: getDriveViewUrl(item.fileUrl),
                })
              }
              onConfirmStart={() => setConfirmingId(item.id)}
              onConfirmCancel={() => setConfirmingId(null)}
              onMarkComplete={() => handleMarkComplete(item.id)}
            />
          ))}
        </div>
      )}

      {/* Fullscreen Viewer */}
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

// ── Grid Card ─────────────────────────────────────────────

function GridCard({
  item,
  isHomework,
  isCompleted,
  isConfirming,
  isMarking,
  completedAt,
  onView,
  onConfirmStart,
  onConfirmCancel,
  onMarkComplete,
}) {
  const hasFile = !!item.fileUrl;
  const thumbnailUrl = getDriveThumbnailUrl(item.fileUrl);

  const accentColor = isHomework
    ? isCompleted
      ? 'border-green-400'
      : 'border-orange-400'
    : item.type === 'note'
      ? 'border-blue-400'
      : 'border-purple-400';

  const iconBg = isHomework
    ? isCompleted
      ? 'bg-green-50 text-green-500'
      : 'bg-orange-50 text-orange-500'
    : item.type === 'note'
      ? 'bg-blue-50 text-blue-500'
      : 'bg-purple-50 text-purple-500';

  return (
    <div
      className={`group relative flex flex-col rounded-xl border-2 ${accentColor}
        bg-white overflow-hidden transition-all hover:shadow-lg
        ${isCompleted ? 'opacity-65' : ''}`}
    >
      {/* Thumbnail */}
      <button
        onClick={hasFile ? onView : undefined}
        className={`relative w-full aspect-[4/3] bg-slate-50 overflow-hidden
          ${hasFile ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform
                         group-hover:scale-105"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div
              className="hidden w-full h-full items-center justify-center
                          absolute inset-0 bg-slate-50"
            >
              <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center
                               justify-center`}>
                <HiOutlineDocumentText className="w-7 h-7" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center
                             justify-center`}>
              <HiOutlineDocumentText className="w-7 h-7" />
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        {hasFile && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40
                          transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all
                            transform scale-90 group-hover:scale-100">
              <div className="w-11 h-11 rounded-full bg-white/90 flex items-center
                               justify-center shadow-lg">
                <HiOutlineEye className="w-5 h-5 text-dark" />
              </div>
            </div>
          </div>
        )}

        {/* Status Badge */}
        {isHomework && (
          <div className="absolute top-2 right-2">
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm ${isCompleted
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 text-white'
                }`}
            >
              {isCompleted ? '✓ DONE' : 'PENDING'}
            </span>
          </div>
        )}

        {/* Completed Overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-green-500/10 flex items-center
                          justify-center">
            <HiOutlineCheckCircle className="w-10 h-10 text-green-500/50" />
          </div>
        )}
      </button>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-2 flex-1">
        <p
          className={`text-[12.5px] font-semibold leading-snug line-clamp-2 ${isCompleted ? 'text-muted line-through' : 'text-dark'
            }`}
        >
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <HiOutlineCalendarDays className="w-3 h-3 text-faint shrink-0" />
          <span className="text-[10.5px] text-faint">{timeAgo(item.createdAt)}</span>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="px-3 pb-3">
        {isHomework && !isCompleted && !isConfirming && (
          <button
            onClick={onConfirmStart}
            disabled={isMarking}
            className="w-full py-1.5 text-[11px] font-semibold rounded-lg
                       bg-green-600 text-white hover:bg-green-700 transition-colors
                       cursor-pointer disabled:opacity-50"
          >
            {isMarking ? '…' : '✓ Mark Done'}
          </button>
        )}

        {isHomework && !isCompleted && isConfirming && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1
                          rounded-md flex items-start gap-1">
              <HiOutlineExclamationTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              Sure? Can't undo
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={onConfirmCancel}
                disabled={isMarking}
                className="flex-1 py-1 text-[10px] font-medium rounded-md border
                           border-slate-200 text-muted hover:bg-slate-50
                           cursor-pointer disabled:opacity-50"
              >
                No
              </button>
              <button
                onClick={onMarkComplete}
                disabled={isMarking}
                className="flex-1 py-1 text-[10px] font-semibold rounded-md
                           bg-green-600 text-white hover:bg-green-700
                           cursor-pointer disabled:opacity-50"
              >
                {isMarking ? '…' : 'Yes'}
              </button>
            </div>
          </div>
        )}

        {isHomework && isCompleted && completedAt && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <HiOutlineCheckCircle className="w-3 h-3" />
            Done {timeAgo(completedAt)}
          </p>
        )}

        {!isHomework && hasFile && (
          <button
            onClick={onView}
            className="w-full py-1.5 text-[11px] font-medium rounded-lg border
                       border-slate-200 text-muted hover:bg-slate-50 hover:text-dark
                       transition-colors cursor-pointer flex items-center
                       justify-center gap-1.5"
          >
            <HiOutlineEye className="w-3.5 h-3.5" />
            View File
          </button>
        )}
      </div>
    </div>
  );
}

// ── List Card ─────────────────────────────────────────────

function ListCard({
  item,
  isHomework,
  isCompleted,
  isConfirming,
  isMarking,
  completedAt,
  onView,
  onConfirmStart,
  onConfirmCancel,
  onMarkComplete,
}) {
  const hasFile = !!item.fileUrl;

  const borderColor = isHomework
    ? isCompleted
      ? 'border-l-green-500'
      : 'border-l-orange-500'
    : item.type === 'note'
      ? 'border-l-blue-500'
      : 'border-l-purple-500';

  const iconBg = isHomework
    ? isCompleted
      ? 'bg-green-50'
      : 'bg-orange-50'
    : item.type === 'note'
      ? 'bg-blue-50'
      : 'bg-purple-50';

  const iconColor = isHomework
    ? isCompleted
      ? 'text-green-600'
      : 'text-orange-600'
    : item.type === 'note'
      ? 'text-blue-600'
      : 'text-purple-600';

  return (
    <Card
      className={`border-l-4 ${borderColor} transition-all hover:shadow-md
        ${isCompleted ? 'opacity-70' : ''}`}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Icon / Quick View */}
        {hasFile ? (
          <button
            onClick={onView}
            className={`w-11 h-11 rounded-lg ${iconBg} flex items-center
              justify-center hover:scale-105 transition-transform
              cursor-pointer shrink-0`}
          >
            <HiOutlineEye className={`w-5 h-5 ${iconColor}`} />
          </button>
        ) : (
          <div
            className="w-11 h-11 rounded-lg bg-slate-50 flex items-center
                        justify-center shrink-0"
          >
            <HiOutlineDocumentText className="w-5 h-5 text-slate-300" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[13px] font-semibold leading-snug truncate ${isCompleted ? 'text-muted line-through' : 'text-dark'
              }`}
          >
            {item.title}
          </p>
          <div className="flex items-center gap-2.5 mt-1">
            <span className="flex items-center gap-1 text-[11px] text-faint">
              <HiOutlineCalendarDays className="w-3 h-3" />
              {timeAgo(item.createdAt)}
            </span>
            {isCompleted && completedAt && (
              <span className="flex items-center gap-1 text-[11px] text-green-600">
                <HiOutlineCheckCircle className="w-3 h-3" />
                Done {timeAgo(completedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          {isHomework && !isCompleted && !isConfirming && (
            <button
              onClick={onConfirmStart}
              disabled={isMarking}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-lg
                         bg-green-600 text-white hover:bg-green-700 transition-colors
                         cursor-pointer disabled:opacity-50"
            >
              {isMarking ? '…' : '✓ Done'}
            </button>
          )}
          {isHomework && isCompleted && (
            <Badge variant="success">Done</Badge>
          )}
          {hasFile && (
            <a
              href={getDriveViewUrl(item.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-slate-100 text-muted
                         hover:text-dark transition-colors"
              title="Open in new tab"
            >
              <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Confirm Strip */}
      {isConfirming && !isCompleted && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 p-2 bg-amber-50 border
                          border-amber-200 rounded-lg">
            <HiOutlineExclamationTriangle className="w-3.5 h-3.5 text-amber-600
                                                      shrink-0" />
            <p className="text-[11px] text-amber-800 flex-1">
              Sure? Can't undo.
            </p>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={onConfirmCancel}
                disabled={isMarking}
                className="px-2.5 py-1 text-[10.5px] font-medium rounded-md border
                           border-slate-200 text-muted hover:bg-white cursor-pointer
                           disabled:opacity-50"
              >
                No
              </button>
              <button
                onClick={onMarkComplete}
                disabled={isMarking}
                className="px-2.5 py-1 text-[10.5px] font-semibold rounded-md
                           bg-green-600 text-white hover:bg-green-700 cursor-pointer
                           disabled:opacity-50"
              >
                {isMarking ? '…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px]
                         font-medium rounded-md bg-white/10 text-white
                         hover:bg-white/20 transition-colors"
            >
              <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Drive</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white
                       transition-colors cursor-pointer"
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
              <p className="text-white/50 text-sm mb-4">
                Cannot preview this file
              </p>
              {viewUrl && (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px]
                             font-medium rounded-lg bg-white text-dark
                             hover:bg-slate-100 transition-colors"
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

// ── Skeleton ──────────────────────────────────────────────

function ClassSkeleton({ viewMode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-40 mt-1.5" />
        </div>
        <Skeleton className="h-8 w-18 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-72 rounded-lg" />
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border-2 border-slate-100 bg-white overflow-hidden"
            >
              <Skeleton className="w-full aspect-[4/3]" />
              <div className="px-3 py-2.5 space-y-1.5">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="px-3 pb-3">
                <Skeleton className="h-7 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-l-4 border-l-slate-200">
              <div className="px-4 py-3 flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}