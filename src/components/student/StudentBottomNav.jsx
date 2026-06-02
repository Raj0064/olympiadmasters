// Only change: add to navItems array + add the import

import {
  HiOutlineHome,
  HiOutlineClipboardDocumentList,
  HiOutlineChartBar,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
  HiOutlineBookOpen,          // ← ADD THIS
} from 'react-icons/hi2';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/student', icon: HiOutlineHome, exact: true },
  { label: 'Exams', path: '/student/exams', icon: HiOutlineClipboardDocumentList },
  { label: 'Classroom', path: '/student/classroom', icon: HiOutlineBookOpen },  // ← ADD THIS
  { label: 'Performance', path: '/student/performance', icon: HiOutlineChartBar },
];

export default function StudentBottomNav() {
  const { pathname } = useLocation();

  function isNavActive(item) {
    if (item.exact) return pathname === item.path;
    return pathname.startsWith(item.path);
  }
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-white/10">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const { label, path, icon: Icon } = item;
          const active = isNavActive(item);

          return (
            <NavLink
              key={path}
              to={path}
              end={item.exact}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 ${active
                  ? 'text-primary bg-white'
                  : 'text-blue-200/70'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}