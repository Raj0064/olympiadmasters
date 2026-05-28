import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { FiEyeOff } from "react-icons/fi";
import { BsEye, BsEyeFill } from "react-icons/bs";

const Login = () => {
  const { login, userProfile, currentUser, profileError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Redirect if already logged in ────────────────────────────────────
  if (currentUser) {
    // ✅ FIX: was returning null forever if Firestore failed — now shows error
    if (profileError) {
      // Profile failed to load — don't blank, show an error message below
      // (falls through to render the login form with an error message)
    } else if (!userProfile) {
      // Profile still resolving (extremely brief) — wait
      return null;
    } else {
      // Profile ready — redirect based on role
      if (userProfile.role === "admin") return <Navigate to="/admin" replace />;
      if (userProfile.role === "student") return <Navigate to="/student" replace />;
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoginLoading(true);

    try {
      await login(email, password);
      // ✅ No navigate() here — onAuthStateChanged fires automatically
      // and the redirect block above handles routing once profile loads
    } catch (err) {
      switch (err.code) {
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;
        case "auth/user-not-found":
          setError("No account found with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Try again later.");
          break;
        default:
          setError("Login failed. Please try again.");
      }
    } finally {
      // ✅ FIX: was only resetting on error — now always resets
      // Prevents button staying stuck on "Signing in..." after success
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-lg p-8">

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Olympiad Masters</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to continue</p>
        </div>

        {/* Profile fetch error — shown when logged in but Firestore failed */}
        {/* ✅ NEW: replaces silent blank screen */}
        {profileError && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 text-sm px-4 py-3 rounded-xl mb-5">
            Could not load your profile. Please try signing in again.
          </div>
        )}

        {/* Auth error */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 pr-11 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={18} /> : <BsEye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="mt-2 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition disabled:opacity-50 cursor-pointer"
          >
            {loginLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your teacher if you forgot your password.
        </p>
      </div>
    </div>
  );
};

export default Login;