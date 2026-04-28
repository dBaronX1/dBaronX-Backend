"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProducts, type Product } from "@/lib/api";

const CATEGORIES = ["All", "Electronics", "Fashion", "Home & Living", "Beauty", "Sports", "Automotive", "Agriculture", "Tech", "Finance"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "name", label: "Name A–Z" },
];

function ProductCard({ product }: { product: Product }) {
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;

  return (
    <Link href={`/products/${product.handle}`} className="group block">
      <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl overflow-hidden transition-all duration-300 hover:border-[rgba(94,23,235,0.5)] hover:shadow-[0_0_30px_rgba(94,23,235,0.15)] hover:-translate-y-1">
        <div className="relative aspect-square bg-[#0A0A1F] overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-[rgba(94,23,235,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {discount && (
            <span className="absolute top-3 left-3 bg-[#22C55E] text-white text-xs font-bold px-2 py-1 rounded-full">
              -{discount}%
            </span>
          )}
          {product.stock !== undefined && product.stock === 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-sm">Out of Stock</span>
            </div>
          )}
        </div>
        <div className="p-4">
          {product.category && (
            <span className="text-[10px] font-mono text-[#C084FC] uppercase tracking-wider">{product.category}</span>
          )}
          <h3 className="text-sm font-semibold text-white mt-1 line-clamp-2 leading-snug">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-[#9090BB] mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-white">
                ${product.price?.toFixed(2)}
              </span>
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-xs text-[#9090BB] line-through">${product.compare_price?.toFixed(2)}</span>
              )}
            </div>
            <span className="text-xs font-semibold text-[#00F0FF] bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] px-3 py-1 rounded-full group-hover:bg-[rgba(0,240,255,0.15)] transition-colors">
              View →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.1)] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#0A0A1F]" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-[rgba(94,23,235,0.15)] rounded w-1/3" />
        <div className="h-4 bg-[rgba(94,23,235,0.15)] rounded w-3/4" />
        <div className="h-3 bg-[rgba(94,23,235,0.1)] rounded w-full" />
        <div className="flex justify-between mt-3">
          <div className="h-5 bg-[rgba(94,23,235,0.15)] rounded w-1/4" />
          <div className="h-6 bg-[rgba(94,23,235,0.1)] rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getProducts({
        category: category !== "All" ? category : undefined,
        search: search || undefined,
      });
      setProducts(res.products || []);
    } catch {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const sorted = [...products].sort((a, b) => {
    if (sort === "price_asc") return (a.price || 0) - (b.price || 0);
    if (sort === "price_desc") return (b.price || 0) - (a.price || 0);
    if (sort === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        {/* Page Header */}
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="mb-2">
            <span className="tag-badge">dBaronX Shop</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-3 mb-2">
            Shop <span className="gradient-text-purple">Premium Products</span>
          </h1>
          <p className="text-[#9090BB] text-sm max-w-xl">
            Curated global products. You pay — we confirm — supplier ships directly to your door.
          </p>
        </div>

        {/* Trust Strip */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="flex flex-wrap gap-3">
            {[
              { icon: "🔒", text: "Secure Payments" },
              { icon: "✅", text: "Verified Suppliers" },
              { icon: "📦", text: "Direct Shipping" },
              { icon: "💎", text: "DBX Discounts" },
            ].map((t) => (
              <span key={t.text} className="inline-flex items-center gap-1.5 text-xs text-[#9090BB] bg-[rgba(94,23,235,0.06)] border border-[rgba(94,23,235,0.15)] px-3 py-1.5 rounded-full">
                {t.icon} {t.text}
              </span>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9090BB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0D0D2B] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
              />
            </div>
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors min-w-[180px]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-xs font-medium px-4 py-2 rounded-full border transition-all duration-200 ${
                  category === cat
                    ? "bg-[rgba(94,23,235,0.3)] border-[rgba(94,23,235,0.6)] text-[#C084FC]"
                    : "bg-transparent border-[rgba(94,23,235,0.2)] text-[#9090BB] hover:border-[rgba(94,23,235,0.4)] hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-[#9090BB] mb-4">{error}</p>
              <button
                onClick={fetchProducts}
                className="bg-[rgba(94,23,235,0.2)] border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-6 py-2 rounded-full text-sm hover:bg-[rgba(94,23,235,0.3)] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🛍️</div>
              <h3 className="text-white font-semibold text-lg mb-2">No products found</h3>
              <p className="text-[#9090BB] text-sm mb-6">
                {search ? `No results for "${search}"` : "No products in this category yet."}
              </p>
              <button
                onClick={() => { setSearch(""); setCategory("All"); }}
                className="bg-[rgba(94,23,235,0.2)] border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-6 py-2 rounded-full text-sm hover:bg-[rgba(94,23,235,0.3)] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#9090BB] mb-4 font-mono">{sorted.length} product{sorted.length !== 1 ? "s" : ""} found</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {sorted.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
