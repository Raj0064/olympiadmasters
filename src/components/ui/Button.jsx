import { cn } from "../../lib/cn";

const variants = {
  primary:
    "bg-primary text-white hover:bg-primary-hover",

  accent:
    "bg-accent text-white hover:bg-accent-hover",

  secondary:
    "border border-border bg-surface text-text-dark hover:bg-black/[0.03]",

  outline:
    "border border-primary/25 bg-transparent text-primary hover:bg-accent/25 hover:border-none ",

  ghost:
    "text-text-muted hover:text-text-dark hover:bg-black/[0.03]",

  danger:
    "bg-danger text-white hover:bg-red-700",

  success:
    "bg-success text-white hover:opacity-90",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}