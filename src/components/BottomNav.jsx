// components/student/BottomNav.jsx
import { useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "🏠", label: "Home" },
  { path: "/exams", icon: "📝", label: "Exams" },
  { path: "/my-performance", icon: "📊", label: "Performance" },
  { path: "/profile", icon: "👤", label: "Profile" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="
        fixed bottom-0 left-0 right-0 z-50
        bg-surface/95 backdrop-blur
        border-t border-border
        flex md:hidden
        safe-area-pb
      ">
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const active = pathname === path || pathname.startsWith(path + "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`
                flex-1 flex flex-col items-center justify-center
                gap-0.5 py-2.5 px-1
                transition-colors duration-150
                ${active ? "text-primary" : "text-text-faint hover:text-text-muted"}
              `}
            >
              <span className={`text-lg leading-none transition-transform duration-150 ${active ? "scale-110" : ""}`}>
                {icon}
              </span>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-primary" : ""}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Desktop top nav links — injected into header externally */}
      {/* Spacer so content isn't hidden behind bottom bar on mobile */}
      <div className="h-16 md:hidden" />
    </>
  );
}