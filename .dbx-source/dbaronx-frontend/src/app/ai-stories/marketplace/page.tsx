"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const MOCK_STORIES = [
  { id: "1", title: "The Solar Forest", genre: "eco-adventure", author: "EcoWriter", price: 2.99, reads: 1240, rating: 4.8, excerpt: "In 2045, a young eco-warrior discovers a hidden underground forest powered by solar energy..." },
  { id: "2", title: "Quantum Dreams", genre: "sci-fi", author: "TechNarrator", price: 3.99, reads: 890, rating: 4.6, excerpt: "When quantum computing meets human consciousness, reality itself becomes negotiable..." },
  { id: "3", title: "The Last Dragon", genre: "fantasy", author: "MythWeaver", price: 1.99, reads: 2100, rating: 4.9, excerpt: "The last dragon egg hatches in a world that has forgotten magic exists..." },
  { id: "4", title: "Midnight Protocol", genre: "thriller", author: "ShadowPen", price: 2.49, reads: 670, rating: 4.5, excerpt: "A cybersecurity analyst discovers a conspiracy that goes all the way to the top..." },
  { id: "5", title: "Starlight Children", genre: "children", author: "DreamTeller", price: 0.99, reads: 3400, rating: 5.0, excerpt: "Little Zara discovers she can talk to stars, and they have an important message..." },
  { id: "6", title: "The Merchant\'s Secret", genre: "historical", author: "ChronicleWriter", price: 3.49, reads: 450, rating: 4.7, excerpt: "A 15th century merchant in Timbuktu holds the secret to a lost civilization..." },
];

const GENRES = ["All", "eco-adventure", "sci-fi", "fantasy", "mystery", "children", "thriller", "romance", "historical"];

export default function AIStoriesMarketplacePage() {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");

  const filtered = MOCK_STORIES?.filter((s) => {
    const matchGenre = selectedGenre === "All" || s?.genre === selectedGenre;
    const matchSearch = !search || s?.title?.toLowerCase()?.includes(search?.toLowerCase()) || s?.excerpt?.toLowerCase()?.includes(search?.toLowerCase());
    return matchGenre && matchSearch;
  })?.sort((a, b) => {
    if (sort === "popular") return b?.reads - a?.reads;
    if (sort === "rating") return b?.rating - a?.rating;
    if (sort === "price_asc") return a?.price - b?.price;
    if (sort === "price_desc") return b?.price - a?.price;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero */}
          <div className="py-10">
            <span className="tag-badge mb-3 inline-block">Story Marketplace</span>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2">
                  AI Stories <span className="gradient-text-purple">Marketplace</span>
                </h1>
                <p className="text-[#9090BB] text-sm">Discover and purchase premium AI-generated stories from creators worldwide.</p>
              </div>
              <Link href="/ai-stories/create" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all">
                ✨ Create & Sell
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Stories Published", value: "2,400+" },
              { label: "Total Reads", value: "180K+" },
              { label: "Active Creators", value: "340+" },
            ]?.map((s) => (
              <div key={s?.label} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-xl p-4 text-center">
                <p className="text-xl font-bold gradient-text-purple">{s?.value}</p>
                <p className="text-xs text-[#9090BB] mt-1">{s?.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9090BB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search stories..."
                value={search}
                onChange={(e) => setSearch(e?.target?.value)}
                className="w-full bg-[#0D0D2B] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e?.target?.value)}
              className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] min-w-[160px]"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {GENRES?.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`text-xs font-medium px-4 py-2 rounded-full border transition-all capitalize ${
                  selectedGenre === g
                    ? "bg-[rgba(94,23,235,0.3)] border-[rgba(94,23,235,0.6)] text-[#C084FC]"
                    : "bg-transparent border-[rgba(94,23,235,0.2)] text-[#9090BB] hover:border-[rgba(94,23,235,0.4)] hover:text-white"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Stories Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered?.map((story) => (
              <div key={story?.id} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-5 hover:border-[rgba(94,23,235,0.5)] hover:shadow-[0_0_30px_rgba(94,23,235,0.1)] transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <span className="tag-badge capitalize">{story?.genre}</span>
                  <div className="flex items-center gap-1 text-xs text-[#F59E0B]">
                    ⭐ {story?.rating}
                  </div>
                </div>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#C084FC] transition-colors">{story?.title}</h3>
                <p className="text-xs text-[#9090BB] leading-relaxed mb-4 line-clamp-3">{story?.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-[#9090BB] mb-4">
                  <span>by {story?.author}</span>
                  <span>{story?.reads?.toLocaleString()} reads</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white">${story?.price}</span>
                  <button className="text-xs font-bold text-[#00F0FF] bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(0,240,255,0.15)] transition-colors">
                    Read Now →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered?.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-white font-semibold mb-2">No stories found</p>
              <p className="text-[#9090BB] text-sm">Try a different genre or search term</p>
            </div>
          )}

          {/* Creator CTA */}
          <div className="mt-12 bg-gradient-to-br from-[rgba(94,23,235,0.15)] to-[rgba(0,240,255,0.05)] border border-[rgba(94,23,235,0.3)] rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Become a Story Creator</h2>
            <p className="text-[#9090BB] text-sm mb-6 max-w-lg mx-auto">
              Generate AI stories, publish them on the marketplace, and earn from every read and purchase.
            </p>
            <Link href="/ai-stories/create" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-8 py-3 rounded-full font-bold text-sm transition-all inline-block">
              Start Creating →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
