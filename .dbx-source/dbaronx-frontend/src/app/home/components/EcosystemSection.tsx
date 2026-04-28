"use client";
import React, { useEffect, useRef } from "react";

interface Feature {
  icon: string;
  title: string;
  desc: string;
  tag: string;
  span?: string;
  accentColor?: string;
}

const features: Feature[] = [
  {
    icon: "🌿",
    title: "Natural Health & Wellness Products",
    desc: "Curated organic supplements, herbal remedies, and wellness products sourced from nature's richest ecosystems worldwide.",
    tag: "Live",
    span: "lg:col-span-5",
    accentColor: "#4ADE80",
  },
  {
    icon: "🌍",
    title: "Global Eco-Friendly Dropshipping",
    desc: "Ship sustainable products worldwide with zero inventory risk. Carbon-conscious logistics built in.",
    tag: "Live",
    span: "lg:col-span-7",
    accentColor: "#00F0FF",
  },
  {
    icon: "🤝",
    title: "Community Crowdfunding Platform",
    desc: "Fund real-world eco projects, small businesses, and community initiatives using DBX tokens.",
    tag: "Q2 2026",
    span: "lg:col-span-4",
    accentColor: "#C084FC",
  },
  {
    icon: "💎",
    title: "Staking Rewards & Loyalty",
    desc: "Stake DBX to earn passive rewards and unlock exclusive member tiers with escalating benefits.",
    tag: "Q3 2026",
    span: "lg:col-span-4",
    accentColor: "#5E17EB",
  },
  {
    icon: "🎟️",
    title: "Member Discounts & Exclusive Access",
    desc: "Hold DBX for tiered discounts across the entire ecosystem, early product launches, and VIP events.",
    tag: "Live",
    span: "lg:col-span-4",
    accentColor: "#F59E0B",
  },
  {
    icon: "♻️",
    title: "Recycling, Farm & Logistics Integration",
    desc: "Future roadmap: tokenized recycling incentives, farm-to-table traceability, and last-mile delivery rewards.",
    tag: "Roadmap",
    span: "lg:col-span-12",
    accentColor: "#4ADE80",
  },
];

export default function EcosystemSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".reveal-up");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08 }
    );
    items.forEach((i) => observer.observe(i));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="ecosystem" ref={ref} className="relative py-24 px-6 overflow-hidden">
      <div
        className="absolute left-0 top-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(94,23,235,0.08) 0%, transparent 70%)", filter: "blur(80px)" }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="reveal-up flex justify-center">
            <span className="tag-badge">The DBX Ecosystem</span>
          </div>
          <h2 className="reveal-up text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="text-white">Six Pillars of</span>{" "}
            <span className="gradient-text-purple">Real Utility</span>
          </h2>
          <p className="reveal-up text-fg-muted max-w-xl mx-auto">
            Every DBX token has a purpose inside a growing global ecosystem built for real people and real impact.
          </p>
        </div>

        {/* Bento grid */}
        <div className="reveal-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 stagger-children">
          {features.map((f) => (
            <div
              key={f.title}
              className={`card-hover-glow bg-bg-card rounded-3xl p-7 flex flex-col gap-4 ${f.span || ""}`}
            >
              {/* Icon + tag row */}
              <div className="flex items-start justify-between">
                <span className="text-4xl" role="img" aria-label={f.title}>
                  {f.icon}
                </span>
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{
                    background: `${f.accentColor}15`,
                    border: `1px solid ${f.accentColor}35`,
                    color: f.accentColor,
                  }}
                >
                  {f.tag}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">{f.title}</h3>
              <p className="text-fg-muted text-sm leading-relaxed">{f.desc}</p>
              {/* Bottom accent line */}
              <div
                className="h-px mt-auto rounded-full"
                style={{ background: `linear-gradient(90deg, ${f.accentColor}60, transparent)` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}