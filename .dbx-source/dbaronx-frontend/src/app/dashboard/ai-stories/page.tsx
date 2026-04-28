"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Story {
  id: string;
  title: string;
  genre: string;
  content: string;
  created_at: string;
  is_series: boolean;
}

export default function AIStoriesDashboardPage() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Story | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("ai_stories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setStories(data || []); setLoading(false); });
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050510] circuit-bg">
        <Header />
        <main className="pt-24 pb-20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-[#9090BB] text-sm mb-6">Access your AI Stories dashboard</p>
            <Link href="/login" className="btn-glow-purple bg-[#5E17EB] text-white px-6 py-3 rounded-full font-bold text-sm transition-all">Sign In</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="py-8">
            <nav className="text-xs text-[#9090BB] flex items-center gap-2 mb-4">
              <Link href="/dashboard" className="hover:text-[#C084FC] transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-white">AI Stories</span>
            </nav>
            <div className="flex items-center justify-between">
              <div>
                <span className="tag-badge mb-2 inline-block">Creator Dashboard</span>
                <h1 className="text-3xl font-extrabold text-white">My AI Stories</h1>
              </div>
              <Link href="/ai-stories/create" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all">
                ✨ New Story
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Stories", value: stories.length, icon: "📚" },
              { label: "Series", value: stories.filter((s) => s.is_series).length, icon: "📖" },
              { label: "Genres", value: new Set(stories.map((s) => s.genre)).size, icon: "🎭" },
              { label: "This Month", value: stories.filter((s) => new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, icon: "📅" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-xl p-4">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-[#9090BB]">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Story List */}
            <div className="lg:col-span-1">
              <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4">Story Library</h2>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-[#050510] rounded-xl p-3 animate-pulse">
                        <div className="h-4 bg-[rgba(94,23,235,0.15)] rounded w-3/4 mb-2" />
                        <div className="h-3 bg-[rgba(94,23,235,0.1)] rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : stories.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">📝</div>
                    <p className="text-[#9090BB] text-xs">No stories yet</p>
                    <Link href="/ai-stories/create" className="mt-3 inline-block text-xs text-[#C084FC] hover:text-[#5E17EB] transition-colors">Create your first →</Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {stories.map((story) => (
                      <button
                        key={story.id}
                        onClick={() => setSelected(story)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selected?.id === story.id
                            ? "bg-[rgba(94,23,235,0.15)] border-[rgba(94,23,235,0.4)]"
                            : "bg-[#050510] border-[rgba(94,23,235,0.1)] hover:border-[rgba(94,23,235,0.3)]"
                        }`}
                      >
                        <p className="text-xs font-semibold text-white truncate">{story.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#C084FC] capitalize">{story.genre}</span>
                          <span className="text-[10px] text-[#9090BB]">{new Date(story.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Story Viewer */}
            <div className="lg:col-span-2">
              {selected ? (
                <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="tag-badge capitalize mb-2 inline-block">{selected.genre}</span>
                      <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                      <p className="text-xs text-[#9090BB] mt-1">{new Date(selected.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-[#9090BB] hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="bg-[#050510] rounded-xl p-5 text-sm text-[#E8E8FF] leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                    {selected.content}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Link href="/ai-stories/marketplace" className="text-xs font-semibold text-[#00F0FF] bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(0,240,255,0.15)] transition-colors">
                      Publish to Marketplace →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.1)] rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
                  <div className="text-5xl mb-4">📖</div>
                  <p className="text-white font-semibold mb-2">Select a story to read</p>
                  <p className="text-[#9090BB] text-sm">Click any story from your library to view it here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
