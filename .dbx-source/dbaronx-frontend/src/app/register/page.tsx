"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AppImage from "@/components/ui/AppImage";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
    if (score <= 3) return { score, label: "Fair", color: "#F59E0B" };
    return { score, label: "Strong", color: "#4ADE80" };
  };

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, { fullName });
      setSuccess(true);
      setTimeout(() => router.push("/home"), 2000);
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg-base circuit-bg flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-[#4ADE80] mb-2">Account Created!</h1>
          <p className="text-fg-muted text-sm mb-4">Welcome to dBaronX. Redirecting you to the platform...</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold gradient-text-purple">Join dBaronX</h1>
          <p className="text-fg-muted text-sm mt-1">Create your free account — any nationality welcome</p>
        </div>

        {/* Benefits */}
        <div className="mb-6 grid grid-cols-2 gap-2">
          {[
            { icon: "🛍️", label: "Shop globally" },
            { icon: "💎", label: "DBX discounts" },
            { icon: "📦", label: "Order tracking" },
            { icon: "🎁", label: "Referral rewards" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs text-fg-muted bg-[rgba(94,23,235,0.06)] border border-[rgba(94,23,235,0.15)] rounded-xl px-3 py-2">
              <span>{b.icon}</span><span>{b.label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              placeholder="Your full name" />
          </div>
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

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 pr-12 text-fg-base text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="Min. 6 characters" />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-accent transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i <= strength.score ? strength.color : "rgba(255,255,255,0.1)" }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strength.color }}>{strength.label} password</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`w-full bg-bg-card border rounded-xl px-4 py-3 pr-12 text-fg-base text-sm focus:outline-none focus:ring-1 transition-all ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-400/50 focus:border-red-400 focus:ring-red-400/30"
                    : confirmPassword && confirmPassword === password
                    ? "border-[#4ADE80]/50 focus:border-[#4ADE80] focus:ring-[#4ADE80]/30"
                    : "border-[rgba(94,23,235,0.3)] focus:border-accent focus:ring-accent/30"
                }`}
                placeholder="Re-enter your password" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-accent transition-colors focus:outline-none"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">
              Referral Code <span className="text-xs text-fg-muted opacity-60">(optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all font-mono"
              placeholder="XXXXXXXX" />
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
                Creating account...
              </span>
            ) : "Create Free Account"}
          </button>

          <p className="text-xs text-fg-muted text-center leading-relaxed">
            By creating an account, you agree to our{" "}
            <span className="text-accent cursor-pointer hover:underline">Terms of Service</span> and{" "}
            <span className="text-accent cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </form>

        <p className="text-center text-fg-muted text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Sign in
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
