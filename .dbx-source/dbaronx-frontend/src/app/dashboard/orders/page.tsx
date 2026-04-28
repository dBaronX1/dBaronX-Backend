"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_ORDERS = [
  { id: "1", ref: "MO-001234", product: "Premium Wireless Headphones", amount: 89.99, status: "fulfilled", date: "2026-04-10" },
  { id: "2", ref: "MO-001235", product: "Smart Watch Series X", amount: 149.99, status: "processing", date: "2026-04-12" },
  { id: "3", ref: "MO-001236", product: "Eco-Friendly Water Bottle", amount: 24.99, status: "pending", date: "2026-04-14" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  proof_submitted: "#00F0FF",
  confirmed: "#22C55E",
  paid: "#22C55E",
  processing: "#C084FC",
  fulfilled: "#4ADE80",
};

export default function DashboardOrdersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050510] circuit-bg">
        <Header />
        <main className="pt-24 pb-20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <Link href="/login" className="btn-glow-purple bg-[#5E17EB] text-white px-6 py-3 rounded-full font-bold text-sm transition-all mt-4 inline-block">Sign In</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="py-8">
            <nav className="text-xs text-[#9090BB] flex items-center gap-2 mb-4">
              <Link href="/dashboard" className="hover:text-[#C084FC] transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-white">Orders</span>
            </nav>
            <h1 className="text-3xl font-extrabold text-white">My Orders</h1>
          </div>

          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9090BB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by reference or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0D0D2B] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
              />
            </div>
            <Link href="/order-status" className="bg-[rgba(94,23,235,0.15)] border border-[rgba(94,23,235,0.3)] text-[#C084FC] px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[rgba(94,23,235,0.25)] transition-colors whitespace-nowrap">
              Track Order
            </Link>
          </div>

          <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(94,23,235,0.15)]">
                    <th className="text-left px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Reference</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Product</th>
                    <th className="text-right px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Amount</th>
                    <th className="text-center px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Date</th>
                    <th className="text-right px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ORDERS.filter((o) =>
                    !search || o.ref.toLowerCase().includes(search.toLowerCase()) || o.product.toLowerCase().includes(search.toLowerCase())
                  ).map((order, i) => (
                    <tr key={order.id} className={`border-b border-[rgba(94,23,235,0.08)] ${i % 2 === 0 ? "" : "bg-[rgba(94,23,235,0.02)]"}`}>
                      <td className="px-5 py-4 font-mono text-xs text-[#00F0FF]">{order.ref}</td>
                      <td className="px-5 py-4 text-white text-xs">{order.product}</td>
                      <td className="px-5 py-4 text-right text-white font-semibold">${order.amount}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full capitalize" style={{ color: STATUS_COLORS[order.status] || "#9090BB", background: `${STATUS_COLORS[order.status] || "#9090BB"}15` }}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-[#9090BB]">{order.date}</td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/order-status?reference=${order.ref}`} className="text-xs text-[#C084FC] hover:text-[#5E17EB] transition-colors">Track →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {MOCK_ORDERS.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-white font-semibold mb-2">No orders yet</p>
                <Link href="/products" className="text-xs text-[#C084FC] hover:text-[#5E17EB] transition-colors">Start shopping →</Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
