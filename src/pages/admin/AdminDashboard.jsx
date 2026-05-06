import StatCard from '../../components/admin/StatCard';

const recentExams = [
  { title: 'Math Olympiad Mock 3', grade: 'Grade 8', status: 'Active' },
  { title: 'Science Sprint', grade: 'Grade 7', status: 'Completed' },
  { title: 'Logic Reasoning Test', grade: 'Grade 9', status: 'Draft' },
];

const recentSubmissions = [
  { name: 'Rohan Sharma', exam: 'Math Olympiad Mock 3', score: '82/100' },
  { name: 'Priya Das', exam: 'Math Olympiad Mock 3', score: '74/100' },
  { name: 'Arjun Nair', exam: 'Science Sprint', score: '68/100' },
];

const statusColors = {
  Active: 'bg-green-100 text-green-800',
  Completed: 'bg-blue-100  text-blue-800',
  Draft: 'bg-gray-100  text-gray-600',
};

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-medium text-text-dark">Overview</h2>
        <p className="text-sm text-text-dark/50 mt-0.5">Quick snapshot of your platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Students" value="48" sub="across all batches" />
        <StatCard label="Batches" value="5" sub="active this year" />
        <StatCard label="Exams" value="12" sub="3 scheduled" />
        <StatCard label="Submissions" value="310" sub="this session" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* Recent exams */}
        <div className="bg-surface border border-black/8 rounded-xl p-4">
          <p className="text-sm font-medium text-text-dark mb-3">Recent Exams</p>
          <div className="divide-y divide-black/6">
            {recentExams.map((e) => (
              <div key={e.title} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-text-dark">{e.title}</p>
                  <p className="text-xs text-text-dark/45 mt-0.5">{e.grade}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full ${statusColors[e.status]}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent submissions */}
        <div className="bg-surface border border-black/8 rounded-xl p-4">
          <p className="text-sm font-medium text-text-dark mb-3">Recent Submissions</p>
          <div className="divide-y divide-black/6">
            {recentSubmissions.map((s) => (
              <div key={s.name} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-text-dark">{s.name}</p>
                  <p className="text-xs text-text-dark/45 mt-0.5">{s.exam}</p>
                </div>
                <p className="text-sm font-medium text-text-dark">{s.score}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}