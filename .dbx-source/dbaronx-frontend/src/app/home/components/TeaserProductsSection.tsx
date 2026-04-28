"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";

const products = [
  {
    icon: "🧼",
    name: "Amonkyi Natural Soaps",
    category: "Health & Wellness",
    desc: "Palm kernel-based handcrafted soaps. Zero harsh chemicals, circular process.",
    price: "From $12",
    accent: "#4ADE80",
    badge: "Popular",
    slug: "soaps",
  },
  {
    icon: "🪨",
    name: "Biochar / Activated Carbon",
    category: "Agriculture",
    desc: "Carbon-rich biochar from palm kernel biomass. Improves soil yield 30-40%.",
    price: "From $18",
    accent: "#00F0FF",
    badge: "Eco-Verified",
    slug: "biochar",
  },
  {
    icon: "🧱",
    name: "Recycled Plastic Pavers",
    category: "Construction",
    desc: "Interlocking paver tiles made from recycled plastic. Stronger than concrete.",
    price: "From $35/m²",
    accent: "#C084FC",
    badge: "Zero-Waste",
    slug: "pavers",
  },
  {
    icon: "🌾",
    name: "Organic Farm Produce",
    category: "Food & Agriculture",
    desc: "Yam, cassava, plantain, maize, vegetables & honey. Direct from cooperative farms.",
    price: "From $8",
    accent: "#F59E0B",
    badge: "Farm-Direct",
    slug: "produce",
  },
  {
    icon: "⚡",
    name: "Biogas Fertilizer Packs",
    category: "Agriculture",
    desc: "Nutrient-rich organic liquid fertilizer. Boosts yields, replaces chemical inputs.",
    price: "From $15",
    accent: "#4ADE80",
    badge: "Circular",
    slug: "biogas",
  },
];

export default function TeaserProductsSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    const items = el?.querySelectorAll(".reveal-up");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08 }
    );
    items?.forEach((i) => observer?.observe(i));
    return () => observer?.disconnect();
  }, []);

  return (
    <section
      id="shop"
      ref={ref}
      className="relative py-24 px-6 overflow-hidden"
      aria-labelledby="products-section-title">
      <div
        className="absolute right-0 top-1/3 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(94,23,235,0.1) 0%, transparent 70%)", filter: "blur(80px)" }}
        aria-hidden="true" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <div className="reveal-up flex justify-center">
            <span className="tag-badge-green tag-badge">Featured Products</span>
          </div>
          <h2 id="products-section-title" className="reveal-up text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text-silver">Shop</span>{" "}
            <span className="gradient-text-purple">Premium Products</span>
          </h2>
          <p className="reveal-up text-fg-muted max-w-xl mx-auto">
            Curated products from verified global suppliers. Every purchase is fulfilled after payment confirmation — no pre-stocked inventory.
          </p>
        </div>

        <div className="reveal-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children" role="list">
          {products?.map((product) => (
            <article
              key={product?.name}
              role="listitem"
              className="card-hover-glow bg-bg-card rounded-3xl p-5 flex flex-col gap-3 group relative overflow-hidden"
              aria-label={`${product?.name} — ${product?.category} — ${product?.price}`}>
              <div
                className="absolute top-3 right-3 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: `${product?.accent}15`,
                  border: `1px solid ${product?.accent}35`,
                  color: product?.accent,
                }}
                aria-label={`Badge: ${product?.badge}`}>
                {product?.badge}
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${product?.accent}15`, border: `1px solid ${product?.accent}30` }}
                aria-hidden="true">
                {product?.icon}
              </div>
              <span className="text-fg-muted text-[10px] font-mono uppercase tracking-widest">{product?.category}</span>
              <h3 className="text-sm font-bold text-white leading-snug">{product?.name}</h3>
              <p className="text-fg-muted text-xs leading-relaxed flex-1">{product?.desc}</p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <span className="text-white font-bold text-sm">{product?.price}</span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(94,23,235,0.2)", color: "#C084FC", border: "1px solid rgba(94,23,235,0.3)" }}>
                  DBX ↓
                </span>
              </div>
              <div
                className="h-px rounded-full"
                style={{ background: `linear-gradient(90deg, ${product?.accent}60, transparent)` }}
                aria-hidden="true" />
            </article>
          ))}
        </div>

        <div className="reveal-up mt-10 text-center flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/shop"
            className="btn-glow-purple bg-primary hover:bg-primary-light text-white px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Browse all products in the shop">
            <span aria-hidden="true">🛒</span>
            Browse All Products
          </Link>
          <Link
            href="/register"
            className="border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[rgba(94,23,235,0.1)] transition-all inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Create a free account">
            <span aria-hidden="true">✨</span>
            Create Free Account
          </Link>
        </div>
      </div>
    </section>
  );
}
