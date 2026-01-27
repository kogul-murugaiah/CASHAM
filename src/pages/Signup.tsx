import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Show success message instead of redirecting
      setSuccess("Account created successfully! Please check your email and click the verification link to activate your account.");

    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 pb-24 md:pb-4 relative overflow-hidden">
      {/* Background Mesh */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none animate-float-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none animate-float-delayed"></div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-block p-4 rounded-full bg-white/5 backdrop-blur-sm mb-4 border border-white/10 shadow-lg shadow-purple-500/10">
              <Logo size="xl" className="mx-auto" />
            </div>
            <h1 className="text-4xl font-bold font-heading bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent drop-shadow-sm">
              CASHAM
            </h1>
          </div>

          {/* Signup Card */}
          <div className="glass-card p-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2 font-heading">
                Create Account
              </h2>
              <p className="text-slate-400 text-sm">
                Start tracking your expenses smarter
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all pr-12"
                    placeholder="Create a password"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-300"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all pr-12"
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="glass-card bg-red-500/10 border-red-500/20 p-3 text-red-300 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="glass-card bg-green-500/10 border-green-500/20 p-3 text-green-300 text-sm text-center">
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-purple-500/20 from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

              {/* Login Link */}
              <div className="text-center text-sm text-slate-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
                >
                  Log in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Copyright Text */}
      <div className="text-center space-y-1 pb-4 relative z-10 opacity-50 hover:opacity-100 transition-opacity">
        <p className="text-xs text-slate-500">
          Copyright © 2026 CASHAM. All Rights Reserved.
        </p>
        <p className="text-xs text-slate-600">
          Developed and maintained by Kogul Murugaiah
        </p>
      </div>
    </div>
  );
};

export default Signup;
