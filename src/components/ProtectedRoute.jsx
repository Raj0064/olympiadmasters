import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, role }) => {
  const { currentUser, userProfile, loading } = useAuth();

  // Still checking auth state — show spinner
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

  // Not logged in → send to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Admin route → non-admin tries to access → send to dashboard
  if (role === "admin" && userProfile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Student route → admin tries to access → send to admin panel
  if (!role && userProfile?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;