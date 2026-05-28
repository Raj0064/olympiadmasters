import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, role, roles }) => {
  const { currentUser, userProfile, loading, profileError } = useAuth();

  // ── Still loading — AuthContext shows global spinner, render nothing ──
  if (loading) return null;

  // ── Not logged in — go to login ───────────────────────────────────────
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // ── Firestore profile fetch failed — don't silently blank, go to login ─
  // ✅ FIX: was returning null forever when profileError occurred
  if (profileError) {
    return <Navigate to="/login" replace />;
  }

  // ── Profile not yet available (edge case) — wait briefly ─────────────
  // This should rarely trigger since loading=true until fetchProfile resolves
  if (!userProfile) return null;

  // ── Single role check ─────────────────────────────────────────────────
  // ✅ FIX: was redirecting to /login — now sends user to their own dashboard
  if (role && userProfile.role !== role) {
    return <Navigate to={`/${userProfile.role}`} replace />;
  }

  // ── Multiple roles check ──────────────────────────────────────────────
  // ✅ FIX: same — redirect to correct dashboard, not /login
  if (roles && !roles.includes(userProfile.role)) {
    return <Navigate to={`/${userProfile.role}`} replace />;
  }

  return children;
};

export default ProtectedRoute;