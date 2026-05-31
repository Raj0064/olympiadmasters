import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiEyeOff } from "react-icons/fi";
import { BsEye } from "react-icons/bs";

const Login = () => {
  const { login, logout, currentUser, userProfile, profileError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Disabled account: sign out and show error on this page ───────────
  useEffect(() => {
    if (currentUser && userProfile?.disabled) {
      logout();
      setError("Your account has been deactivated. Contact your teacher.");
    }
  }, [currentUser, userProfile]);

  // ── Redirect if logged in and profile is ready ────────────────────────
  // loading=true while profile fetches so this only runs once profile is set
  if (currentUser) {
    if (profileError) {
      // falls through — shows error banner below
    } else if (userProfile && !userProfile.disabled) {
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
    } catch (err) {
      const messages = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
      };
      setError(messages[err.code] ?? "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-lg p-8">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Olympiad Masters</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to continue</p>
        </div>

        {profileError && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 text-sm px-4 py-3 rounded-xl mb-5">
            Could not load your profile. Please try signing in again.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
            {error}
          </div>
        )}

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
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
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