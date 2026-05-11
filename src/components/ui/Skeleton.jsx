// components/ui/Skeleton.jsx

/**
 * Reusable Skeleton System
 *
 * Includes:
 * - Skeleton (base)
 * - SkeletonText
 * - SkeletonCircle
 * - TableSkeleton
 * - CardSkeleton
 * - DashboardSkeleton
 * - ListSkeleton
 * - QuestionSkeleton
 */

import Card from "./Card";

// ─────────────────────────────────────────────────────────────────────────────
// Base Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function Skeleton({
  className = "",
}) {
  return (
    <div
      className={[
        "animate-pulse rounded-lg bg-border/70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function SkeletonText({
  lines = 3,
  lastLineWidth = "70%",
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{
            width:
              i === lines - 1
                ? lastLineWidth
                : "100%",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function SkeletonCircle({
  size = 40,
  className = "",
}) {
  return (
    <Skeleton
      className={`rounded-full ${className}`}
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function CardSkeleton({
  rows = 3,
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <SkeletonCircle size={42} />

          <div className="flex-1">
            <Skeleton className="h-4 w-40" />

            <div className="mt-2">
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        <SkeletonText lines={rows} />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function TableSkeleton({
  rows = 5,
  cols = 5,
  title = true,
}) {
  return (
    <Card className="p-5 sm:p-6">
      {title && (
        <div className="mb-5">
          <Skeleton className="h-4 w-32" />

          <div className="mt-2">
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
      )}

      <div className="overflow-hidden">
        {/* Header */}
        <div className="grid gap-4 border-b border-border pb-3">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-3 w-16"
              />
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={row}
              className="grid gap-4 py-4"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: cols }).map((_, col) => (
                <Skeleton
                  key={col}
                  className="h-4 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardSkeleton({
  cards = 4,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <Card
          key={i}
          className="p-5 sm:p-6"
        >
          <div className="space-y-4">
            <Skeleton className="h-3 w-24" />

            <Skeleton className="h-8 w-20" />

            <Skeleton className="h-3 w-28" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function ListSkeleton({
  items = 5,
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <Card
          key={i}
          className="p-4"
        >
          <div className="flex items-center gap-3">
            <SkeletonCircle size={42} />

            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />

              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exam Question Skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function QuestionSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-5">
        {/* Question */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />

          <SkeletonText
            lines={3}
            lastLineWidth="55%"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border border-border rounded-xl p-3"
            >
              <SkeletonCircle size={20} />

              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

export default Skeleton;