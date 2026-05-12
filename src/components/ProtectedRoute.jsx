import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, role, roles }) => {
  const { currentUser, userProfile, loading } = useAuth();

  // Auth still loading — AuthContext shows spinner already
  if (loading) return null;

  // Not logged in — send to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Profile not fetched yet — wait
  if (!userProfile) return null;

  // Single role check
  if (role && userProfile.role !== role) {
    return <Navigate to="/unauthorized" replace />;  // ← changed
  }

  // Multiple roles check
  if (roles && !roles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;  // ← changed
  }

  return children;
};

export default ProtectedRoute;