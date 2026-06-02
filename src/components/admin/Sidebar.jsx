// components/admin/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Students', path: '/admin/students' },
  { label: 'Batches', path: '/admin/batches' },
  { label: 'Exams', path: '/admin/exams' },
  { label: 'Results', path: '/admin/results' },
];

export default function Sidebar({ onClose }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const name = currentUser?.displayName || 'Admin';
  const email = currentUser?.email || '—';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

      {/* Footer — same pattern as StudentSidebar */}
      <div
        ref={menuRef}
        className="relative px-4 py-4 border-t border-white/10"
      >
        {/* Avatar button */}
        <button
          onClick={() => setShowMenu((prev) => !prev)}
          className="w-full flex items-center gap-2.5 rounded-lg p-1 text-left
                     hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-accent flex items-center
                          justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">{name}</p>
            <p className="text-[11px] text-blue-200/50 truncate">{email}</p>
          </div>
        </button>

        {/* Popup menu */}
        {showMenu && (
          <div className="absolute left-4 right-4 bottom-full mb-2 bg-surface
                          border border-border rounded-xl shadow-xl overflow-hidden
                          z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex
                                items-center justify-center text-xs font-semibold
                                shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-black truncate">
                    {name}
                  </p>
                  <p className="text-[11px] text-slate-800 truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => {
                  setShowMenu(false);
                  navigate('/admin/profile');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] text-black hover:bg-slate-50
                           transition-colors cursor-pointer"
              >
                <HiOutlineUser className="w-4 h-4 text-muted" />
                My Profile
              </button>

              <button
                onClick={async () => {
                  setShowMenu(false);
                  await logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] text-red-600 hover:bg-red-50
                           transition-colors cursor-pointer"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}