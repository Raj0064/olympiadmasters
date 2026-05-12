import { Outlet, useLocation } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import StudentBottomNav from './StudentBottomNav';
import StudentTopBar from './StudentTopbar';

const pageTitles = {
  '/student': 'Dashboard',
  '/student/exams': 'My Exams',
  '/student/performance': 'Performance',
  '/student/profile': 'My Profile',
};

export default function StudentLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'Olympiad Maths';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden lg:flex shrink-0">
        <StudentSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StudentTopBar title={title} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>

        <StudentBottomNav />
      </div>
    </div>
  );
}