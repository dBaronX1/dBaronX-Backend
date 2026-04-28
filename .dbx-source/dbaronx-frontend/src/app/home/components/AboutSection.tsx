"use client";
import React, { useEffect, useRef } from "react";

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    const items = el?.querySelectorAll(".reveal-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.15 }
    );
    items?.forEach((i) => observer?.observe(i));
    return () => observer?.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={ref}
      className="relative py-24 px-6 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div className="reveal-up">
              <span className="tag-badge">About dBaronX</span>
            </div>
            <h2 className="reveal-up text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              <span className="gradient-text-purple">Real Utility.</span>
              <br />
              <span className="text-white">Real Commitment.</span>
            </h2>
            <p className="reveal-up text-fg-muted text-base md:text-lg leading-relaxed max-w-lg">
              dBaronX (DBX) is the utility token powering a real{" "}
              <span className="text-accent font-semibold">Dubai/Ghana-based eco-ecosystem</span>. Strictly
              capped at <span className="text-white font-semibold">35,000,000 tokens</span> with{" "}
              <span className="text-[#4ADE80] font-semibold">90% of team allocation locked on Streamflow</span>{" "}
              until February 2028 for complete transparency and long-term commitment.
            </p>
            <div className="reveal-up flex flex-wrap gap-3">
              <span className="tag-badge-green tag-badge">✓ Streamflow Locked</span>
              <span className="tag-badge">✓ On-Chain Transparent</span>
              <span className="tag-badge-cyan tag-badge">✓ Solana Network</span>
            </div>
          </div>

          {/* Right: stat blocks */}
          <div className="reveal-up grid grid-cols-2 gap-4 stagger-children">
            {[
              { label: "Total Supply", value: "35M", sub: "Strictly capped", color: "text-white" },
              { label: "Team Lock", value: "90%", sub: "Until Feb 2028", color: "text-[#4ADE80]" },
              { label: "Network", value: "SOL", sub: "Solana blockchain", color: "text-accent" },
              { label: "Locked Via", value: "STR", sub: "Streamflow.finance", color: "text-[#C084FC]" },
            ]?.map((stat) => (
              <div
                key={stat?.label}
                className="card-hover-glow bg-bg-card rounded-3xl p-6 flex flex-col gap-2"
              >
                <span className="text-fg-muted text-xs font-mono uppercase tracking-widest">
                  {stat?.label}
                </span>
                <span className={`text-4xl font-extrabold tracking-tight shimmer-text`}>
                  {stat?.value}
                </span>
                <span className="text-fg-muted text-xs">{stat?.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}