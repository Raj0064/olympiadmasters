import StatCard from '../../components/admin/StatCard';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';

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

const statusVariant = {
  Active: 'success',
  Completed: 'info',
  Draft: 'neutral',
};

export default function AdminDashboard() {
  return (
    <div>

      {/* Header */}
      <PageHeader
        title="Overview"
        description="Quick snapshot of your platform"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value="48"
          sub="across all batches"
        />

        <StatCard
          label="Batches"
          value="5"
          sub="active this year"
        />

        <StatCard
          label="Exams"
          value="12"
          sub="3 scheduled"
        />

        <StatCard
          label="Submissions"
          value="310"
          sub="this session"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">

        {/* Recent Exams */}
        <Card className="p-4">

          <p className="mb-3 text-sm font-medium text-text-dark">
            Recent Exams
          </p>

          <div className="divide-y divide-border">

            {recentExams.map((exam) => (
              <div
                key={exam.title}
                className="flex items-center justify-between py-2.5"
              >

                <div>
                  <p className="text-sm text-text-dark">
                    {exam.title}
                  </p>

                  <p className="mt-0.5 text-xs text-text-muted">
                    {exam.grade}
                  </p>
                </div>

                <Badge variant={statusVariant[exam.status]}>
                  {exam.status}
                </Badge>

              </div>
            ))}

          </div>

        </Card>

        {/* Recent Submissions */}
        <Card className="p-4">

          <p className="mb-3 text-sm font-medium text-text-dark">
            Recent Submissions
          </p>

          <div className="divide-y divide-border">

            {recentSubmissions.map((submission) => (
              <div
                key={submission.name}
                className="flex items-center justify-between py-2.5"
              >

                <div>
                  <p className="text-sm text-text-dark">
                    {submission.name}
                  </p>

                  <p className="mt-0.5 text-xs text-text-muted">
                    {submission.exam}
                  </p>
                </div>

                <p className="text-sm font-medium text-text-dark">
                  {submission.score}
                </p>

              </div>
            ))}

          </div>

        </Card>

      </div>

    </div>
  );
}
