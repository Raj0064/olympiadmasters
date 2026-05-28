import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import {
  HiOutlineChartBar,
  HiOutlineTrophy,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineMinusCircle,
  HiOutlineClock,
  HiOutlineArrowRight,
  HiOutlineClipboardDocumentList,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import {
  safeNum,
  safeDate,
  safeDivide,
  safeRound,
  formatDate,
} from '../../utils/safeHelpers';

// ── Main Component ────────────────────────────────────────

export default function StudentResults({ sorted, examMap }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [search, setSearch] = useState('');

  // Guard — no data
  if (!sorted || sorted.length === 0) {
    return <EmptyState message="No results to show yet" />;
  }

  // Enrich with exam data (safe)
  const enriched = (sorted || [])
    .filter((s) => s?.id)
    .map((sub) => ({
      ...sub,
      examTitle: examMap?.[sub.examId]?.title || 'Exam',
      isResultPublished: examMap?.[sub.examId]?.isResultPublished ?? false,
      duration: safeNum(examMap?.[sub.examId]?.duration),
    }));

  // Filters
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'pending', label: 'Pending' },
  ];

  // Filter counts
  const filterCounts = {
    all: enriched.length,
    published: enriched.filter((r) => r.isResultPublished).length,
    pending: enriched.filter((r) => !r.isResultPublished).length,
  };

  // Apply filter
  let filtered = enriched;
  if (filter === 'published') filtered = enriched.filter((r) => r.isResultPublished);
  else if (filter === 'pending') filtered = enriched.filter((r) => !r.isResultPublished);

  // Apply search
  const searchTerm = search.trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter((r) =>
      r.examTitle.toLowerCase().includes(searchTerm)
    );
  }

  // Sort
  const finalSorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') {
      const at = safeDate(a.submittedAt);
      const bt = safeDate(b.submittedAt);
      if (!bt && !at) return 0;
      if (!bt) return -1;   // null dates sort to end
      if (!at) return 1;
      return bt - at;
    }
    if (sortBy === 'score-high') return safeNum(b.percentage) - safeNum(a.percentage);
    if (sortBy === 'score-low') return safeNum(a.percentage) - safeNum(b.percentage);
    if (sortBy === 'marks-high') return safeNum(b.score) - safeNum(a.score);
    return 0;
  });

  // Stats (published only)
  const published = enriched.filter((r) => r.isResultPublished);
  const avgScore = published.length > 0
    ? safeRound(
      safeDivide(
        published.reduce((s, r) => s + safeNum(r.percentage), 0),
        published.length
      )
    )
    : null;
  const bestScore = published.length > 0
    ? Math.max(...published.map((r) => safeNum(r.percentage)))
    : null;

  // Total marks earned
  const totalMarksEarned = published.reduce(
    (s, r) => s + safeNum(r.score),
    0
  );
  const totalMarksPossible = published.reduce(
    (s, r) => s + safeNum(r.totalMarks),
    0
  );

  return (
    <div className="space-y-5">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={HiOutlineClipboardDocumentList}
          label="Attempted"
          value={enriched.length}
          sub={filterCounts.pending > 0 ? `${filterCounts.pending} pending` : 'All published'}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          icon={HiOutlineChartBar}
          label="Avg Score"
          value={avgScore !== null ? `${avgScore}%` : '—'}
          sub={
            totalMarksPossible > 0
              ? `${totalMarksEarned}/${totalMarksPossible} marks`
              : ''
          }
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          icon={HiOutlineTrophy}
          label="Best Score"
          value={bestScore !== null ? `${bestScore}%` : '—'}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          icon={HiOutlineClock}
          label="Pending"
          value={filterCounts.pending}
          sub={filterCounts.pending > 0 ? 'Awaiting results' : 'All published'}
          color="text-orange-600"
          bg="bg-orange-50"
        />
      </div>

      {/* ── Search + Filter + Sort ── */}
      <div className="space-y-3">
        {/* Search — only if more than 5 results */}
        {enriched.length > 5 && (
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by exam name..."
              className="w-full sm:w-72 pl-9 pr-3 py-2 text-[13px] border border-border rounded-lg bg-surface text-dark placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter tabs with counts */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${filter === f.key
                    ? 'bg-white text-dark shadow-sm'
                    : 'text-muted hover:text-dark'
                  }`}
              >
                {f.label}
                {filterCounts[f.key] > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === f.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    {filterCounts[f.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <HiOutlineFunnel className="w-3.5 h-3.5 text-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[12.5px] text-muted bg-transparent border border-border rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="date">Latest first</option>
              <option value="score-high">Highest score</option>
              <option value="score-low">Lowest score</option>
              <option value="marks-high">Highest marks</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Results List ── */}
      {finalSorted.length === 0 ? (
        <EmptyState
          message={
            searchTerm
              ? `No results matching "${searchTerm}"`
              : filter === 'all' ? 'No results found' : `No ${filter} results found`
          }
        />
      ) : (
        <>
          {/* Result count */}
          <p className="text-[11.5px] text-faint">
            Showing {finalSorted.length} of {enriched.length} result
            {enriched.length !== 1 ? 's' : ''}
          </p>

          <div className="space-y-3">
            {finalSorted.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                onViewDetail={() =>
                  navigate(`/student/results/${result.examId}`)
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────

function ResultCard({ result, onViewDetail }) {
  if (!result) return null;

  const isPending = !result.isResultPublished;
  const submitted = safeDate(result.submittedAt);
  const pct = safeNum(result.percentage);
  const score = safeNum(result.score);
  const totalMarks = safeNum(result.totalMarks);
  const correct = safeNum(result.correct);
  const wrong = safeNum(result.wrong);
  const skipped = safeNum(result.skipped);
  const timeTaken = safeNum(result.timeTaken);
  const duration = safeNum(result.duration);
  const totalQuestions = correct + wrong + skipped;

  return (
    <Card
      className={`transition-all hover:shadow-md ${isPending
          ? 'border-l-4 border-l-orange-400'
          : 'border-l-4 border-l-blue-500'
        }`}
    >
      <div className="px-4 py-4 space-y-3">
        {/* ── Row 1: Title + Score + View ── */}
        <div className="flex items-start gap-3">
          {/* Title + Date */}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-dark leading-snug truncate">
              {result.examTitle}
            </p>
            <p className="text-[11.5px] text-muted mt-0.5">
              {formatDate(submitted, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {totalQuestions > 0 && (
                <span className="text-faint">
                  {' '}· {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          {/* Score block */}
          {!isPending && (
            <div className="text-center shrink-0 min-w-[60px]">
              <p className="text-lg font-bold text-dark leading-tight">
                {score}
                <span className="text-muted font-normal text-[13px]">
                  /{totalMarks}
                </span>
              </p>
              <Badge
                variant={
                  pct >= 75
                    ? 'success'
                    : pct >= 40
                      ? 'warning'
                      : 'danger'
                }
                className="mt-0.5"
              >
                {pct}%
              </Badge>
            </div>
          )}

          {/* Action */}
          {isPending ? (
            <Badge variant="warning">Pending</Badge>
          ) : (
            <button
              onClick={onViewDetail}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
            >
              View
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Progress Bar ── */}
        {!isPending && totalMarks > 0 && (
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct >= 75
                  ? 'bg-green-500'
                  : pct >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
            />
          </div>
        )}

        {/* ── Quick Stats ── */}
        {!isPending && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <QuickStat
              icon={HiOutlineCheckCircle}
              value={correct}
              label="correct"
              iconColor="text-green-500"
            />
            <Dot />
            <QuickStat
              icon={HiOutlineXCircle}
              value={wrong}
              label="wrong"
              iconColor="text-red-500"
            />
            <Dot />
            <QuickStat
              icon={HiOutlineMinusCircle}
              value={skipped}
              label="skipped"
              iconColor="text-slate-400"
            />
            {timeTaken > 0 && (
              <>
                <Dot />
                <QuickStat
                  icon={HiOutlineClock}
                  value={`${Math.round(timeTaken / 60)}m`}
                  label={duration > 0 ? `/ ${duration} min` : ''}
                  iconColor="text-blue-500"
                />
              </>
            )}
          </div>
        )}

        {/* ── Pending Message ── */}
        {isPending && (
          <div className="flex items-center gap-2 text-[12px] text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
            <HiOutlineClock className="w-3.5 h-3.5 shrink-0" />
            <span>Result will be published by your teacher</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Quick Stat ────────────────────────────────────────────

function QuickStat({ icon: Icon, value, label, iconColor }) {
  return (
    <div className="flex items-center gap-1 text-[11.5px]">
      <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
      <span className="text-dark font-medium">{value}</span>
      <span className="text-faint">{label}</span>
    </div>
  );
}

// ── Dot separator ─────────────────────────────────────────

function Dot() {
  return <span className="w-0.5 h-0.5 rounded-full bg-slate-300 hidden sm:block" />;
}

// ── Stat Card ─────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`${bg} ${color} p-2.5 rounded-lg shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-dark">{value}</p>
        <p className="text-[12px] text-muted">{label}</p>
        {sub && (
          <p className="text-[10px] text-faint mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </Card>
  );
}