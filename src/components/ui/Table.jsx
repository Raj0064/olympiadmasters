// components/ui/Table.jsx

import Card from "./Card";

// ─────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────────────────────
// Skeleton Row
// ─────────────────────────────────────────────────────────────

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td
          key={i}
          className="py-4 pr-4 last:pr-0"
        >
          <div className="h-3.5 w-3/4 rounded-full bg-border animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────

export default function Table({
  columns = [],
  data = [],
  renderRow,
  title,
  subtitle,
  count,
  emptyText = "No data found.",
  emptyIcon,
  loading = false,
  className = "",
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>

      {/* ───────────────── Header ───────────────── */}
      {(title || subtitle) && (
        <div className="mb-5">
          {title && (
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-dark">
                {title}
              </h3>

              {count !== undefined && (
                <span className="text-xs text-text-faint">
                  ({count})
                </span>
              )}
            </div>
          )}

          {subtitle && (
            <p className="mt-1 text-xs text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* ───────────────── Empty ───────────────── */}
      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14">
          {emptyIcon && (
            <div className="mb-3 text-3xl">
              {emptyIcon}
            </div>
          )}

          <p className="text-sm text-text-muted">
            {emptyText}
          </p>
        </div>
      )}

      {/* ───────────────── Table ───────────────── */}
      {(loading || data.length > 0) && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            {/* ───────────────── Head ───────────────── */}
            <thead>
              <tr className="border-b border-border">
                {columns.map((col, i) => (
                  <th
                    key={col.key ?? i}
                    style={{
                      width: col.width || "auto",
                    }}
                    className={cn(
                      "pb-3 pr-4 last:pr-0",
                      "text-xs font-semibold uppercase tracking-wider whitespace-nowrap",
                      "text-text-faint",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      (!col.align || col.align === "left") &&
                      "text-left",
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ───────────────── Body ───────────────── */}
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow
                    key={i}
                    cols={columns.length || 4}
                  />
                ))
                : data.map((item, idx) =>
                  renderRow(item, idx)
                )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Table.Td Helper
// Usage remains SAME as previous version
// ─────────────────────────────────────────────────────────────

Table.Td = function Td({
  children,
  align,
  className = "",
}) {
  return (
    <td
      className={cn(
        "py-4 pr-4 last:pr-0",
        "align-middle text-sm text-text-dark",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
    >
      {children}
    </td>
  );
};