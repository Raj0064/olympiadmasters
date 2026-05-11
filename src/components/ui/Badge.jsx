import { cn } from "../../lib/cn";


const variants = {
  success:
    "bg-success-bg text-success border border-success/20",

  info:
    "bg-info-bg text-info border border-info/20",

  warning:
    "bg-warning-bg text-warning border border-warning/20",

  danger:
    "bg-danger-bg text-danger border border-danger/20",

  neutral:
    "bg-black/[0.03] text-text-dark border border-border",

  primary:
    "bg-primary/8 text-primary border border-primary/15",

  accent:
    "bg-accent/10 text-accent border border-accent/20",

  live:
    "bg-success-bg text-success border border-success/30 ring-1 ring-success/15 font-semibold",

  muted:
    "bg-slate-100 text-slate-600 border border-slate-200",

  dark:
    "bg-text-dark text-white border border-black/10",

  soft:
    "bg-white text-text-dark border border-border shadow-sm",

  /* New Premium Variants */

  sky:
    "bg-sky-bg text-sky border border-sky/10",

  indigo:
    "bg-indigo-bg text-indigo border border-indigo/10",

  emerald:
    "bg-emerald-bg text-emerald border border-emerald/10",

  blueSoft:
    "bg-blue-soft-bg text-blue-soft border border-blue-soft/10",
};


export default function Badge({
  children,
  variant = "neutral",
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}