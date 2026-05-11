import { cn } from "../../lib/cn";

export default function Card({
  children,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-xl shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}