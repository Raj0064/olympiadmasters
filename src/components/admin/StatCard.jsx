export default function StatCard({ label, value, sub }) {
  return (
    <div className="bg-background rounded-xl p-4">
      <p className="text-xs text-text-dark/50 mb-1.5">{label}</p>
      <p className="text-2xl font-medium text-text-dark">{value}</p>
      {sub && <p className="text-[11px] text-text-dark/35 mt-0.5">{sub}</p>}
    </div>
  );
}