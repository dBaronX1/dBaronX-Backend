"use client";
import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminOpsPage() {
  const { user } = useAuth();

  const sections = [
    {
      title: "Orders Queue",
      icon: "📦",
      color: "#00F0FF",
      stats: [
        { label: "Pending Orders", value: "—" },
        { label: "Processing", value: "—" },
        { label: "Fulfilled Today", value: "—" },
      ],
      actions: [
        { label: "View All Orders", href: "/dashboard/orders" },
        { label: "Order Status Lookup", href: "/order-status" },
      ],
    },
    {
      title: "Payment Proofs",
      icon: "💳",
      color: "#22C55E",
      stats: [
        { label: "Pending Verification", value: "—" },
        { label: "Verified Today", value: "—" },
        { label: "Rejected", value: "—" },
      ],
      actions: [
        { label: "Review Proofs", href: "/admin" },
      ],
    },
    {
      title: "Supplier Fulfillment",
      icon: "🏭",
      color: "#C084FC",
      stats: [
        { label: "Awaiting Fulfillment", value: "—" },
        { label: "In Transit", value: "—" },
        { label: "Delivered", value: "—" },
      ],
      actions: [
        { label: "Fulfillment Board", href: "/admin" },
      ],
    },
    {
      title: "Campaigns",
      icon: "📊",
      color: "#F59E0B",
      stats: [
        { label: "Active Campaigns", value: "—" },
        { label: "Pending Review", value: "—" },
        { label: "Total Budget", value: "—" },
      ],
      actions: [
        { label: "Campaign Manager", href: "/admin" },
      ],
    },
    {
      title: "User Signals",
      icon: "👥",
      color: "#EC4899",
      stats: [
        { label: "New Signups Today", value: "—" },
        { label: "Active Users", value: "—" },
        { label: "Support Tickets", value: "—" },
      ],
      actions: [
        { label: "User Management", href: "/admin" },
      ],
    },
    {
      title: "Dreams / Crowdfunding",
      icon: "💫",
      color: "#5E17EB",
      stats: [
        { label: "Active Campaigns", value: "—" },
        { label: "Total Raised", value: "—" },
        { label: "Pending Approval", value: "—" },
      ],
      actions: [
        { label: "Dreams Admin", href: "/admin/dreams" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="py-8">
            <span className="tag-badge mb-3 inline-block">Internal Operations</span>
            <h1 className="text-3xl font-extrabold text-white mb-2">Admin Operations</h1>
            <p className="text-[#9090BB] text-sm">Platform operations overview. All data connects to live backend APIs.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sections?.map((section) => (
              <div key={section?.title} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-5 hover:border-[rgba(94,23,235,0.4)] transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{section?.icon}</span>
                  <h2 className="text-sm font-bold text-white">{section?.title}</h2>
                </div>
                <div className="space-y-2 mb-4">
                  {section?.stats?.map((stat) => (
                    <div key={stat?.label} className="flex items-center justify-between">
                      <span className="text-xs text-[#9090BB]">{stat?.label}</span>
                      <span className="text-xs font-semibold text-white font-mono">{stat?.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-3 border-t border-[rgba(94,23,235,0.1)]">
                  {section?.actions?.map((action) => (
                    <Link
                      key={action?.label}
                      href={action?.href}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                      style={{ color: section?.color, borderColor: `${section?.color}30`, background: `${section?.color}08` }}
                    >
                      {action?.label} →
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-[rgba(94,23,235,0.04)] border border-[rgba(94,23,235,0.15)] rounded-xl p-4 text-center">
            <p className="text-xs text-[#9090BB]">
              This is a frontend shell. Connect to the NestJS API at{" "}
              <span className="font-mono text-[#00F0FF]">{process.env.NEXT_PUBLIC_API_BASE_URL || "API_BASE_URL"}</span>{" "}
              to populate live data.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
