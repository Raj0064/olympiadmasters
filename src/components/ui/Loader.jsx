export default function Loader({
  text = "Loading...",
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />

      <p className="mt-3 text-sm text-text-muted">
        {text}
      </p>
    </div>
  );
}