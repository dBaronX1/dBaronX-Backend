"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { submitSupplierApplication, type SupplierOnboardingPayload } from "@/lib/api";

const CATEGORIES = ["Electronics", "Fashion & Apparel", "Home & Living", "Beauty & Health", "Sports & Fitness", "Automotive", "Agriculture", "Technology", "Food & Beverage", "Other"];

export default function SuppliersApplyPage() {
  const [form, setForm] = useState<SupplierOnboardingPayload>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    country: "",
    category: "",
    website: "",
    description: "",
    monthly_capacity: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update<K extends keyof SupplierOnboardingPayload>(key: K, value: SupplierOnboardingPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await submitSupplierApplication(form);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050510] circuit-bg">
        <Header />
        <main className="pt-24 pb-20 flex items-center justify-center">
          <div className="max-w-lg mx-auto px-4 text-center">
            <div className="w-16 h-16 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
            <p className="text-[#9090BB] text-sm mb-6">Thank you for applying as a dBaronX supplier. Our team will review your application and contact you within 3–5 business days.</p>
            <Link href="/home" className="btn-glow-purple bg-[#5E17EB] text-white px-6 py-3 rounded-full font-bold text-sm transition-all">Back to Home</Link>
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
        <div className="max-w-3xl mx-auto px-4">
          <div className="py-8">
            <span className="tag-badge mb-3 inline-block">Supplier Onboarding</span>
            <h1 className="text-3xl font-extrabold text-white mb-2">Apply as a Supplier</h1>
            <p className="text-[#9090BB] text-sm">Join the dBaronX supplier network and reach global customers through our platform.</p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: "🌍", text: "Global Reach" },
              { icon: "💰", text: "Guaranteed Payment" },
              { icon: "📊", text: "Analytics Dashboard" },
              { icon: "🤝", text: "Dedicated Support" },
            ].map((b) => (
              <div key={b.text} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.15)] rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{b.icon}</div>
                <p className="text-xs text-[#9090BB]">{b.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Company Name *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Your company name" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Contact Name *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Your full name" value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Email *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" type="email" placeholder="business@company.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Phone</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="+1 234 567 8900" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Country *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Country of operation" value={form.country} onChange={(e) => update("country", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Product Category *</label>
                <select className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" value={form.category} onChange={(e) => update("category", e.target.value)} required>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Website</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="https://yourwebsite.com" value={form.website} onChange={(e) => update("website", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Monthly Capacity</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="e.g. 500 units/month" value={form.monthly_capacity} onChange={(e) => update("monthly_capacity", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9090BB] mb-1.5 block">Business Description *</label>
              <textarea className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors resize-none" rows={4} placeholder="Describe your products, business model, and why you want to partner with dBaronX..." value={form.description} onChange={(e) => update("description", e.target.value)} required />
            </div>
            {error && <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4"><p className="text-sm text-red-400">{error}</p></div>}
            <button type="submit" disabled={loading} className="w-full btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Submitting...</>) : "Submit Application →"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
