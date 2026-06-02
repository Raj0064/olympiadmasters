import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const titles = {
  '/admin': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/batches': 'Batches',
  '/admin/exams': 'Exams',
  '/admin/results': 'Results',
};

export default function TopBar({ onMenuClick }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  const title = titles[pathname] ?? 'Admin';

  return (
    <header className="h-[52px] bg-surface border-b border-black/8 flex items-center px-5 gap-3 shrink-0">

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-text-dark/60 hover:text-text-dark transition-colors"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect y="3" width="20" height="1.5" rx="1" />
          <rect y="9" width="20" height="1.5" rx="1" />
          <rect y="15" width="20" height="1.5" rx="1" />
        </svg>
      </button>

      <h1 className="flex-1 text-[15px] font-medium text-text-dark">{title}</h1>

      <span className="text-[11px] bg-background text-text-dark/50 px-3 py-1 rounded-full border border-black/8">
        2026–27
      </span>

      <button
        onClick={logout}
        className="text-[12px] text-text-dark/50 hover:text-text-dark border border-black/10 hover:border-black/20 px-3 py-1.5 rounded-lg transition-all"
      >
        Logout
      </button>
    </header>
  );
}


