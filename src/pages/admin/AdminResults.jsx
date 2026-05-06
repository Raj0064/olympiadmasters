import { useState } from 'react';
import StatCard from '../../components/admin/StatCard';

const DUMMY_EXAMS = ['Math Olympiad Mock 3', 'Science Sprint', 'Logic Reasoning'];

const DUMMY_SUBMISSIONS = [
  { name: 'Rohan Sharma', score: 96, total: 100, correct: 48, wrong: 2, time: '42 min' },
  { name: 'Priya Das', score: 82, total: 100, correct: 41, wrong: 7, time: '55 min' },
  { name: 'Sneha Rao', score: 74, total: 100, correct: 37, wrong: 11, time: '60 min' },
  { name: 'Karan Mehta', score: 68, total: 100, correct: 34, wrong: 14, time: '58 min' },
  { name: 'Arjun Nair', score: 42, total: 100, correct: 21, wrong: 27, time: '48 min' },
];

export default function AdminResults() {
  const [selectedExam, setSelectedExam] = useState(DUMMY_EXAMS[0]);

  const avg = Math.round(DUMMY_SUBMISSIONS.reduce((a, s) => a + s.score, 0) / DUMMY_SUBMISSIONS.length);
  const high = Math.max(...DUMMY_SUBMISSIONS.map(s => s.score));
  const low = Math.min(...DUMMY_SUBMISSIONS.map(s => s.score));

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-medium text-text-dark">Results</h2>
        <p className="text-sm text-text-dark/50 mt-0.5">View submission data per exam</p>
      </div>

      {/* Exam selector */}
      <div className="bg-surface border border-black/8 rounded-xl p-4 mb-4">
        <p className="text-xs font-medium text-text-dark/45 mb-2 tracking-wide">Select Exam</p>
        <select
          value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}
          className="w-full text-sm border border-black/10 rounded-lg px-3 py-2 bg-background text-text-dark outline-none focus:border-accent"
        >
          {DUMMY_EXAMS.map(ex => <option key={ex}>{ex}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Submitted" value={DUMMY_SUBMISSIONS.length} />
        <StatCard label="Average" value={`${avg}%`} />
        <StatCard label="Highest" value={`${high}%`} />
        <StatCard label="Lowest" value={`${low}%`} />
      </div>

      {/* Submissions table */}
      <div className="bg-surface border border-black/8 rounded-xl p-4">
        <p className="text-sm font-medium text-text-dark mb-3">Submissions</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/8">
                <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Student</th>
                <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Score</th>
                <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Correct</th>
                <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Wrong</th>
                <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide">Time</th>
                <th className="pb-2.5 text-[11px] font-medium text-text-dark/45 tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {DUMMY_SUBMISSIONS.map(s => (
                <tr key={s.name}>
                  <td className="py-2.5 font-medium text-text-dark">{s.name}</td>
                  <td className="py-2.5 font-medium text-text-dark">{s.score}/{s.total}</td>
                  <td className="py-2.5 text-green-700">{s.correct}</td>
                  <td className="py-2.5 text-red-500">{s.wrong}</td>
                  <td className="py-2.5 text-text-dark/50">{s.time}</td>
                  <td className="py-2.5">
                    <button className="text-[12px] text-accent hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}