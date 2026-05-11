// components/admin/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Students', path: '/admin/students' },
  { label: 'Batches', path: '/admin/batches' },
  { label: 'Exams', path: '/admin/exams' },
  { label: 'Results', path: '/admin/results' },
];

export default function Sidebar({ onClose }) {
  const { currentUser, logout } = useAuth();

  const initials = currentUser?.displayName
    ? currentUser.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : 'A';

  return (
    <aside className="flex flex-col h-full w-[220px] bg-primary text-white">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <p className="text-sm font-medium tracking-wide">Olympiad Admin</p>
        <p className="text-xs text-white/40 mt-0.5">Management Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        <p className="px-4 py-1 text-[10px] uppercase tracking-widest text-white/35">
          Menu
        </p>

        {navItems.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/admin'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] border-l-2 transition-all duration-150 ` +
              (isActive
                ? 'text-white bg-accent/25 border-accent'
                : 'text-white/60 border-transparent hover:text-white hover:bg-white/5')
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">
              {currentUser?.displayName || 'Admin'}
            </p>
            <p className="text-[11px] text-white/40 truncate">
              {currentUser?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}