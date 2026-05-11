import Card from "./Card";

export default function EmptyState({
  title = "No data found",
  description,
  action,
}) {
  return (
    <Card className="p-10 text-center">
      <div className="max-w-sm mx-auto">
        <p className="text-sm font-medium text-text-dark">
          {title}
        </p>

        {description && (
          <p className="mt-1 text-sm text-text-muted">
            {description}
          </p>
        )}

        {action && (
          <div className="mt-5">
            {action}
          </div>
        )}
      </div>
    </Card>
  );
}