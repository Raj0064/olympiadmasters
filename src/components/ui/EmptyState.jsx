// components/ui/EmptyState.jsx
import Card from "./Card";
import { HiOutlineInboxStack } from "react-icons/hi2";

export default function EmptyState({
  title,
  description,
  message, // shorthand: sets title when only one string is needed
  action,
  icon: Icon = HiOutlineInboxStack,
}) {
  const heading = title ?? message ?? "No data found";

  return (
    <Card className="p-10 text-center">
      <div className="max-w-sm mx-auto space-y-2">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-slate-100 p-3 rounded-full">
            <Icon className="w-6 h-6 text-muted" />
          </div>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-dark">{heading}</p>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted">{description}</p>
        )}

        {/* Action */}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </Card>
  );
}