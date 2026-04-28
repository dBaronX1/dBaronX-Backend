"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

interface Story {
  id: string;
  title: string;
  prompt: string;
  content: string;
  genre: string;
  is_series: boolean;
  created_at: string;
}

const GENRES = ["eco-adventure", "sci-fi", "fantasy", "mystery", "children", "thriller", "romance", "historical", "horror", "comedy"];
const LENGTHS = [
  { value: "short", label: "Short (~500 words)" },
  { value: "medium", label: "Medium (~1000 words)" },
  { value: "long", label: "Long (~2000 words)" },
];
const TONES = ["Neutral", "Dramatic", "Humorous", "Inspirational", "Dark", "Whimsical"];

export default function AIStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("eco-adventure");
  const [length, setLength] = useState("medium");
  const [tone, setTone] = useState("Neutral");
  const [isSeries, setIsSeries] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [response, setResponse] = useState("");
  const { user } = useAuth();
  const supabase = createClient();

  const fetchStories = async () => {
    if (!user) { setStories([]); setLoadingStories(false); return; }
    setLoadingStories(true);
    try {
      const { data, error } = await supabase
        .from("ai_stories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) { toast.error("Failed to load story library"); setStories([]); return; }
      setStories(data || []);
    } catch { toast.error("Failed to load story library"); setStories([]); }
    finally { setLoadingStories(false); }
  };

  useEffect(() => { fetchStories(); }, [user]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in to generate stories"); return; }
    if (!prompt.trim()) { toast.error("Please enter a story prompt"); return; }
    setIsLoading(true);
    setResponse("");
    try {
      const res = await fetch("/api/ai-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, genre, length, tone, is_series: isSeries }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setResponse(data.story || data.content || "");
      toast.success("Story generated!");
    } catch (err) {
      toast.error("Story generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !response) return;
    setSaving(true);
    try {
      const title = prompt.slice(0, 60) + (prompt.length > 60 ? "..." : "");
      const { error } = await supabase.from("ai_stories").insert({
        user_id: user.id,
        title,
        prompt,
        content: response,
        genre,
        is_series: isSeries,
      });
      if (error) throw error;
      toast.success("Story saved to your library!");
      fetchStories();
    } catch { toast.error("Failed to save story"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero */}
          <div className="py-12 text-center">
            <span className="tag-badge mb-4 inline-block">AI-Powered Stories</span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
              Create <span className="gradient-text-purple">AI Stories</span>
            </h1>
            <p className="text-[#9090BB] max-w-2xl mx-auto text-base mb-6">
              Generate premium stories with AI. Save, publish, and monetize your creations on the dBaronX marketplace.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: "✍️", text: "AI-Powered Writing" },
                { icon: "🌍", text: "Multiple Genres" },
                { icon: "💰", text: "Monetize Stories" },
                { icon: "📚", text: "Build a Library" },
              ].map((b) => (
                <span key={b.text} className="inline-flex items-center gap-1.5 text-xs text-[#9090BB] bg-[rgba(94,23,235,0.06)] border border-[rgba(94,23,235,0.15)] px-3 py-1.5 rounded-full">
                  {b.icon} {b.text}
                </span>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Generator */}
            <div>
              <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <span className="text-xl">✨</span> Story Generator
                </h2>

                {!user ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🔐</div>
                    <p className="text-[#9090BB] text-sm mb-4">Sign in to generate and save AI stories</p>
                    <div className="flex gap-3 justify-center">
                      <Link href="/login" className="bg-[rgba(94,23,235,0.2)] border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-5 py-2 rounded-full text-sm font-semibold hover:bg-[rgba(94,23,235,0.3)] transition-colors">
                        Sign In
                      </Link>
                      <Link href="/register" className="btn-glow-purple bg-[#5E17EB] text-white px-5 py-2 rounded-full text-sm font-bold transition-all">
                        Join Free
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleGenerate} className="space-y-4">
                    <div>
                      <label className="text-xs text-[#9090BB] mb-1.5 block">Story Prompt *</label>
                      <textarea
                        className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors resize-none"
                        rows={4}
                        placeholder="Describe your story idea... e.g. 'A young eco-warrior discovers a hidden forest powered by solar energy...'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-[#9090BB] mb-1.5 block">Genre</label>
                        <select
                          className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors capitalize"
                          value={genre}
                          onChange={(e) => setGenre(e.target.value)}
                        >
                          {GENRES.map((g) => <option key={g} value={g} className="capitalize">{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[#9090BB] mb-1.5 block">Length</label>
                        <select
                          className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                        >
                          {LENGTHS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[#9090BB] mb-1.5 block">Tone</label>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTone(t)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                              tone === t
                                ? "bg-[rgba(94,23,235,0.3)] border-[rgba(94,23,235,0.6)] text-[#C084FC]"
                                : "bg-transparent border-[rgba(94,23,235,0.2)] text-[#9090BB] hover:border-[rgba(94,23,235,0.4)]"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setIsSeries(!isSeries)}
                        className={`w-10 h-5 rounded-full transition-all relative ${isSeries ? "bg-[#5E17EB]" : "bg-[rgba(94,23,235,0.2)]"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isSeries ? "left-5" : "left-0.5"}`} />
                      </div>
                      <span className="text-xs text-[#9090BB]">Part of a series</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-3.5 rounded-full font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating Story...
                        </>
                      ) : "✨ Generate Story"}
                    </button>
                  </form>
                )}
              </div>

              {/* Generated Story */}
              {response && (
                <div className="mt-5 bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Generated Story</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] px-4 py-1.5 rounded-full hover:bg-[rgba(34,197,94,0.15)] transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "💾 Save"}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-[#9090BB] leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {response}
                  </div>
                </div>
              )}
            </div>

            {/* Story Library */}
            <div>
              <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📚</span> My Story Library
                  </h2>
                  <Link href="/ai-stories/marketplace" className="text-xs text-[#C084FC] hover:text-[#5E17EB] transition-colors">
                    Marketplace →
                  </Link>
                </div>

                {!user ? (
                  <div className="text-center py-8">
                    <p className="text-[#9090BB] text-sm">Sign in to view your story library</p>
                  </div>
                ) : loadingStories ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-[#050510] rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-[rgba(94,23,235,0.15)] rounded w-3/4 mb-2" />
                        <div className="h-3 bg-[rgba(94,23,235,0.1)] rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : stories.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📖</div>
                    <p className="text-[#9090BB] text-sm">No stories yet. Generate your first story!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {stories.map((story) => (
                      <button
                        key={story.id}
                        onClick={() => setSelectedStory(selectedStory?.id === story.id ? null : story)}
                        className="w-full text-left bg-[#050510] border border-[rgba(94,23,235,0.15)] hover:border-[rgba(94,23,235,0.4)] rounded-xl p-4 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{story.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-[#C084FC] capitalize">{story.genre}</span>
                              <span className="text-[10px] text-[#9090BB]">{new Date(story.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <svg className={`w-4 h-4 text-[#9090BB] flex-shrink-0 transition-transform ${selectedStory?.id === story.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {selectedStory?.id === story.id && (
                          <div className="mt-3 pt-3 border-t border-[rgba(94,23,235,0.15)] text-xs text-[#9090BB] leading-relaxed line-clamp-6">
                            {story.content}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Monetize CTA */}
              <div className="mt-5 bg-gradient-to-br from-[rgba(94,23,235,0.15)] to-[rgba(0,240,255,0.05)] border border-[rgba(94,23,235,0.3)] rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-2">💰 Monetize Your Stories</h3>
                <p className="text-xs text-[#9090BB] mb-4">Publish premium stories on the marketplace and earn from every read or purchase.</p>
                <div className="space-y-2 mb-4">
                  {["Sell story packs to readers", "Earn per premium read", "Build a subscriber base", "Creator subscription revenue"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#9090BB]">
                      <span className="text-[#22C55E]">✓</span> {f}
                    </div>
                  ))}
                </div>
                <Link href="/ai-stories/marketplace" className="block text-center btn-glow-cyan bg-transparent border border-[#00F0FF] text-[#00F0FF] py-2.5 rounded-full text-xs font-bold hover:bg-[rgba(0,240,255,0.1)] transition-all">
                  View Marketplace →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}