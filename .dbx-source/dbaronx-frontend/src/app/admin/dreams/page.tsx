"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

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
  dbx_equity_option: boolean;
  dbx_equity_pct: number;
  admin_notes: string;
  created_at: string;
}

const EMPTY_CAMPAIGN: Partial<Campaign> = {
  title: "",
  description: "",
  goal_usd: 0,
  image_url: "",
  category: "general",
  campaign_status: "pending",
  dbx_equity_option: false,
  dbx_equity_pct: 0,
  rewards: [],
  admin_notes: "",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-400/20 text-yellow-400",
  active: "bg-green-400/20 text-green-400",
  funded: "bg-accent/20 text-accent",
  rejected: "bg-red-400/20 text-red-400",
  completed: "bg-purple-400/20 text-purple-400",
};

export default function AdminDreamsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [modal, setModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Partial<Campaign>>(EMPTY_CAMPAIGN);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [rewardInput, setRewardInput] = useState({ tier: "", amount: "", reward: "" });
  const [impactSyncPct, setImpactSyncPct] = useState(0);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    setCheckingAdmin(true);
    try {
      // Check via user_profiles role OR user_roles table
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("user_profiles").select("role").eq("id", user.id).single(),
        supabase.from("user_roles").select("is_admin").eq("user_id", user.id).single(),
      ]);
      const isAdminUser = profileRes.data?.role === "admin" || roleRes.data?.is_admin === true;
      if (isAdminUser) {
        setIsAdmin(true);
        fetchCampaigns();
        fetchImpactSync();
      } else {
        router.push("/home");
      }
    } finally {
      setCheckingAdmin(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { console.log("Campaigns error:", error.message); return; }
      setCampaigns(data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchImpactSync = async () => {
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("raised_usd, goal_usd")
        .eq("campaign_status", "active");
      if (data && data.length > 0) {
        const totalRaised = data.reduce((s, c) => s + (c.raised_usd || 0), 0);
        const totalGoal = data.reduce((s, c) => s + (c.goal_usd || 0), 0);
        setImpactSyncPct(totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0);
      }
    } catch (_) {}
  };

  const openNew = () => {
    setEditCampaign({ ...EMPTY_CAMPAIGN, rewards: [] });
    setRewardInput({ tier: "", amount: "", reward: "" });
    setModal(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditCampaign({ ...campaign });
    setRewardInput({ tier: "", amount: "", reward: "" });
    setModal(true);
  };

  const addReward = () => {
    if (!rewardInput.tier || !rewardInput.amount || !rewardInput.reward) return;
    const newReward = { tier: rewardInput.tier, amount: parseFloat(rewardInput.amount), reward: rewardInput.reward };
    setEditCampaign((prev) => ({ ...prev, rewards: [...(prev.rewards || []), newReward] }));
    setRewardInput({ tier: "", amount: "", reward: "" });
  };

  const removeReward = (index: number) => {
    setEditCampaign((prev) => ({ ...prev, rewards: (prev.rewards || []).filter((_, i) => i !== index) }));
  };

  const saveCampaign = async () => {
    if (!editCampaign.title || !editCampaign.goal_usd) return;
    setSaving(true);
    try {
      const payload = {
        title: editCampaign.title,
        description: editCampaign.description,
        goal_usd: editCampaign.goal_usd,
        image_url: editCampaign.image_url,
        category: editCampaign.category,
        campaign_status: editCampaign.campaign_status,
        dbx_equity_option: editCampaign.dbx_equity_option,
        dbx_equity_pct: editCampaign.dbx_equity_pct,
        rewards: editCampaign.rewards,
        admin_notes: editCampaign.admin_notes,
        end_date: editCampaign.end_date,
      };

      if (editCampaign.id) {
        const { error } = await supabase.from("campaigns").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editCampaign.id);
        if (error) { console.log("Update error:", error.message); return; }
      } else {
        const { error } = await supabase.from("campaigns").insert({ ...payload, creator_id: user?.id, raised_usd: 0 });
        if (error) { console.log("Create error:", error.message); return; }
      }
      setModal(false);
      fetchCampaigns();
      fetchImpactSync();
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("campaigns").update({ campaign_status: status }).eq("id", id);
    if (error) { console.log("Status update error:", error.message); return; }
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, campaign_status: status } : c));
    fetchImpactSync();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    await supabase.from("campaigns").delete().eq("id", id);
    fetchCampaigns();
  };

  const filtered = filterStatus === "all" ? campaigns : campaigns.filter((c) => c.campaign_status === filterStatus);
  const progressPct = (raised: number, goal: number) => Math.min(100, Math.round((raised / goal) * 100));

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-fg-muted animate-pulse">Checking admin permissions...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="tag-badge text-xs">Admin</span>
                <span className="text-fg-muted text-xs">→</span>
                <span className="tag-badge-cyan text-xs">Dreams</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text-purple">Campaign Management</h1>
              <p className="text-fg-muted text-sm mt-1">Create, approve, and manage crowdfunding campaigns</p>
            </div>
            <button
              onClick={openNew}
              className="btn-glow-purple bg-primary text-white font-bold px-6 py-3 rounded-full text-sm uppercase tracking-wider hover:bg-primary-light transition-all flex items-center gap-2"
            >
              <span>+</span> New Campaign
            </button>
          </div>

          {/* Impact Sync Bar */}
          <div className="bg-bg-card rounded-2xl border border-[rgba(34,197,94,0.2)] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌍</span>
                <span className="text-sm font-bold text-white">Global Ops Funding Progress</span>
                <span className="tag-badge-green text-xs">Synced to Impact Hub</span>
              </div>
              <span className="text-[#4ADE80] font-bold font-mono">{impactSyncPct}%</span>
            </div>
            <div className="h-3 bg-bg-base rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4ADE80] to-accent rounded-full transition-all duration-700"
                style={{ width: `${impactSyncPct}%` }}
              />
            </div>
            <p className="text-xs text-fg-muted mt-2">
              Combined funding progress across all active campaigns — visible on checkout and Impact Hub
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", value: campaigns.length, color: "text-fg-base" },
              { label: "Pending Review", value: campaigns.filter((c) => c.campaign_status === "pending").length, color: "text-yellow-400" },
              { label: "Active", value: campaigns.filter((c) => c.campaign_status === "active").length, color: "text-green-400" },
              { label: "Funded", value: campaigns.filter((c) => c.campaign_status === "funded").length, color: "text-accent" },
            ].map((stat, i) => (
              <div key={i} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-4">
                <p className="text-xs text-fg-muted mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["all", "pending", "active", "funded", "rejected", "completed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                  filterStatus === s
                    ? "bg-primary text-white" : "border border-[rgba(94,23,235,0.3)] text-fg-muted hover:border-accent hover:text-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Campaigns Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-bg-card rounded-2xl h-24 animate-pulse border border-[rgba(94,23,235,0.1)]" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-fg-muted">
              <div className="text-4xl mb-3">💫</div>
              <p>No campaigns found. Create the first one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((campaign) => {
                const pct = progressPct(campaign.raised_usd, campaign.goal_usd);
                return (
                  <div key={campaign.id} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-5 hover:border-[rgba(94,23,235,0.4)] transition-all">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Campaign Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-bold text-white">{campaign.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[campaign.campaign_status] || "bg-primary/20 text-primary-light"}`}>
                            {campaign.campaign_status}
                          </span>
                          {campaign.dbx_equity_option && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">DBX Equity {campaign.dbx_equity_pct}%</span>
                          )}
                        </div>
                        <p className="text-xs text-fg-muted mb-3 line-clamp-2">{campaign.description}</p>

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#4ADE80] font-bold">${campaign.raised_usd?.toLocaleString()} raised</span>
                            <span className="text-fg-muted">Goal: ${campaign.goal_usd?.toLocaleString()} · {pct}%</span>
                          </div>
                          <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Rewards */}
                        {campaign.rewards?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {campaign.rewards.slice(0, 3).map((r, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(94,23,235,0.1)] text-[#C084FC] border border-[rgba(94,23,235,0.2)]">
                                ${r.amount} — {r.tier}
                              </span>
                            ))}
                            {campaign.rewards.length > 3 && <span className="text-[10px] text-fg-muted">+{campaign.rewards.length - 3} more</span>}
                          </div>
                        )}

                        <div className="text-[10px] text-fg-muted font-mono">
                          Created: {new Date(campaign.created_at).toLocaleDateString()}
                          {campaign.end_date && ` · Ends: ${new Date(campaign.end_date).toLocaleDateString()}`}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEdit(campaign)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-all"
                        >
                          Edit
                        </button>
                        {campaign.campaign_status === "pending" && (
                          <button
                            onClick={() => updateStatus(campaign.id, "active")}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-green-400/20 border border-green-400/40 text-green-400 hover:bg-green-400 hover:text-white transition-all"
                          >
                            Approve
                          </button>
                        )}
                        {campaign.campaign_status === "active" && (
                          <button
                            onClick={() => updateStatus(campaign.id, "funded")}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-accent/20 border border-accent/40 text-accent hover:bg-accent hover:text-bg-base transition-all"
                          >
                            Mark Funded
                          </button>
                        )}
                        {campaign.campaign_status === "pending" && (
                          <button
                            onClick={() => updateStatus(campaign.id, "rejected")}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-400/20 border border-red-400/40 text-red-400 hover:bg-red-400 hover:text-white transition-all"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900/20 border border-red-900/40 text-red-400/60 hover:bg-red-900/40 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Campaign Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.3)] overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-[rgba(94,23,235,0.2)] flex items-center justify-between sticky top-0 bg-bg-card z-10">
              <h2 className="text-lg font-bold text-fg-base">{editCampaign.id ? "Edit Campaign" : "New Campaign"}</h2>
              <button onClick={() => setModal(false)} className="text-fg-muted hover:text-accent text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">Campaign Title *</label>
                <input
                  type="text"
                  value={editCampaign.title || ""}
                  onChange={(e) => setEditCampaign((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  placeholder="Campaign title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">Description *</label>
                <textarea
                  value={editCampaign.description || ""}
                  onChange={(e) => setEditCampaign((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent resize-none"
                  placeholder="Describe the campaign..."
                />
              </div>

              {/* Goal + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">Goal (USD) *</label>
                  <input
                    type="number"
                    value={editCampaign.goal_usd || ""}
                    onChange={(e) => setEditCampaign((p) => ({ ...p, goal_usd: parseFloat(e.target.value) }))}
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">Category</label>
                  <select
                    value={editCampaign.category || "general"}
                    onChange={(e) => setEditCampaign((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  >
                    {["general", "eco", "tech", "community", "farm", "recycling", "health"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status + End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">Status</label>
                  <select
                    value={editCampaign.campaign_status || "pending"}
                    onChange={(e) => setEditCampaign((p) => ({ ...p, campaign_status: e.target.value }))}
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  >
                    {["pending", "active", "funded", "rejected", "completed"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={editCampaign.end_date ? editCampaign.end_date.split("T")[0] : ""}
                    onChange={(e) => setEditCampaign((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">Image URL</label>
                <input
                  type="url"
                  value={editCampaign.image_url || ""}
                  onChange={(e) => setEditCampaign((p) => ({ ...p, image_url: e.target.value }))}
                  className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  placeholder="https://..."
                />
              </div>

              {/* DBX Equity Option */}
              <div className="bg-[rgba(0,240,255,0.05)] border border-[rgba(0,240,255,0.15)] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="dbx-equity"
                    checked={editCampaign.dbx_equity_option || false}
                    onChange={(e) => setEditCampaign((p) => ({ ...p, dbx_equity_option: e.target.checked }))}
                    className="w-4 h-4 accent-accent"
                  />
                  <label htmlFor="dbx-equity" className="text-sm font-medium text-accent cursor-pointer">
                    Enable DBX Equity Option
                  </label>
                </div>
                {editCampaign.dbx_equity_option && (
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">DBX Equity % (of campaign)</label>
                    <input
                      type="number"
                      value={editCampaign.dbx_equity_pct || ""}
                      onChange={(e) => setEditCampaign((p) => ({ ...p, dbx_equity_pct: parseFloat(e.target.value) }))}
                      min="0" max="100"
                      className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                      placeholder="5"
                    />
                  </div>
                )}
              </div>

              {/* Reward Tiers */}
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-2">Reward Tiers</label>
                {(editCampaign.rewards || []).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 bg-bg-base rounded-xl px-3 py-2">
                    <span className="text-xs text-accent flex-1">${r.amount} — <span className="font-bold">{r.tier}</span>: {r.reward}</span>
                    <button onClick={() => removeReward(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input
                    type="text"
                    value={rewardInput.tier}
                    onChange={(e) => setRewardInput((p) => ({ ...p, tier: e.target.value }))}
                    className="bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-fg-base text-xs focus:outline-none focus:border-accent"
                    placeholder="Tier name"
                  />
                  <input
                    type="number"
                    value={rewardInput.amount}
                    onChange={(e) => setRewardInput((p) => ({ ...p, amount: e.target.value }))}
                    className="bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-fg-base text-xs focus:outline-none focus:border-accent"
                    placeholder="Amount $"
                  />
                  <input
                    type="text"
                    value={rewardInput.reward}
                    onChange={(e) => setRewardInput((p) => ({ ...p, reward: e.target.value }))}
                    className="bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-fg-base text-xs focus:outline-none focus:border-accent"
                    placeholder="Reward description"
                  />
                </div>
                <button
                  onClick={addReward}
                  className="mt-2 text-xs text-accent hover:text-white border border-accent/30 hover:border-accent px-4 py-1.5 rounded-xl transition-all"
                >
                  + Add Reward Tier
                </button>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">Admin Notes</label>
                <textarea
                  value={editCampaign.admin_notes || ""}
                  onChange={(e) => setEditCampaign((p) => ({ ...p, admin_notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent resize-none"
                  placeholder="Internal notes..."
                />
              </div>

              {/* Save */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCampaign}
                  disabled={saving || !editCampaign.title || !editCampaign.goal_usd}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-light transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : editCampaign.id ? "Update Campaign" : "Create Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
