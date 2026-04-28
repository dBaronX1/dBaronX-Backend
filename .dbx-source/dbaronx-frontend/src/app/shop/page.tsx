"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OpenInBotButton from "@/components/OpenInBotButton";
import StarRating from "@/components/StarRating";
import ProductReviews from "@/components/ProductReviews";
import {
  getStoreProducts,
  createStoreCart,
  getStoreCart,
  addStoreCartItem,
  updateStoreCartItem,
  removeStoreCartItem,
  createStoreManualCheckout,
  submitPaymentProof,
  type StorefrontProduct,
  type StoreCart,
} from "@/lib/api";

type Product = StorefrontProduct & {
  price_dbx: number;
};

interface ProductRating {
  avgRating: number;
  totalReviews: number;
}

const MERCHANT_WALLET = "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";
const CART_STORAGE_KEY = "dbx_cart_id";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
] as const;

type PaymentMethod =
  | "solana_pay"
  | "wallet_connect"
  | "manual_proof"
  | "bank_transfer";

function getStoredCartId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CART_STORAGE_KEY);
}

function setStoredCartId(cartId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, cartId);
}

function clearStoredCartId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
}

function productToDisplayProduct(product: StorefrontProduct): Product {
  return {
    ...product,
    price_dbx: Math.round((product.price || 0) * 100),
  };
}

function getItemTitle(item: any) {
  return item?.title ?? item?.product_title ?? "Item";
}

function getItemThumbnail(item: any) {
  return (
    item?.thumbnail ??
    item?.variant?.product?.thumbnail ??
    "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=80"
  );
}

