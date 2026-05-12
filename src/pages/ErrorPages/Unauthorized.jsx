import { useNavigate } from "react-router-dom";
import { HiOutlineShieldExclamation, HiOutlineHome } from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();

  const homePath = userProfile?.role === "admin" ? "/admin" : "/student";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-6">
          <HiOutlineShieldExclamation className="w-10 h-10 text-danger" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-primary mb-2">
          Access Denied
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          You don't have permission to access this page. Please contact your administrator if you think this is a mistake.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(homePath)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-primary transition cursor-pointer"
          >
            <HiOutlineHome className="w-4 h-4" />
            Go to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;