"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { submitAdvertiserApplication, type AdvertiserOnboardingPayload } from "@/lib/api";

const INDUSTRIES = ["E-Commerce", "Technology", "Fashion", "Real Estate", "Finance", "Healthcare", "Food & Beverage", "Automotive", "Education", "Entertainment", "Agriculture", "Other"];
const BUDGETS = ["$50–$200/month", "$200–$500/month", "$500–$1,000/month", "$1,000–$5,000/month", "$5,000+/month"];

export default function AdvertisersApplyPage() {
  const [form, setForm] = useState<AdvertiserOnboardingPayload>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    country: "",
    industry: "",
    website: "",
    campaign_goal: "",
    monthly_budget: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update<K extends keyof AdvertiserOnboardingPayload>(key: K, value: AdvertiserOnboardingPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await submitAdvertiserApplication(form);
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
            <div className="w-16 h-16 bg-[rgba(0,240,255,0.1)] border border-[rgba(0,240,255,0.3)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Campaign Request Submitted!</h1>
            <p className="text-[#9090BB] text-sm mb-6">Our advertising team will review your request and reach out within 1–2 business days to set up your campaign.</p>
            <Link href="/home" className="btn-glow-cyan bg-transparent border border-[#00F0FF] text-[#00F0FF] px-6 py-3 rounded-full font-bold text-sm transition-all">Back to Home</Link>
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
            <span className="tag-badge-cyan mb-3 inline-block">Advertiser Onboarding</span>
            <h1 className="text-3xl font-extrabold text-white mb-2">Launch Your Campaign</h1>
            <p className="text-[#9090BB] text-sm">Reach verified dBaronX users who earn rewards for genuine ad engagement.</p>
          </div>

          {/* Why Advertise */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: "👁️", text: "Real Attention" },
              { icon: "🎯", text: "Targeted Reach" },
              { icon: "📊", text: "Live Analytics" },
              { icon: "💰", text: "Budget Control" },
            ].map((b) => (
              <div key={b.text} className="bg-[#0D0D2B] border border-[rgba(0,240,255,0.15)] rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{b.icon}</div>
                <p className="text-xs text-[#9090BB]">{b.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="bg-[#0D0D2B] border border-[rgba(0,240,255,0.15)] rounded-2xl p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Company Name *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" placeholder="Your company name" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Contact Name *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" placeholder="Your full name" value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Email *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" type="email" placeholder="ads@company.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Phone</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" placeholder="+1 234 567 8900" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Country *</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" placeholder="Country" value={form.country} onChange={(e) => update("country", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Industry *</label>
                <select className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" value={form.industry} onChange={(e) => update("industry", e.target.value)} required>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Website</label>
                <input className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" placeholder="https://yourwebsite.com" value={form.website} onChange={(e) => update("website", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#9090BB] mb-1.5 block">Monthly Budget</label>
                <select className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors" value={form.monthly_budget} onChange={(e) => update("monthly_budget", e.target.value)}>
                  <option value="">Select budget range</option>
                  {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9090BB] mb-1.5 block">Campaign Goal *</label>
              <textarea className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(0,240,255,0.5)] transition-colors resize-none" rows={4} placeholder="Describe your campaign objectives, target audience, and what you want to achieve..." value={form.campaign_goal} onChange={(e) => update("campaign_goal", e.target.value)} required />
            </div>
            {error && <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4"><p className="text-sm text-red-400">{error}</p></div>}
            <button type="submit" disabled={loading} className="w-full btn-glow-cyan bg-transparent border-2 border-[#00F0FF] text-[#00F0FF] hover:bg-[rgba(0,240,255,0.1)] py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Submitting...</>) : "Launch Campaign →"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