function getItemUnitPrice(item: any) {
  return Number(item?.unit_price ?? item?.unitPrice ?? 0);
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [backendCart, setBackendCart] = useState<StoreCart | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("manual_proof");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState("");
  const [txId, setTxId] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
  });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] =
    useState<(typeof SORT_OPTIONS)[number]["value"]>("newest");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [globalOpsPct, setGlobalOpsPct] = useState(0);
  const [productRatings, setProductRatings] = useState<
    Record<string, ProductRating>
  >({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
    fetchGlobalOpsPct();
    hydrateCart();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getStoreProducts({ limit: 100 });
      const liveProducts = response.products
        .filter((p) => p.is_active !== false)
        .map(productToDisplayProduct);

      setProducts(liveProducts);

      if (liveProducts.length > 0) {
        fetchProductRatings(liveProducts.map((p) => p.id));
      }
    } catch (error) {
      console.log("Products error:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductRatings = async (productIds: string[]) => {
    try {
      const results = await Promise.all(
        productIds.map((id) =>
          fetch(`/api/reviews?product_id=${id}`)
            .then((r) => r.json())
            .then((d) => ({
              id,
              avgRating: d.avgRating || 0,
              totalReviews: d.totalReviews || 0,
            }))
            .catch(() => ({ id, avgRating: 0, totalReviews: 0 }))
        )
      );
      const ratingsMap: Record<string, ProductRating> = {};
      results.forEach(({ id, avgRating, totalReviews }) => {
        ratingsMap[id] = { avgRating, totalReviews };
      });
      setProductRatings(ratingsMap);
    } catch (_) {}
  };

  const fetchGlobalOpsPct = async () => {
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("raised_usd, goal_usd")
        .eq("campaign_status", "active");

      if (data && data.length > 0) {
        const totalRaised = data.reduce((s, c) => s + (c.raised_usd || 0), 0);
        const totalGoal = data.reduce((s, c) => s + (c.goal_usd || 0), 0);
        setGlobalOpsPct(
          totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0
        );
      }
    } catch (_) {}
  };

  const hydrateCart = async () => {
    try {
      const cartId = getStoredCartId();
      if (!cartId) return;

      const response = await getStoreCart(cartId);
      setBackendCart(response.cart);
    } catch (error) {
      console.log("Hydrate cart error:", error);
      clearStoredCartId();
      setBackendCart(null);
    }
  };

  const ensureCart = async () => {
    let cartId = getStoredCartId();

    if (!cartId) {
      const created = await createStoreCart();
      cartId = created.cart.id;
      setStoredCartId(cartId);
      setBackendCart(created.cart);
      return { cartId, cart: created.cart };
    }

    if (!backendCart) {
      const existing = await getStoreCart(cartId);
      setBackendCart(existing.cart);
      return { cartId, cart: existing.cart };
    }

    return { cartId, cart: backendCart };
  };

  const addToCart = async (product: Product) => {
    try {
      if (!product.defaultVariantId) {
        alert("This product is not purchasable yet.");
        return;
      }

      const { cartId } = await ensureCart();

      const response = await addStoreCartItem(cartId, {
        variantId: product.defaultVariantId,
        quantity: 1,
      });

      setBackendCart(response.cart);
    } catch (error) {
      console.log("Add to cart error:", error);
      alert("Failed to add product to cart.");
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const cartId = getStoredCartId();
      if (!cartId) return;

      const response = await removeStoreCartItem(cartId, itemId);
      setBackendCart(response.cart);

      if (!response.cart.items.length) {
        clearStoredCartId();
      }
    } catch (error) {
      console.log("Remove from cart error:", error);
    }
  };

  const updateQty = async (itemId: string, qty: number) => {
    try {
      const cartId = getStoredCartId();
      if (!cartId) return;

      if (qty < 1) {
        await removeFromCart(itemId);
        return;
      }

      const response = await updateStoreCartItem(cartId, itemId, qty);
      setBackendCart(response.cart);
    } catch (error) {
      console.log("Update cart qty error:", error);
    }
  };

  const cartItems = backendCart?.items ?? [];
  const cartTotal = backendCart?.total ?? 0;
  const cartCount =
    backendCart?.item_count ??
    cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalDbx = cartItems.reduce(
    (sum, item: any) => sum + getItemUnitPrice(item) * item.quantity * 100,
    0
  );

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(MERCHANT_WALLET);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (_) {}
  };

  const sendTelegramNotification = async (
    orderId: string,
    total: number
  ) => {
    try {
      await fetch("/api/bot?action=menu");
      await fetch("/api/bot/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_notification",
          orderId,
          total,
          userEmail: user?.email,
        }),
      });
    } catch (_) {}
  };

  const handleCheckout = async () => {
    if (!cartItems.length || !backendCart) return;

    if (!shippingAddress.name || !shippingAddress.address || !shippingAddress.country) {
      alert("Please complete the shipping details.");
      return;
    }

    setOrderSubmitting(true);

    try {
      let proofUrl = "";

      if (
        proofFile &&
        (paymentMethod === "manual_proof" || paymentMethod === "bank_transfer") &&
        user
      ) {
        const fileName = `proofs/${user.id}/${Date.now()}_${proofFile.name}`;
        const { data: uploadData } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, proofFile);

        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("payment-proofs")
            .getPublicUrl(fileName);
          proofUrl = urlData?.publicUrl || "";
        }
      }

      const checkoutResponse = await createStoreManualCheckout({
        cartId: backendCart.id,
        customer_name: shippingAddress.name,
        customer_email: user?.email || undefined,
        customer_phone: undefined,
        country: shippingAddress.country,
        address_line_1: shippingAddress.address,
        city: shippingAddress.city || undefined,
        currency: backendCart.currency_code,
        source: paymentMethod,
      });

      const publicReference = checkoutResponse.order.public_reference;

      let provider = "manual_proof";
      if (paymentMethod === "solana_pay") provider = "solana_pay";
      if (paymentMethod === "wallet_connect") provider = "wallet_connect";
      if (paymentMethod === "bank_transfer") provider = "bank_transfer";

      const providerReference =
        paymentMethod === "solana_pay" || paymentMethod === "wallet_connect"
          ? txId.trim() || undefined
          : undefined;

      const payerName = shippingAddress.name || undefined;
      const payerEmail = user?.email || undefined;

      if (proofUrl || proofNotes.trim() || providerReference) {
        try {
          await submitPaymentProof({
            public_reference: publicReference,
            provider,
            provider_reference: providerReference,
            proof_url: proofUrl || undefined,
            payer_name: payerName,
            payer_email: payerEmail,
          });
        } catch (error) {
          console.log("submitPaymentProof error:", error);
        }
      }

      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "order_confirmation",
            orderId: publicReference,
            userEmail: user?.email,
            items: cartItems.map((i: any) => ({
              id: i.product_id || i.id,
              name: getItemTitle(i),
              price: getItemUnitPrice(i),
              price_dbx: getItemUnitPrice(i) * 100,
              quantity: i.quantity,
            })),
            total: cartTotal,
          },
        });
      } catch (error) {
        console.log("send-email error:", error);
      }

      await sendTelegramNotification(publicReference, cartTotal);

      setLastOrderId(publicReference);
      setOrderSuccess(true);
      setCheckoutOpen(false);
      setBackendCart(null);
      clearStoredCartId();
      setTxId("");
      setProofNotes("");
      setProofFile(null);
    } catch (error: any) {
      console.log("Checkout error:", error);
      alert(error?.message || "Failed to place order");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const categories = [
    "all",
    ...Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    ),
  ] as string[];

  const filteredAndSorted = products
    .filter((p) => filterCategory === "all" || p.category === filterCategory)
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "name") return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-10 sm:py-14">
            <span className="tag-badge-cyan mb-4 inline-block">
              Premium Global Store
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text-purple mb-4">
              dBaronX Shop
            </h1>
            <p className="text-fg-muted max-w-xl mx-auto text-sm sm:text-base mb-6">
              Curated products from verified global suppliers. Pay securely — we
              handle fulfillment and ship directly to your door.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
              <span className="tag-badge-green text-xs">✓ Verified Suppliers</span>
              <span className="tag-badge text-xs">✓ Secure Payments</span>
              <span className="tag-badge-cyan text-xs">✓ Global Shipping</span>
              <span className="tag-badge text-xs">✓ DBX Discounts</span>
            </div>
            <div className="flex justify-center">
              <OpenInBotButton
                page="shop"
                size="md"
                variant="outline"
                label="Browse in Telegram Bot"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-fg-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as (typeof SORT_OPTIONS)[number]["value"]
                )
              }
              className="bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-2.5 text-sm text-fg-base focus:outline-none focus:border-accent transition-all min-w-[160px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                  filterCategory === cat
                    ? "bg-primary text-white border border-primary"
                    : "border border-[rgba(94,23,235,0.3)] text-fg-muted hover:border-accent hover:text-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {globalOpsPct > 0 && (
            <div className="mb-6 bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.15)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#4ADE80] flex items-center gap-2">
                  <span>🌍</span> Every purchase funds global operations
                </span>
                <span className="text-xs font-bold text-[#4ADE80] font-mono">
                  {globalOpsPct}% funded
                </span>
              </div>
              <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4ADE80] to-accent rounded-full transition-all duration-700"
                  style={{ width: `${globalOpsPct}%` }}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-bg-card rounded-2xl h-80 animate-pulse border border-[rgba(94,23,235,0.1)]"
                />
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-white mb-2">
                No products found
              </h3>
              <p className="text-fg-muted text-sm mb-6">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different search.`
                  : "No products in this category yet. Check back soon!"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-accent hover:underline text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-fg-muted mb-4">
                {filteredAndSorted.length} product
                {filteredAndSorted.length !== 1 ? "s" : ""} found
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredAndSorted.map((product) => (
                  <div
                    key={product.id}
                    className="card-hover-glow bg-bg-card rounded-2xl overflow-hidden flex flex-col group"
                  >
                    <div className="relative h-52 overflow-hidden bg-bg-base">
                      <img
                        src={
                          product.thumbnail ||
                          "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400"
                        }
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-xs font-bold text-white bg-red-500/80 px-3 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="tag-badge-green text-[10px]">
                          DBX Discount
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <OpenInBotButton
                          page="shop"
                          productId={product.id}
                          size="sm"
                          variant="minimal"
                          label="Bot"
                        />
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <span className="text-[10px] text-fg-muted capitalize mb-1 font-mono uppercase tracking-wider">
                        {product.category}
                      </span>

                      <h3 className="font-semibold text-fg-base mb-2 text-sm leading-tight">
                        {product.title}
                      </h3>

                      {productRatings[product.id] && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <StarRating
                            rating={productRatings[product.id].avgRating}
                            size="sm"
                          />
                          <span className="text-xs text-fg-muted">
                            {productRatings[product.id].avgRating > 0
                              ? `${productRatings[product.id].avgRating.toFixed(1)} (${productRatings[product.id].totalReviews})`
                              : "No reviews yet"}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-fg-muted mb-4 flex-1 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>

                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <div className="text-lg font-bold text-fg-base">
                            ${product.price}
                          </div>
                          <div className="text-xs text-accent font-mono">
                            {product.price_dbx} DBX
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            product.stock > 0
                              ? "text-[#4ADE80] bg-[rgba(34,197,94,0.1)]"
                              : "text-red-400 bg-red-400/10"
                          }`}
                        >
                          {product.stock > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                          className="flex-1 bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="px-3 py-2.5 rounded-xl border border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent hover:border-accent/50 text-xs transition-all"
                          title="View details & reviews"
                        >
                          ⭐
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {cartItems.length > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="fixed bottom-6 right-4 sm:right-6 btn-glow-cyan bg-accent text-bg-base font-bold px-4 sm:px-6 py-3 rounded-full shadow-lg z-40 flex items-center gap-2 text-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="hidden sm:inline">
                Cart ({cartCount}) · ${cartTotal.toFixed(2)}
              </span>
              <span className="sm:hidden">
                {cartCount} · ${cartTotal.toFixed(2)}
              </span>
            </button>
          )}
        </div>
      </main>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="w-full sm:max-w-md bg-bg-card border-l border-[rgba(94,23,235,0.3)] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-[rgba(94,23,235,0.2)] flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-fg-base">
                Your Cart ({cartCount})
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                className="text-fg-muted hover:text-accent p-1.5 rounded-lg hover:bg-accent/10 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {cartItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-bg-base rounded-xl p-3"
                >
                  <img
                    src={getItemThumbnail(item)}
                    alt={getItemTitle(item)}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-base truncate">
                      {getItemTitle(item)}
                    </p>
                    <p className="text-xs text-fg-muted">
                      ${getItemUnitPrice(item)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-bg-card border border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent text-xs flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium text-fg-base w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-bg-card border border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-fg-muted hover:text-red-400 text-xs ml-1 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-6 border-t border-[rgba(94,23,235,0.2)]">
              <div className="flex justify-between mb-2">
                <span className="text-fg-muted text-sm">Total</span>
                <span className="font-bold text-[#4ADE80]">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mb-4">
                <span className="text-fg-muted text-xs">DBX Equivalent</span>
                <span className="font-mono text-accent text-xs">
                  {cartTotalDbx.toFixed(0)} DBX
                </span>
              </div>
              <button
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
                className="w-full btn-glow-purple bg-primary text-white font-bold py-3 rounded-xl transition-all"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg bg-bg-card sm:rounded-2xl rounded-t-2xl border border-[rgba(94,23,235,0.3)] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-[rgba(94,23,235,0.2)] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-fg-base">Checkout</h2>
                <p className="text-xs text-fg-muted mt-0.5">
                  Total:{" "}
                  <span className="text-eco-green font-bold">
                    ${cartTotal.toFixed(2)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="text-fg-muted hover:text-accent p-1.5 rounded-lg hover:bg-accent/10 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-4 sm:p-6 space-y-5">
                {globalOpsPct > 0 && (
                  <div className="bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.15)] rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl">🌍</span>
                    <div>
                      <p className="text-sm font-bold text-[#4ADE80]">
                        Every purchase funds global operations
                      </p>
                      <p className="text-xs text-fg-muted">
                        {globalOpsPct}% of current campaign funded
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-fg-base mb-3">
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        value: "solana_pay",
                        label: "Solana Pay",
                        icon: "◎",
                        desc: "DBX / SOL instant",
                      },
                      {
                        value: "wallet_connect",
                        label: "Crypto Wallet",
                        icon: "🔐",
                        desc: "Connect wallet",
                      },
                      {
                        value: "bank_transfer",
                        label: "Bank Transfer",
                        icon: "🏦",
                        desc: "Worldwide transfer",
                      },
                      {
                        value: "manual_proof",
                        label: "Manual Proof",
                        icon: "📄",
                        desc: "Upload receipt",
                      },
                    ].map((m) => (
                      <button
                        key={m.value}
                        onClick={() => {
                          setPaymentMethod(m.value as PaymentMethod);
                          setTxId("");
                          setProofNotes("");
                        }}
                        className={`p-3 rounded-xl border text-xs font-medium transition-all text-center ${
                          paymentMethod === m.value
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-[rgba(94,23,235,0.3)] text-fg-muted hover:border-accent/50"
                        }`}
                      >
                        <div className="text-xl mb-1">{m.icon}</div>
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-[10px] opacity-70 mt-1">
                          {m.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === "solana_pay" ||
                  paymentMethod === "wallet_connect") && (
                  <div className="bg-bg-base rounded-xl border border-accent/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-accent">
                      ◎ Crypto Payment — Send to merchant wallet:
                    </p>
                    <div className="flex items-center gap-2 bg-bg-card rounded-lg p-2.5">
                      <code className="text-xs text-accent font-mono flex-1 break-all">
                        {MERCHANT_WALLET}
                      </code>
                      <button
                        onClick={copyAddress}
                        className={`flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          copiedAddress
                            ? "border-eco-green/40 text-eco-green"
                            : "border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent"
                        }`}
                      >
                        {copiedAddress ? "✓" : "Copy"}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-fg-muted mb-1.5">
                        Transaction ID (paste after sending)
                      </label>
                      <input
                        type="text"
                        value={txId}
                        onChange={(e) => setTxId(e.target.value)}
                        placeholder="Transaction signature or hash..."
                        className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-xs text-fg-base focus:outline-none focus:border-accent font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-fg-muted">
                      Amount:{" "}
                      <span className="text-accent font-bold">
                        ${cartTotal.toFixed(2)}
                      </span>{" "}
                      equivalent
                    </p>
                  </div>
                )}

                {paymentMethod === "bank_transfer" && (
                  <div className="bg-bg-base rounded-xl border border-[rgba(94,23,235,0.2)] p-4 space-y-3">
                    <p className="text-sm font-bold text-white">
                      🏦 Bank Transfer
                    </p>
                    <p className="text-xs text-fg-muted leading-relaxed">
                      Bank transfers accepted worldwide. Upload your bank receipt
                      with matching account holder details.
                    </p>
                    <p className="text-xs text-fg-muted">
                      Contact{" "}
                      <a
                        href="mailto:info@dbaronx.com"
                        className="text-accent hover:underline"
                      >
                        info@dbaronx.com
                      </a>{" "}
                      for bank details.
                    </p>
                    <div>
                      <label className="block text-xs text-fg-muted mb-1.5">
                        Upload Bank Receipt
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-fg-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-primary/20 file:text-primary"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === "manual_proof" && (
                  <div className="bg-bg-base rounded-xl border border-[rgba(94,23,235,0.2)] p-4 space-y-3">
                    <p className="text-xs font-semibold text-fg-base">
                      📄 Upload Payment Proof
                    </p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-fg-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-primary/20 file:text-primary"
                    />
                    <input
                      type="text"
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      placeholder="Payment reference, notes..."
                      className="w-full bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-xs text-fg-base focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-fg-base mb-3">
                    Shipping Address
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: "name", placeholder: "Full name" },
                      {
                        key: "address",
                        placeholder:
                          "Street address or post office / parcel locker",
                      },
                      { key: "city", placeholder: "City" },
                      { key: "country", placeholder: "Country" },
                    ].map((field) => (
                      <input
                        key={field.key}
                        type="text"
                        placeholder={field.placeholder}
                        value={(shippingAddress as any)[field.key]}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2.5 text-sm text-fg-base focus:outline-none focus:border-accent"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-fg-muted mt-2">
                    💡 Anonymous shipping: use a post office or parcel locker
                    address — no home address required.
                  </p>
                </div>

                <div className="bg-bg-base rounded-xl p-4 border border-[rgba(94,23,235,0.15)]">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-fg-muted">Items ({cartCount})</span>
                    <span className="text-fg-base">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-fg-muted">DBX Equivalent</span>
                    <span className="text-accent font-mono">
                      {cartTotalDbx.toFixed(0)} DBX
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-[rgba(94,23,235,0.15)] pt-2 mt-2">
                    <span className="text-white">Total</span>
                    <span className="text-[#4ADE80]">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-[rgba(94,23,235,0.2)] flex-shrink-0">
              <button
                onClick={handleCheckout}
                disabled={orderSubmitting}
                className="w-full btn-glow-purple bg-primary text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {orderSubmitting ? "Placing Order..." : "Place Order"}
              </button>
              <p className="text-xs text-fg-muted text-center mt-2">
                Admin verifies payment → supplier ships to your address
              </p>
            </div>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card rounded-2xl border border-eco-green/30 p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-eco-green mb-2">
              Order Placed!
            </h2>
            <p className="text-fg-muted text-sm mb-2">
              Your order has been submitted successfully.
            </p>
            <p className="text-fg-muted text-xs mb-4">
              Admin will verify your payment and fulfill your order. You&apos;ll
              receive an email confirmation.
            </p>
            {lastOrderId && (
              <div className="mb-4 p-3 bg-[rgba(0,240,255,0.05)] border border-[rgba(0,240,255,0.15)] rounded-xl">
                <p className="text-xs text-fg-muted mb-2">
                  Track your order in Telegram:
                </p>
                <OpenInBotButton
                  page="track"
                  orderId={lastOrderId}
                  size="sm"
                  variant="outline"
                  label="Track in Bot"
                />
              </div>
            )}
            <button
              onClick={() => setOrderSuccess(false)}
              className="w-full bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl bg-bg-card sm:rounded-2xl rounded-t-2xl border border-[rgba(94,23,235,0.3)] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
            <div className="p-4 sm:p-5 border-b border-[rgba(94,23,235,0.2)] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    selectedProduct.thumbnail ||
                    "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=80"
                  }
                  alt={selectedProduct.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="font-bold text-fg-base text-sm truncate">
                    {selectedProduct.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {productRatings[selectedProduct.id] &&
                    productRatings[selectedProduct.id].avgRating > 0 ? (
                      <>
                        <StarRating
                          rating={productRatings[selectedProduct.id].avgRating}
                          size="sm"
                        />
                        <span className="text-xs text-fg-muted">
                          {productRatings[selectedProduct.id].avgRating.toFixed(1)} ·{" "}
                          {productRatings[selectedProduct.id].totalReviews} review
                          {productRatings[selectedProduct.id].totalReviews !== 1
                            ? "s"
                            : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-fg-muted">
                        No reviews yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock === 0}
                  className="text-xs bg-primary text-white font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-fg-muted hover:text-accent p-1.5 rounded-lg hover:bg-accent/10 transition-all"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <ProductReviews
                productId={selectedProduct.id}
                productName={selectedProduct.title}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}