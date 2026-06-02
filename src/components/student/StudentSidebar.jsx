import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineClipboardDocumentList,
  HiOutlineChartBar,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
  HiOutlineBookOpen,
} from 'react-icons/hi2';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect } from 'react';


const navItems = [
  { label: 'Dashboard', path: '/student', icon: HiOutlineHome, exact: true },
  { label: 'Exams', path: '/student/exams', icon: HiOutlineClipboardDocumentList },
  { label: 'Classroom', path: '/student/classroom', icon: HiOutlineBookOpen },  // ← ADD THIS
  { label: 'Performance', path: '/student/performance', icon: HiOutlineChartBar },
];

// ── Skeleton ─────────────────────────────────────────────────────────────────
function StudentSidebarSkeleton() {
  return (
    <aside className="flex flex-col h-full w-[230px] bg-primary text-white">
      {/* Header */}
      <div className="px-5 py-5 border-b border-white/10 space-y-2">
        <Skeleton className="h-5 w-32 rounded bg-white/10" />
        <Skeleton className="h-3 w-20 rounded bg-white/10" />
      </div>

      {/* Nav items */}
      <div className="flex-1 py-4 space-y-2 px-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <Skeleton className="h-[18px] w-[18px] rounded bg-white/10 shrink-0" />
            <Skeleton className="h-4 w-20 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24 rounded bg-white/10" />
            <Skeleton className="h-3 w-32 rounded bg-white/10" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded bg-white/10" />
          <Skeleton className="h-3 w-12 rounded bg-white/10" />
        </div>
      </div>
    </aside>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function StudentSidebar() {
  const { userProfile, loading, logout } = useAuth(); // ✅ inside component
  const { pathname } = useLocation();

  const navigate = useNavigate();

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Show skeleton while auth resolves OR profile is loading
  if (loading || !userProfile) {
    return <StudentSidebarSkeleton />;
  }

  const name = userProfile.name || 'Student';
  const email = userProfile.email || '—';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function isNavActive(item) {
    if (item.path === '/student/performance') {
      return (
        pathname.startsWith('/student/performance') ||
        pathname.startsWith('/student/results')
      );
    }
    if (item.exact) return pathname === item.path;
    return pathname.startsWith(item.path);
  }

  return (
    <aside className="flex flex-col h-full w-[230px] bg-primary text-white">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-base font-semibold tracking-wide">Olympiad Masters</p>
        <p className="text-[11px] text-blue-200/60 mt-0.5">Student Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map((item) => {
          const { label, path, icon: Icon } = item;
          const active = isNavActive(item);

          return (
            <NavLink
              key={path}
              to={path}
              end={item.exact}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px]
                font-medium transition-all duration-150
                ${active
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200/70 hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      {/* User footer */}
      <div
        ref={menuRef}
        className="relative px-4 py-4 border-t border-white/10"
      >
        <button
          onClick={() => setShowMenu((prev) => !prev)}
          className="
      w-full
      flex
      items-center
      gap-2.5
      rounded-lg
      p-1
      text-left
      hover:bg-white/5
      transition-colors
      cursor-pointer
    "
        >
          <div
            className="
        w-8
        h-8
        rounded-full
        bg-accent
        flex
        items-center
        justify-center
        text-xs
        font-semibold
        shrink-0
      "
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">
              {name}
            </p>

            <p className="text-[11px] text-blue-200/50 truncate">
              {email}
            </p>
          </div>
        </button>

        {showMenu && (
          <div
            className="
        absolute
        left-4
        right-4
        bottom-full
        mb-2
        bg-surface
        border
        border-border
        rounded-xl
        shadow-xl
        overflow-hidden
        z-50
      "
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div
                  className="
              w-9
              h-9
              rounded-full
              bg-primary
              text-white
              flex
              items-center
              justify-center
              text-xs
              font-semibold
              shrink-0
            "
                >
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-black truncate">
                    {name}
                  </p>

                  <p className="text-[11px] text-slate-800 truncate">
                    {email}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => {
                  setShowMenu(false);
                  navigate('/student/profile');
                }}
                className="
            w-full
            flex
            items-center
            gap-2.5
            px-4
            py-2.5
            text-[13px]
            text-black
            hover:bg-slate-50
            transition-colors
            cursor-pointer
          "
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
                className="
            w-full
            flex
            items-center
            gap-2.5
            px-4
            py-2.5
            text-[13px]
            text-red-600
            hover:bg-red-50
            transition-colors
            cursor-pointer
          "
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