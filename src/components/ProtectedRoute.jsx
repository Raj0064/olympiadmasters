import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, role, roles }) => {
  const { currentUser, userProfile, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Single role check
  if (role && userProfile?.role !== role) {
    return (
      <Navigate
        to={userProfile?.role === "admin" ? "/admin" : "/dashboard"}
        replace
      />
    );
  }

  // Multiple roles check
  if (roles && !roles.includes(userProfile?.role)) {
    return (
      <Navigate
        to={userProfile?.role === "admin" ? "/admin" : "/dashboard"}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;