import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineUser,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';

export default function StudentTopBar({ title }) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const name = userProfile?.name || 'Student';
  const grade = userProfile?.grade || '—';
  const email = userProfile?.email || '';

  const initials = name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  async function handleLogout() {
    try {
      setShowMenu(false);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-surface border-b border-border px-4 lg:px-6">
      <div className="flex items-center justify-between h-14">
        <h1 className="text-[15px] font-semibold text-dark">{title}</h1>

        {/* Right — Avatar + Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-medium text-dark">{name}</p>
              <p className="text-[11px] text-muted">Grade {grade}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold select-none">
              {initials}
            </div>
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-12 w-64 bg-surface rounded-xl border border-border shadow-lg overflow-hidden z-50 animate-fade-in">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold shrink-0 select-none">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-dark truncate">
                      {name}
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      {email || `Grade ${grade}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/student/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-dark hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <HiOutlineUser className="w-4 h-4 text-muted" />
                  My Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}