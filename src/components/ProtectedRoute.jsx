import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

const ProtectedRoute = ({ children, role, roles }) => {
  const { currentUser, userProfile, loading, profileError } = useAuth();

  if (loading) return null;

  if (!currentUser) return <Navigate to="/login" replace />;
  if (profileError) return <Navigate to="/login" replace />;
  if (!userProfile) return null;
  if (userProfile.disabled) return <Navigate to="/login" replace />;

  if (role && userProfile.role !== role) return <Navigate to={`/${userProfile.role}`} replace />;
  if (roles && !roles.includes(userProfile.role)) return <Navigate to={`/${userProfile.role}`} replace />;

  return children;
};

export default ProtectedRoute;