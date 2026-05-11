import { cn } from "../../lib/cn";

export default function Input({
  className,
  ...props
}) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none transition-all",
        "placeholder:text-text-faint",
        "focus:border-accent focus:ring-4 focus:ring-accent/10",
        className
      )}
      {...props}
    />
  );
}