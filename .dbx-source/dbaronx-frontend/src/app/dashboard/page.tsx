"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050510] circuit-bg">
        <Header />
        <main className="pt-24 pb-20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-[#9090BB] text-sm mb-6">Access your dBaronX dashboard</p>
            <div className="flex gap-3 justify-center">
              <Link href="/login" className="bg-[rgba(94,23,235,0.2)] border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[rgba(94,23,235,0.3)] transition-colors">Sign In</Link>
              <Link href="/register" className="btn-glow-purple bg-[#5E17EB] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all">Join Free</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const dashboardSections = [
    { icon: "📦", title: "Orders", desc: "Track your orders and delivery status", href: "/dashboard/orders", color: "#00F0FF" },
    { icon: "💳", title: "Payments", desc: "View payment history and submit proofs", href: "/dashboard/payments", color: "#22C55E" },
    { icon: "🤝", title: "Affiliate", desc: "Referral links, commissions, and payouts", href: "/dashboard/affiliate", color: "#C084FC" },
    { icon: "📺", title: "Watch & Earn", desc: "Daily ad earnings and watch history", href: "/dashboard/watch-earn", color: "#F59E0B" },
    { icon: "✨", title: "AI Stories", desc: "Your story library and creator stats", href: "/dashboard/ai-stories", color: "#5E17EB" },
    { icon: "💫", title: "Dreams", desc: "Your crowdfunding campaigns", href: "/dashboard/dreams", color: "#EC4899" },
    { icon: "💎", title: "ID Card", desc: "Your dBaronX member identity card", href: "/id-card", color: "#FFD700" },
    { icon: "⚙️", title: "Settings", desc: "Account settings and preferences", href: "/dashboard/settings", color: "#9090BB" },
  ];

  const quickStats = [
    { label: "Active Orders", value: "—", icon: "📦", color: "#00F0FF" },
    { label: "Total Earnings", value: "—", icon: "💰", color: "#22C55E" },
    { label: "Referrals", value: "—", icon: "🤝", color: "#C084FC" },
    { label: "Stories Created", value: "—", icon: "✨", color: "#5E17EB" },
  ];

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Welcome */}
          <div className="py-8">
            <span className="tag-badge mb-3 inline-block">Member Dashboard</span>
            <h1 className="text-3xl font-extrabold text-white mb-1">
              Welcome back, <span className="gradient-text-purple">{user?.email?.split("@")?.[0] || "Member"}</span>
            </h1>
            <p className="text-[#9090BB] text-sm">Manage your orders, earnings, stories, and ecosystem activity.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {quickStats?.map((stat) => (
              <div key={stat?.label} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{stat?.icon}</span>
                  <span className="text-xs text-[#9090BB] font-mono">Live</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat?.value}</p>
                <p className="text-xs text-[#9090BB] mt-1">{stat?.label}</p>
              </div>
            ))}
          </div>

          {/* Dashboard Sections */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {dashboardSections?.map((section) => (
              <Link
                key={section?.title}
                href={section?.href}
                className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-5 hover:border-[rgba(94,23,235,0.5)] hover:shadow-[0_0_20px_rgba(94,23,235,0.1)] transition-all group"
              >
                <div className="text-3xl mb-3">{section?.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#C084FC] transition-colors">{section?.title}</h3>
                <p className="text-xs text-[#9090BB] leading-relaxed">{section?.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: section?.color }}>
                  Open <span>→</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="text-xs font-semibold text-white bg-[rgba(94,23,235,0.15)] border border-[rgba(94,23,235,0.3)] px-4 py-2 rounded-full hover:bg-[rgba(94,23,235,0.25)] transition-colors">
                🛍️ Shop Now
              </Link>
              <Link href="/order-status" className="text-xs font-semibold text-[#00F0FF] bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(0,240,255,0.12)] transition-colors">
                📦 Track Order
              </Link>
              <Link href="/payment-proof" className="text-xs font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(34,197,94,0.12)] transition-colors">
                💳 Submit Payment Proof
              </Link>
              <Link href="/ai-stories/create" className="text-xs font-semibold text-[#C084FC] bg-[rgba(192,132,252,0.08)] border border-[rgba(192,132,252,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(192,132,252,0.12)] transition-colors">
                ✨ Create Story
              </Link>
              <Link href="/watch-earn" className="text-xs font-semibold text-[#F59E0B] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(245,158,11,0.12)] transition-colors">
                📺 Watch & Earn
              </Link>
              <button
                onClick={() => signOut()}
                className="text-xs font-semibold text-[#9090BB] bg-transparent border border-[rgba(144,144,187,0.2)] px-4 py-2 rounded-full hover:border-[rgba(144,144,187,0.4)] hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
