"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OpenInBotButton from "@/components/OpenInBotButton";

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_usd: number;
  raised_usd: number;
  image_url: string;
  category: string;
  campaign_status: string;
  end_date: string;
  rewards: Array<{ tier: string; amount: number; reward: string }>;
  creator_id: string;
}

export default function DreamsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [pledgeModal, setPledgeModal] = useState<Campaign | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pledgeMethod, setPledgeMethod] = useState<"solana_pay" | "wallet_connect" | "manual_proof">("manual_proof");
  const [pledgeProof, setPledgeProof] = useState<File | null>(null);
  const [pledgeNotes, setPledgeNotes] = useState("");
  const [pledgeSubmitting, setPledgeSubmitting] = useState(false);
  const [pledgeSuccess, setPledgeSuccess] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ title: "", description: "", goal_usd: "", category: "general", image_url: "" });
  const [campaignSubmitting, setCampaignSubmitting] = useState(false);
  const [phantomAddress, setPhantomAddress] = useState<string | null>(null);
  const [phantomConnecting, setPhantomConnecting] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("campaign_status", "active")
        .order("created_at", { ascending: false });
      if (error) { console.log("Campaigns error:", error.message); return; }
      setCampaigns(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handlePledge = async () => {
    if (!user) { window.location.href = "/login"; return; }
    if (!pledgeAmount || !pledgeModal) return;
    setPledgeSubmitting(true);
    try {
      let proofUrl = "";
      if (pledgeProof) {
        const fileName = `proofs/${user.id}/${Date.now()}_${pledgeProof.name}`;
        const { data: uploadData } = await supabase.storage.from("payment-proofs").upload(fileName, pledgeProof);
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(fileName);
          proofUrl = urlData?.publicUrl || "";
        }
      }
      const { error } = await supabase.from("pledges").insert({
        campaign_id: pledgeModal.id,
        user_id: user.id,
        amount_usd: parseFloat(pledgeAmount),
        payment_method: pledgeMethod,
        proof_url: proofUrl,
        payment_status: proofUrl ? "proof_uploaded" : "pending",
      });
      if (error) { console.log("Pledge error:", error.message); return; }

      await supabase.functions.invoke("send-email", {
        body: { type: "pledge_confirmation", userEmail: user.email, campaignTitle: pledgeModal.title, amount: pledgeAmount },
      });

      setPledgeSuccess(true);
      setPledgeModal(null);
    } finally {
      setPledgeSubmitting(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!user) { window.location.href = "/login"; return; }
    setCampaignSubmitting(true);
    try {
      const { error } = await supabase.from("campaigns").insert({
        creator_id: user.id,
        title: newCampaign.title,
        description: newCampaign.description,
        goal_usd: parseFloat(newCampaign.goal_usd),
        category: newCampaign.category,
        image_url: newCampaign.image_url,
        campaign_status: "pending",
      });
      if (error) { console.log("Campaign create error:", error.message); return; }
      setCreateModal(false);
      setNewCampaign({ title: "", description: "", goal_usd: "", category: "general", image_url: "" });
      alert("Campaign submitted for review! Admin will approve it shortly.");
    } finally {
      setCampaignSubmitting(false);
    }
  };

  const connectPhantom = async () => {
    setPhantomConnecting(true);
    try {
      const solana = (window as any)?.solana;
      if (!solana?.isPhantom) {
        window.open("https://phantom.app/", "_blank");
        return;
      }
      const response = await solana.connect();
      setPhantomAddress(response.publicKey.toString());
    } catch (err) {
      console.log("Phantom connection cancelled or failed:", err);
    } finally {
      setPhantomConnecting(false);
    }
  };

  const disconnectPhantom = async () => {
    try {
      const solana = (window as any)?.solana;
      if (solana?.isPhantom) await solana.disconnect();
    } catch (_) {}
    setPhantomAddress(null);
  };

  const progressPct = (raised: number, goal: number) => Math.min(100, Math.round((raised / goal) * 100));

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero */}
          <div className="text-center py-12">
            <span className="tag-badge mb-4 inline-block">Crowdfunding</span>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text-purple mb-4">dBaronX Dreams</h1>
            <p className="text-fg-muted max-w-2xl mx-auto mb-6">
              Kickstarter-style crowdfunding open to any nationality, any cause. Back real projects, earn rewards, and build the future together.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="tag-badge-green text-xs">✓ Any Nationality</span>
              <span className="tag-badge text-xs">✓ Any Currency</span>
              <span className="tag-badge-cyan text-xs">✓ Crypto + Manual</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setCreateModal(true)}
                className="btn-glow-purple bg-primary text-white font-bold px-8 py-3 rounded-full transition-all hover:bg-primary-light"
              >
                + Launch Your Campaign
              </button>
              <OpenInBotButton page="dreams" size="md" variant="outline" label="Browse in Bot" />
            </div>
          </div>

          {/* Campaigns Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <div key={i} className="bg-bg-card rounded-2xl h-96 animate-pulse border border-[rgba(94,23,235,0.1)]" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 text-fg-muted">No active campaigns yet. Be the first to launch!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => {
                const pct = progressPct(campaign.raised_usd, campaign.goal_usd);
                return (
                  <div key={campaign.id} className="card-hover-glow bg-bg-card rounded-2xl overflow-hidden flex flex-col">
                    <div className="h-48 overflow-hidden">
                      <img src={campaign.image_url || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400"} alt={campaign.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <span className="text-xs text-fg-muted capitalize mb-1">{campaign.category}</span>
                      <h3 className="font-bold text-fg-base mb-2">{campaign.title}</h3>
                      <p className="text-xs text-fg-muted mb-4 flex-1 line-clamp-3">{campaign.description}</p>
                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-eco-green font-bold">${campaign.raised_usd.toLocaleString()} raised</span>
                          <span className="text-fg-muted">{pct}%</span>
                        </div>
                        <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-fg-muted">Goal: ${campaign.goal_usd.toLocaleString()}</span>
                          {campaign.end_date && <span className="text-fg-muted">Ends {new Date(campaign.end_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      {/* Reward tiers */}
                      {campaign.rewards?.length > 0 && (
                        <div className="mb-4 space-y-1">
                          {campaign.rewards.slice(0, 2).map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-accent">◆</span>
                              <span className="text-fg-muted">${r.amount} — {r.tier}: {r.reward}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setPledgeModal(campaign)}
                        className="w-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        Back This Project
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Pledge Modal */}
      {pledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.3)] overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-[rgba(94,23,235,0.2)] flex items-center justify-between">
              <h2 className="text-lg font-bold text-fg-base">Back: {pledgeModal.title}</h2>
              <button onClick={() => setPledgeModal(null)} className="text-fg-muted hover:text-accent">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">Pledge Amount (USD)</label>
                <input
                  type="number"
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(e.target.value)}
                  min="1"
                  className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "solana_pay", label: "Solana Pay", icon: "◎" },
                    { value: "wallet_connect", label: "Phantom", icon: "👻" },
                    { value: "manual_proof", label: "Manual", icon: "📄" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPledgeMethod(m.value as any)}
                      className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                        pledgeMethod === m.value ? "border-accent bg-accent/10 text-accent" : "border-[rgba(94,23,235,0.3)] text-fg-muted"
                      }`}
                    >
                      <div className="text-base mb-0.5">{m.icon}</div>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Phantom Wallet Connect */}
              {pledgeMethod === "wallet_connect" && (
                <div className="bg-bg-base rounded-xl p-4 border border-accent/20 space-y-3">
                  <p className="text-xs text-accent font-semibold mb-1">Phantom Wallet (Solana)</p>
                  {!phantomAddress ? (
                    <button
                      onClick={connectPhantom}
                      disabled={phantomConnecting}
                      className="w-full btn-glow-purple bg-primary text-white text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      {phantomConnecting ? "Connecting..." : "Connect Phantom Wallet"}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-eco-green font-semibold">✓ Connected</span>
                        <button onClick={disconnectPhantom} className="text-xs text-fg-muted hover:text-accent underline">Disconnect</button>
                      </div>
                      <p className="text-xs text-fg-muted font-mono break-all">{phantomAddress}</p>
                      <div className="border-t border-[rgba(94,23,235,0.2)] pt-2">
                        <p className="text-xs text-fg-muted">Send pledge to campaign wallet:</p>
                        <p className="text-xs text-accent font-mono break-all mt-1">4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE</p>
                        <p className="text-xs text-fg-muted mt-1">Amount: <span className="text-eco-green">${pledgeAmount || "0"} USDC</span> or equivalent DBX</p>
                        <p className="text-xs text-fg-muted mt-1">After sending, paste your transaction ID in the notes below.</p>
                      </div>
                    </div>
                  )}
                  <textarea
                    value={pledgeNotes}
                    onChange={(e) => setPledgeNotes(e.target.value)}
                    placeholder="Paste Solana transaction ID / signature here..."
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-xs text-fg-base focus:outline-none focus:border-accent resize-none h-16"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">Upload Payment Proof</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setPledgeProof(e.target.files?.[0] || null)}
                  className="w-full text-xs text-fg-muted bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl p-3 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-primary/20 file:text-primary"
                />
                <textarea
                  value={pledgeNotes}
                  onChange={(e) => setPledgeNotes(e.target.value)}
                  placeholder="Transaction ID or payment notes..."
                  className="w-full mt-2 bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-xs text-fg-base focus:outline-none focus:border-accent resize-none h-16"
                />
              </div>
              <button
                onClick={handlePledge}
                disabled={pledgeSubmitting || !pledgeAmount}
                className="w-full btn-glow-purple bg-primary text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {pledgeSubmitting ? "Submitting..." : `Pledge $${pledgeAmount || "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.3)] overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-[rgba(94,23,235,0.2)] flex items-center justify-between">
              <h2 className="text-lg font-bold text-fg-base">Launch Campaign</h2>
              <button onClick={() => setCreateModal(false)} className="text-fg-muted hover:text-accent">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "title", label: "Campaign Title", placeholder: "Your campaign name" },
                { key: "goal_usd", label: "Funding Goal (USD)", placeholder: "5000", type: "number" },
                { key: "image_url", label: "Image URL", placeholder: "https://..." },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-fg-muted mb-1.5">{field.label}</label>
                  <input
                    type={field.type || "text"}
                    value={(newCampaign as any)[field.key]}
                    onChange={(e) => setNewCampaign((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">Description</label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your campaign..."
                  className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent resize-none h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">Category</label>
                <select
                  value={newCampaign.category}
                  onChange={(e) => setNewCampaign((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                >
                  {["general", "environment", "agriculture", "technology", "health", "education", "community"].map((c) => (
                    <option key={c} value={c} className="bg-bg-base">{c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateCampaign}
                disabled={campaignSubmitting || !newCampaign.title || !newCampaign.goal_usd}
                className="w-full btn-glow-purple bg-primary text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {campaignSubmitting ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pledge Success */}
      {pledgeSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card rounded-2xl border border-eco-green/30 p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-eco-green mb-2">Pledge Submitted!</h2>
            <p className="text-fg-muted text-sm mb-6">Your pledge has been recorded. Admin will verify your payment and update the campaign.</p>
            <button onClick={() => setPledgeSuccess(false)} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl">Done</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
