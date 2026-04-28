"use client";
import React, { useEffect, useRef } from "react";
import AppImage from "@/components/ui/AppImage";
import Link from "next/link";

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
      const glow = el.querySelector<HTMLElement>(".hero-glow-orb");
      if (glow) {
        glow.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden circuit-bg scanline pt-16">
      
      <div
        className="hero-glow-orb absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: "radial-gradient(circle, rgba(94,23,235,0.25) 0%, rgba(0,240,255,0.05) 50%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(40px)"
        }}
        aria-hidden="true" />
      
      <div
        className="absolute w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)",
          top: "20%",
          right: "10%",
          filter: "blur(60px)"
        }}
        aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
        <div className="mb-8 relative">
          <div
            className="orbit-ring absolute inset-0 rounded-full border border-[rgba(94,23,235,0.3)]"
            style={{ margin: "-16px" }}
            aria-hidden="true" />
          <div
            className="orbit-ring-reverse absolute inset-0 rounded-full border border-[rgba(0,240,255,0.2)] border-dashed"
            style={{ margin: "-28px" }}
            aria-hidden="true" />
          <div className="logo-glow rounded-full overflow-hidden w-28 h-28 md:w-36 md:h-36 relative z-10">
            <AppImage
              src="https://img.rocket.new/generatedImages/rocket_gen_img_104b5a55c-1775686930890.png"
              alt="dBaronX official logo — premium global e-commerce brand"
              width={144}
              height={144}
              className="w-full h-full object-cover rounded-full"
              priority />
          </div>
        </div>

        <div className="tag-badge mb-6">Premium Global E-Commerce · dBaronX</div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
          <span className="gradient-text-silver block">Shop Premium.</span>
          <span className="gradient-text-purple block mt-1">Pay First. We Handle</span>
          <span className="text-white block mt-1">The Rest.</span>
        </h1>

        <p className="text-fg-muted text-base md:text-lg max-w-2xl leading-relaxed mb-4">
          Discover curated global products at competitive prices. You pay — we confirm — supplier ships directly to your door. 
          <span className="text-accent"> No upfront stock. No warehouse delays.</span>
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
          { icon: "🔒", label: "Secure Payments" },
          { icon: "🌍", label: "Global Shipping" },
          { icon: "✅", label: "Verified Suppliers" },
          { icon: "💎", label: "DBX Member Discounts" }].
          map((badge) =>
          <span key={badge.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted bg-[rgba(94,23,235,0.08)] border border-[rgba(94,23,235,0.2)] px-3 py-1.5 rounded-full">
              <span>{badge.icon}</span>{badge.label}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/shop"
            className="btn-glow-purple bg-primary hover:bg-primary-light text-white px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Shop Now
          </Link>
          <Link
            href="/register"
            className="btn-glow-cyan bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-bg-base px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300">
            Create Free Account
          </Link>
        </div>

        {/* How it works mini */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
          {[
          { step: "01", label: "Browse & Select", icon: "🛍️" },
          { step: "02", label: "Pay Securely", icon: "💳" },
          { step: "03", label: "We Confirm & Order", icon: "✅" },
          { step: "04", label: "Ships to Your Door", icon: "📦" }].
          map((item) =>
          <div key={item.step} className="flex flex-col items-center gap-2 bg-[rgba(94,23,235,0.06)] border border-[rgba(94,23,235,0.15)] rounded-2xl p-4">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-mono text-accent">{item.step}</span>
              <span className="text-xs font-medium text-fg-muted text-center leading-tight">{item.label}</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span className="text-xs font-mono text-fg-muted uppercase tracking-widest">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-accent to-transparent" />
      </div>
    </section>);

}