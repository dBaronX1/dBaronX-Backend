"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

import ReviewCard from "@/components/ReviewCard";

type AdminTab = "orders" | "products" | "campaigns" | "payouts" | "reviews";

interface Order {
  id: string;
  user_id: string;
  items: any[];
  total_usd: number;
  payment_method: string;
  payment_status: string;
  proof_url: string;
  proof_notes: string;
  shipping_address: any;
  admin_notes: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  price_dbx: number;
  category: string;
  stock: number;
  is_active: boolean;
  image_url: string;
  description: string;
  supplier_info: string;
}

interface Campaign {
  id: string;
  title: string;
  goal_usd: number;
  raised_usd: number;
  campaign_status: string;
  creator_id: string;
  created_at: string;
}

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  wallet_address: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
  user_profiles?: { full_name: string } | null;
  products?: { name: string } | null;
}

const PRODUCT_CATEGORIES = ["general", "health", "merch", "business", "eco", "food", "digital", "supplements"];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [savingProduct, setSavingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [imagePreviewError, setImagePreviewError] = useState(false);
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
      const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
      if (profile?.role === "admin") {
        setIsAdmin(true);
        fetchAllData();
      } else {
        router.push("/home");
      }
    } finally {
      setCheckingAdmin(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, campaignsRes, payoutsRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("payout_requests").select("*").order("created_at", { ascending: false }),
        supabase
          .from("product_reviews")
          .select(`id, product_id, user_id, rating, review_text, is_verified_purchase, is_approved, helpful_count, created_at, user_profiles!product_reviews_user_id_fkey(full_name), products!product_reviews_product_id_fkey(name)`)
          .order("created_at", { ascending: false }),
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      setCampaigns(campaignsRes.data || []);
      setPayouts(payoutsRes.data || []);
      setReviews((reviewsRes.data || []) as ProductReview[]);
    } finally {
      setLoading(false);
    }
  };

  const approveReview = async (reviewId: string) => {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: true, updated_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (error) { console.log("Approve review error:", error.message); return; }
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, is_approved: true } : r));
  };

  const rejectReview = async (reviewId: string) => {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: false, updated_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (error) { console.log("Reject review error:", error.message); return; }
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, is_approved: false } : r));
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm("Permanently delete this review?")) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId);
    if (error) { console.log("Delete review error:", error.message); return; }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: status, admin_notes: notes || "", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) { console.log("Update order error:", error.message); return; }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, payment_status: status } : o));
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    const { error } = await supabase.from("campaigns").update({ campaign_status: status }).eq("id", campaignId);
    if (error) { console.log("Update campaign error:", error.message); return; }
    setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, campaign_status: status } : c));
  };

  const updatePayoutStatus = async (payoutId: string, status: string) => {
    const { error } = await supabase.from("payout_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", payoutId);
    if (error) { console.log("Update payout error:", error.message); return; }
    setPayouts((prev) => prev.map((p) => p.id === payoutId ? { ...p, status } : p));
  };

  const openNewProduct = () => {
    setEditProduct({ is_active: true, stock: 100, category: "general" });
    setImagePreviewError(false);
    setProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditProduct({ ...product });
    setImagePreviewError(false);
    setProductModal(true);
  };

  const duplicateProduct = (product: Product) => {
    const { id, ...rest } = product;
    setEditProduct({ ...rest, name: `${rest.name} (Copy)`, is_active: false });
    setImagePreviewError(false);
    setProductModal(true);
  };

  const saveProduct = async () => {
    setSavingProduct(true);
    try {
      if (editProduct.id) {
        const { error } = await supabase.from("products").update({ ...editProduct, updated_at: new Date().toISOString() }).eq("id", editProduct.id);
        if (error) { console.log("Update product error:", error.message); return; }
      } else {
        const { error } = await supabase.from("products").insert({ ...editProduct, created_by: user?.id });
        if (error) { console.log("Create product error:", error.message); return; }
      }
      setProductModal(false);
      setEditProduct({});
      fetchAllData();
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Deactivate this product? It will be hidden from the shop.")) return;
    await supabase.from("products").update({ is_active: false }).eq("id", id);
    fetchAllData();
  };

  const reactivateProduct = async (id: string) => {
    await supabase.from("products").update({ is_active: true }).eq("id", id);
    fetchAllData();
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-400/20 text-yellow-400",
      proof_uploaded: "bg-blue-400/20 text-blue-400",
      approved: "bg-accent/20 text-accent",
      fulfilled: "bg-eco-green/20 text-eco-green",
      cancelled: "bg-red-400/20 text-red-400",
      active: "bg-eco-green/20 text-eco-green",
      paid: "bg-eco-green/20 text-eco-green",
      rejected: "bg-red-400/20 text-red-400",
      funded: "bg-accent/20 text-accent",
    };
    return map[status] || "bg-primary/20 text-primary-light";
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.description?.toLowerCase().includes(productSearch.toLowerCase());
    const matchFilter = productFilter === "all" || (productFilter === "active" ? p.is_active : !p.is_active) || p.category === productFilter;
    return matchSearch && matchFilter;
  });

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-fg-muted">Checking permissions...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: "orders", label: "Orders", count: orders.filter((o) => o.payment_status === "proof_uploaded").length },
    { key: "products", label: "Products", count: products.length },
    { key: "campaigns", label: "Campaigns", count: campaigns.filter((c) => c.campaign_status === "pending").length },
    { key: "payouts", label: "Payouts", count: payouts.filter((p) => p.status === "pending").length },
    { key: "reviews", label: "Reviews", count: reviews.filter((r) => !r.is_approved).length },
  ];

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="py-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text-purple mb-1">Admin Panel</h1>
            <p className="text-fg-muted text-sm">Manage orders, products, campaigns, and payouts</p>
          </div>

          {/* Tabs — scrollable on mobile */}
          <div className="overflow-x-auto pb-1 mb-6 sm:mb-8">
            <div className="flex gap-2 border-b border-[rgba(94,23,235,0.2)] pb-4 min-w-max sm:min-w-0 sm:flex-wrap">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    tab === t.key
                      ? "bg-primary text-white" :"text-fg-muted hover:text-accent border border-[rgba(94,23,235,0.2)] hover:border-accent/40"
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      tab === t.key ? "bg-white/20" : "bg-red-400/20 text-red-400"
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-bg-card rounded-xl h-16 animate-pulse border border-[rgba(94,23,235,0.1)]" />)}
            </div>
          ) : (
            <>
              {/* ORDERS TAB */}
              {tab === "orders" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-fg-base">All Orders ({orders.length})</h2>
                    <span className="text-xs text-fg-muted">{orders.filter((o) => o.payment_status === "proof_uploaded").length} awaiting approval</span>
                  </div>
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-fg-muted">No orders yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div key={order.id} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-xs font-mono text-fg-muted">#{order.id.slice(0, 8)}</p>
                              <p className="font-bold text-fg-base">${order.total_usd?.toFixed(2)}</p>
                              <p className="text-xs text-fg-muted">{order.payment_method?.replace(/_/g, " ")} · {new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full ${statusColor(order.payment_status)}`}>
                              {order.payment_status?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="text-xs text-fg-muted mb-3">
                            {order.items?.map((item: any, i: number) => (
                              <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ", " : ""}</span>
                            ))}
                          </div>
                          {order.proof_url && (
                            <div className="mb-3">
                              <a href={order.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                                📎 View Payment Proof ↗
                              </a>
                              {order.proof_notes && <p className="text-xs text-fg-muted mt-1">Notes: {order.proof_notes}</p>}
                            </div>
                          )}
                          {order.shipping_address?.name && (
                            <p className="text-xs text-fg-muted mb-3">
                              📦 {order.shipping_address.name}, {order.shipping_address.address}, {order.shipping_address.city}, {order.shipping_address.country}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {order.payment_status === "proof_uploaded" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "approved")}
                                className="text-xs bg-eco-green/20 border border-eco-green/30 text-eco-green px-3 py-1.5 rounded-full hover:bg-eco-green/30 transition-all"
                              >
                                ✓ Approve Payment
                              </button>
                            )}
                            {order.payment_status === "approved" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "fulfilled")}
                                className="text-xs bg-accent/20 border border-accent/30 text-accent px-3 py-1.5 rounded-full hover:bg-accent/30 transition-all"
                              >
                                📦 Mark Fulfilled
                              </button>
                            )}
                            {!["cancelled", "fulfilled"].includes(order.payment_status) && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "cancelled")}
                                className="text-xs bg-red-400/10 border border-red-400/20 text-red-400 px-3 py-1.5 rounded-full hover:bg-red-400/20 transition-all"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PRODUCTS TAB */}
              {tab === "products" && (
                <div>
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex-1 flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="flex-1 bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-2.5 text-sm text-fg-base focus:outline-none focus:border-accent placeholder-fg-muted"
                      />
                      <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-2.5 text-sm text-fg-base focus:outline-none focus:border-accent"
                      >
                        <option value="all">All ({products.length})</option>
                        <option value="active">Active ({products.filter(p => p.is_active).length})</option>
                        <option value="inactive">Inactive ({products.filter(p => !p.is_active).length})</option>
                        {PRODUCT_CATEGORIES.map(c => (
                          <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={openNewProduct}
                      className="btn-glow-purple bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Product
                    </button>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-fg-muted">
                      {productSearch ? `No products matching "${productSearch}"` : "No products yet."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredProducts.map((product) => (
                        <div key={product.id} className={`bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] overflow-hidden flex flex-col transition-all ${!product.is_active ? "opacity-60" : "hover:border-accent/40"}`}>
                          {/* Image */}
                          <div className="relative h-36 overflow-hidden bg-bg-base">
                            <img
                              src={product.image_url || "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400"}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 flex gap-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.is_active ? "bg-eco-green/80 text-white" : "bg-red-400/80 text-white"}`}>
                                {product.is_active ? "Active" : "Inactive"}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-base/80 text-fg-muted capitalize">{product.category}</span>
                            </div>
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-semibold text-fg-base text-sm mb-1 line-clamp-1">{product.name}</h3>
                            <p className="text-xs text-fg-muted mb-2 line-clamp-2 flex-1">{product.description || "No description"}</p>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="text-eco-green font-bold text-sm">${product.price}</span>
                                <span className="text-xs text-accent ml-2 font-mono">{product.price_dbx} DBX</span>
                              </div>
                              <span className="text-xs text-fg-muted">Stock: <span className={product.stock < 10 ? "text-yellow-400" : "text-fg-base"}>{product.stock}</span></span>
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => openEditProduct(product)}
                                className="flex-1 text-xs bg-primary/20 border border-primary/30 text-primary px-2 py-1.5 rounded-lg hover:bg-primary/30 transition-all font-medium"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => duplicateProduct(product)}
                                className="text-xs bg-accent/10 border border-accent/20 text-accent px-2 py-1.5 rounded-lg hover:bg-accent/20 transition-all"
                                title="Duplicate product"
                              >
                                ⧉
                              </button>
                              {product.is_active ? (
                                <button
                                  onClick={() => deleteProduct(product.id)}
                                  className="text-xs bg-red-400/10 border border-red-400/20 text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-400/20 transition-all"
                                >
                                  ✕
                                </button>
                              ) : (
                                <button
                                  onClick={() => reactivateProduct(product.id)}
                                  className="text-xs bg-eco-green/10 border border-eco-green/20 text-eco-green px-2 py-1.5 rounded-lg hover:bg-eco-green/20 transition-all"
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CAMPAIGNS TAB */}
              {tab === "campaigns" && (
                <div>
                  <h2 className="text-lg font-bold text-fg-base mb-6">Campaigns ({campaigns.length})</h2>
                  <div className="space-y-3">
                    {campaigns.length === 0 ? (
                      <div className="text-center py-12 text-fg-muted">No campaigns yet.</div>
                    ) : campaigns.map((campaign) => (
                      <div key={campaign.id} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-bold text-fg-base">{campaign.title}</h3>
                            <p className="text-xs text-fg-muted">Goal: ${campaign.goal_usd?.toLocaleString()} · Raised: ${campaign.raised_usd?.toLocaleString()}</p>
                            <p className="text-xs text-fg-muted">{new Date(campaign.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full ${statusColor(campaign.campaign_status)}`}>
                            {campaign.campaign_status}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                              style={{ width: `${Math.min(100, ((campaign.raised_usd || 0) / (campaign.goal_usd || 1)) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-fg-muted mt-1">{Math.round(((campaign.raised_usd || 0) / (campaign.goal_usd || 1)) * 100)}% funded</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {campaign.campaign_status === "pending" && (
                            <button
                              onClick={() => updateCampaignStatus(campaign.id, "active")}
                              className="text-xs bg-eco-green/20 border border-eco-green/30 text-eco-green px-3 py-1.5 rounded-full hover:bg-eco-green/30 transition-all"
                            >
                              ✓ Approve & Activate
                            </button>
                          )}
                          {campaign.campaign_status === "active" && (
                            <button
                              onClick={() => updateCampaignStatus(campaign.id, "funded")}
                              className="text-xs bg-accent/20 border border-accent/30 text-accent px-3 py-1.5 rounded-full hover:bg-accent/30 transition-all"
                            >
                              Mark as Funded
                            </button>
                          )}
                          {!["cancelled", "funded"].includes(campaign.campaign_status) && (
                            <button
                              onClick={() => updateCampaignStatus(campaign.id, "cancelled")}
                              className="text-xs bg-red-400/10 border border-red-400/20 text-red-400 px-3 py-1.5 rounded-full hover:bg-red-400/20 transition-all"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAYOUTS TAB */}
              {tab === "payouts" && (
                <div>
                  <h2 className="text-lg font-bold text-fg-base mb-6">Payout Requests ({payouts.length})</h2>
                  <div className="space-y-3">
                    {payouts.length === 0 ? (
                      <div className="text-center py-12 text-fg-muted">No payout requests yet.</div>
                    ) : payouts.map((payout) => (
                      <div key={payout.id} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-bold text-fg-base">${payout.amount?.toFixed(2)}</p>
                            <p className="text-xs font-mono text-accent break-all">{payout.wallet_address}</p>
                            <p className="text-xs text-fg-muted">{payout.payment_method} · {new Date(payout.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full ${statusColor(payout.status)}`}>
                            {payout.status}
                          </span>
                        </div>
                        {payout.status === "pending" && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updatePayoutStatus(payout.id, "approved")}
                              className="text-xs bg-eco-green/20 border border-eco-green/30 text-eco-green px-3 py-1.5 rounded-full hover:bg-eco-green/30 transition-all"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => updatePayoutStatus(payout.id, "paid")}
                              className="text-xs bg-accent/20 border border-accent/30 text-accent px-3 py-1.5 rounded-full hover:bg-accent/30 transition-all"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => updatePayoutStatus(payout.id, "rejected")}
                              className="text-xs bg-red-400/10 border border-red-400/20 text-red-400 px-3 py-1.5 rounded-full hover:bg-red-400/20 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* REVIEWS TAB */}
              {tab === "reviews" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-fg-base">Product Reviews ({reviews.length})</h2>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 px-3 py-1 rounded-full">
                        {reviews.filter((r) => !r.is_approved).length} pending
                      </span>
                      <span className="bg-eco-green/15 text-eco-green border border-eco-green/25 px-3 py-1 rounded-full">
                        {reviews.filter((r) => r.is_approved).length} approved
                      </span>
                    </div>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="text-center py-12 text-fg-muted">No reviews yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {/* Pending first */}
                      {reviews.filter((r) => !r.is_approved).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                            <span>⏳</span> Pending Approval ({reviews.filter((r) => !r.is_approved).length})
                          </h3>
                          <div className="space-y-3">
                            {reviews.filter((r) => !r.is_approved).map((review) => (
                              <div key={review.id}>
                                {(review.products as any)?.name && (
                                  <p className="text-xs text-fg-muted mb-1 ml-1">
                                    Product: <span className="text-accent font-medium">{(review.products as any).name}</span>
                                  </p>
                                )}
                                <ReviewCard
                                  review={review}
                                  isPending={true}
                                  showAdminActions={true}
                                  onApprove={approveReview}
                                  onReject={rejectReview}
                                  onDelete={deleteReview}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Approved */}
                      {reviews.filter((r) => r.is_approved).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-eco-green mb-3 flex items-center gap-2">
                            <span>✅</span> Approved ({reviews.filter((r) => r.is_approved).length})
                          </h3>
                          <div className="space-y-3">
                            {reviews.filter((r) => r.is_approved).map((review) => (
                              <div key={review.id}>
                                {(review.products as any)?.name && (
                                  <p className="text-xs text-fg-muted mb-1 ml-1">
                                    Product: <span className="text-accent font-medium">{(review.products as any).name}</span>
                                  </p>
                                )}
                                <ReviewCard
                                  review={review}
                                  isPending={false}
                                  showAdminActions={true}
                                  onReject={rejectReview}
                                  onDelete={deleteReview}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Enhanced Product Modal */}
      {productModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl bg-bg-card sm:rounded-2xl rounded-t-2xl border border-[rgba(94,23,235,0.3)] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[rgba(94,23,235,0.2)] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-fg-base">{editProduct.id ? "Edit Product" : "Add New Product"}</h2>
                <p className="text-xs text-fg-muted mt-0.5">{editProduct.id ? `ID: ${editProduct.id.slice(0, 8)}` : "Fill in product details below"}</p>
              </div>
              <button
                onClick={() => { setProductModal(false); setEditProduct({}); }}
                className="text-fg-muted hover:text-accent p-1.5 rounded-lg hover:bg-accent/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1">
              <div className="p-4 sm:p-6 space-y-5">
                {/* Image Preview + URL */}
                <div>
                  <label className="block text-sm font-semibold text-fg-base mb-2">Product Image</label>
                  <div className="flex gap-3 items-start">
                    <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-bg-base border border-[rgba(94,23,235,0.3)] flex items-center justify-center">
                      {editProduct.image_url && !imagePreviewError ? (
                        <img
                          src={editProduct.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={() => setImagePreviewError(true)}
                        />
                      ) : (
                        <span className="text-2xl">🖼️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editProduct.image_url || ""}
                        onChange={(e) => { setEditProduct((prev) => ({ ...prev, image_url: e.target.value })); setImagePreviewError(false); }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                      />
                      <p className="text-xs text-fg-muted mt-1.5">Paste any image URL. Preview updates automatically.</p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-fg-base mb-2">Product Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editProduct.name || ""}
                    onChange={(e) => setEditProduct((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Organic Eco Soap Bar"
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-fg-base mb-2">Description</label>
                  <textarea
                    value={editProduct.description || ""}
                    onChange={(e) => setEditProduct((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the product, its benefits, ingredients..."
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent resize-none h-24"
                  />
                </div>

                {/* Pricing Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-fg-base mb-2">Price (USD) <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editProduct.price || ""}
                        onChange={(e) => setEditProduct((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder="12.99"
                        className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl pl-7 pr-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fg-base mb-2">Price (DBX)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent text-xs font-mono">◎</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editProduct.price_dbx || ""}
                        onChange={(e) => setEditProduct((prev) => ({ ...prev, price_dbx: parseFloat(e.target.value) || 0 }))}
                        placeholder="45.00"
                        className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl pl-7 pr-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* Category + Stock Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-fg-base mb-2">Category</label>
                    <select
                      value={editProduct.category || "general"}
                      onChange={(e) => setEditProduct((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-bg-base capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fg-base mb-2">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={editProduct.stock ?? ""}
                      onChange={(e) => setEditProduct((prev) => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                      placeholder="100"
                      className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Supplier Info */}
                <div>
                  <label className="block text-sm font-semibold text-fg-base mb-2">Supplier Info</label>
                  <input
                    type="text"
                    value={editProduct.supplier_info || ""}
                    onChange={(e) => setEditProduct((prev) => ({ ...prev, supplier_info: e.target.value }))}
                    placeholder="Supplier name, contact, or dropship link"
                    className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 bg-bg-base rounded-xl border border-[rgba(94,23,235,0.2)]">
                  <div>
                    <p className="text-sm font-semibold text-fg-base">Product Active</p>
                    <p className="text-xs text-fg-muted">Visible in the shop when active</p>
                  </div>
                  <div
                    onClick={() => setEditProduct((prev) => ({ ...prev, is_active: !prev.is_active }))}
                    className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${editProduct.is_active ? "bg-eco-green" : "bg-[rgba(94,23,235,0.2)]"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editProduct.is_active ? "left-6" : "left-0.5"}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-[rgba(94,23,235,0.2)] flex gap-3 flex-shrink-0">
              <button
                onClick={() => { setProductModal(false); setEditProduct({}); }}
                className="flex-1 border border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent hover:border-accent/40 font-medium py-3 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                disabled={savingProduct || !editProduct.name || !editProduct.price}
                className="flex-1 btn-glow-purple bg-primary text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {savingProduct ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : editProduct.id ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
