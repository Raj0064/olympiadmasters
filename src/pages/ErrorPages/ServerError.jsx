import { useNavigate } from "react-router-dom";
import { HiOutlineExclamationTriangle, HiOutlineArrowPath } from "react-icons/hi2";

const ServerError = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 bg-warning-bg rounded-full flex items-center justify-center mx-auto mb-6">
          <HiOutlineExclamationTriangle className="w-10 h-10 text-warning" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-primary mb-2">
          Something Went Wrong
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          We're having trouble loading this page. Please try again or come back later.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-primary transition cursor-pointer"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerError;