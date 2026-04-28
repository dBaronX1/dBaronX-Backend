"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AppImage from "@/components/ui/AppImage";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/home");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://dbaronx.com"}/auth/callback`,
      });
      setForgotSent(true);
    } catch (_) {
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-bg-base circuit-bg flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="logo-glow rounded-full w-16 h-16 overflow-hidden mb-4">
              <AppImage
                src="https://img.rocket.new/generatedImages/rocket_gen_img_1f1d6b225-1774722127588.png"
                alt="dBaronX logo"
                width={64}
                height={64}
                className="w-full h-full object-cover rounded-full" />
            </div>
            <h1 className="text-2xl font-bold gradient-text-purple">Reset Password</h1>
            <p className="text-fg-muted text-sm mt-1">Enter your email to receive a reset link</p>
          </div>

          {forgotSent ? (
            <div className="text-center p-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-2xl">
              <div className="text-4xl mb-3">📧</div>
              <h3 className="font-bold text-[#4ADE80] mb-2">Check Your Email</h3>
              <p className="text-fg-muted text-sm">If an account exists for {forgotEmail}, you&apos;ll receive a password reset link shortly.</p>
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                className="mt-4 text-accent hover:underline text-sm">
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="you@example.com" />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full btn-glow-purple bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-50">
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full text-fg-muted text-sm hover:text-accent transition-colors py-2">
                ← Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base circuit-bg flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="logo-glow rounded-full w-16 h-16 overflow-hidden mb-4">
            <AppImage
              src="https://img.rocket.new/generatedImages/rocket_gen_img_1f1d6b225-1774722127588.png"
              alt="dBaronX logo"
              width={64}
              height={64}
              className="w-full h-full object-cover rounded-full" />
          </div>
          <h1 className="text-2xl font-bold gradient-text-purple">Welcome Back</h1>
          <p className="text-fg-muted text-sm mt-1">Sign in to your dBaronX account</p>
        </div>

        {/* Trust indicators */}
        <div className="flex justify-center gap-4 mb-6">
          {["🔒 Secure", "✅ Verified", "🌍 Global"].map((item) => (
            <span key={item} className="text-xs text-fg-muted">{item}</span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              placeholder="you@example.com" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-fg-muted">Password</label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs text-accent hover:underline transition-colors">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 pr-12 text-fg-base text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="••••••••" />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-accent transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-glow-purple bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : "Sign In"}
          </button>
        </form>

        <p className="text-center text-fg-muted text-sm mt-6">
          No account?{" "}
          <Link href="/register" className="text-accent hover:underline font-medium">
            Create one free
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link href="/home" className="text-fg-muted text-xs hover:text-accent transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}