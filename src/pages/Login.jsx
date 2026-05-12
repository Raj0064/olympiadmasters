import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";

const Login = () => {
  const { login, userProfile, currentUser } = useAuth();
  // ↑ removed `loading` — AuthContext handles that now

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Redirect if already logged in ──────────────────────
  if (currentUser) {
    if (!userProfile) return null;
    if (userProfile.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/student" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoginLoading(true);

    try {
      await login(email, password);
      // No navigate() here — onAuthStateChanged triggers automatically
      // which updates currentUser → Login redirects above handle it
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

        {/* Error */}
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
            />
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