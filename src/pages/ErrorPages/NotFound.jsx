import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { HiOutlineHome, HiOutlineArrowLeft } from "react-icons/hi2";

const NotFound = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const homePath = userProfile?.role === "admin" ? "/admin" : "/student";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Illustration */}
        <div className="mb-8">
          <p className="text-[120px] font-black text-accent/20 leading-none select-none">
            404
          </p>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-primary mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition cursor-pointer"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate(homePath)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-primary transition cursor-pointer"
          >
            <HiOutlineHome className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;