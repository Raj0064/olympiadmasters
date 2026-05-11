import { cn } from "../../lib/cn";

export default function PageHeader({
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-6",
        className
      )}
    >
      <div>
        <h1 className="text-lg font-medium text-text-dark">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-sm text-text-muted">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}


