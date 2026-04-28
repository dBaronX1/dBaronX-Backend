"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

const GENRES = ["eco-adventure", "sci-fi", "fantasy", "mystery", "children", "thriller", "romance", "historical", "horror", "comedy"];
const LENGTHS = [
  { value: "short", label: "Short", desc: "~500 words", credits: 1 },
  { value: "medium", label: "Medium", desc: "~1000 words", credits: 2 },
  { value: "long", label: "Long", desc: "~2000 words", credits: 4 },
];
const TONES = ["Neutral", "Dramatic", "Humorous", "Inspirational", "Dark", "Whimsical"];
const LANGUAGES = ["English", "French", "Spanish", "Arabic", "Portuguese", "Swahili"];

export default function AIStoriesCreatePage() {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [form, setForm] = useState({
    prompt: "",
    genre: "eco-adventure",
    length: "medium",
    tone: "Neutral",
    language: "English",
    is_series: false,
  });
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in to generate stories"); return; }
    setStep("generating");
    try {
      const res = await fetch("/api/ai-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setResult(data.story || data.content || "");
      setStep("result");
    } catch {
      toast.error("Story generation failed. Please try again.");
      setStep("form");
    }
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const title = form.prompt.slice(0, 60) + (form.prompt.length > 60 ? "..." : "");
      const { error } = await supabase.from("ai_stories").insert({
        user_id: user.id,
        title,
        prompt: form.prompt,
        content: result,
        genre: form.genre,
        is_series: form.is_series,
      });
      if (error) throw error;
      toast.success("Story saved to your library!");
    } catch { toast.error("Failed to save story"); }
    finally { setSaving(false); }
  };

  const selectedLength = LENGTHS.find((l) => l.value === form.length);

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="py-10">
            <nav className="text-xs text-[#9090BB] flex items-center gap-2 mb-4">
              <Link href="/ai-stories" className="hover:text-[#C084FC] transition-colors">AI Stories</Link>
              <span>/</span>
              <span className="text-white">Create</span>
            </nav>
            <span className="tag-badge mb-3 inline-block">Story Creator</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
              Create Your <span className="gradient-text-purple">AI Story</span>
            </h1>
            <p className="text-[#9090BB] text-sm">Craft premium stories powered by AI. Publish and monetize on the marketplace.</p>
          </div>

          {step === "generating" && (
            <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-2 border-[rgba(94,23,235,0.3)] animate-ping" />
                <div className="w-20 h-20 rounded-full bg-[rgba(94,23,235,0.1)] border border-[rgba(94,23,235,0.3)] flex items-center justify-center text-3xl">
                  ✨
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Crafting Your Story</h2>
              <p className="text-[#9090BB] text-sm">AI is writing your {form.genre} story in {form.language}...</p>
              <div className="mt-6 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-[#5E17EB] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="space-y-5">
              <div className="bg-[#0D0D2B] border border-[rgba(34,197,94,0.3)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[#22C55E] text-lg">✅</span>
                    <h2 className="text-base font-bold text-white">Story Generated!</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-xs font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] px-4 py-1.5 rounded-full hover:bg-[rgba(34,197,94,0.15)] transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "💾 Save to Library"}
                    </button>
                    <button
                      onClick={() => setStep("form")}
                      className="text-xs font-semibold text-[#9090BB] bg-[rgba(94,23,235,0.08)] border border-[rgba(94,23,235,0.2)] px-4 py-1.5 rounded-full hover:border-[rgba(94,23,235,0.4)] transition-colors"
                    >
                      ✨ New Story
                    </button>
                  </div>
                </div>
                <div className="bg-[#050510] rounded-xl p-5 text-sm text-[#E8E8FF] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {result}
                </div>
              </div>
              <div className="bg-[rgba(94,23,235,0.06)] border border-[rgba(94,23,235,0.2)] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Ready to monetize?</p>
                  <p className="text-xs text-[#9090BB]">Publish this story on the marketplace and earn from readers.</p>
                </div>
                <Link href="/ai-stories/marketplace" className="btn-glow-cyan bg-transparent border border-[#00F0FF] text-[#00F0FF] px-5 py-2 rounded-full text-xs font-bold hover:bg-[rgba(0,240,255,0.1)] transition-all whitespace-nowrap">
                  Go to Marketplace →
                </Link>
              </div>
            </div>
          )}

          {step === "form" && (
            <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6 md:p-8">
              {!user ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">🔐</div>
                  <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
                  <p className="text-[#9090BB] text-sm mb-6">Create a free account to start generating AI stories</p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/login" className="bg-[rgba(94,23,235,0.2)] border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[rgba(94,23,235,0.3)] transition-colors">Sign In</Link>
                    <Link href="/register" className="btn-glow-purple bg-[#5E17EB] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all">Join Free</Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGenerate} className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold text-[#9090BB] mb-2 block uppercase tracking-wider">Story Prompt *</label>
                    <textarea
                      className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors resize-none"
                      rows={5}
                      placeholder="Describe your story in detail... The more specific, the better the result. e.g. 'A young eco-warrior in 2045 discovers a hidden underground forest powered by solar energy. She must protect it from a corrupt corporation...'"
                      value={form.prompt}
                      onChange={(e) => update("prompt", e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-[#9090BB] mt-1">{form.prompt.length} characters</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-semibold text-[#9090BB] mb-2 block uppercase tracking-wider">Genre</label>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => update("genre", g)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${
                              form.genre === g
                                ? "bg-[rgba(94,23,235,0.3)] border-[rgba(94,23,235,0.6)] text-[#C084FC]"
                                : "bg-transparent border-[rgba(94,23,235,0.2)] text-[#9090BB] hover:border-[rgba(94,23,235,0.4)]"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#9090BB] mb-2 block uppercase tracking-wider">Tone</label>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => update("tone", t)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                              form.tone === t
                                ? "bg-[rgba(0,240,255,0.15)] border-[rgba(0,240,255,0.4)] text-[#00F0FF]"
                                : "bg-transparent border-[rgba(94,23,235,0.2)] text-[#9090BB] hover:border-[rgba(94,23,235,0.4)]"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-semibold text-[#9090BB] mb-2 block uppercase tracking-wider">Story Length</label>
                      <div className="grid grid-cols-3 gap-2">
                        {LENGTHS.map((l) => (
                          <button
                            key={l.value}
                            type="button"
                            onClick={() => update("length", l.value)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              form.length === l.value
                                ? "bg-[rgba(94,23,235,0.2)] border-[rgba(94,23,235,0.5)] text-white"
                                : "bg-transparent border-[rgba(94,23,235,0.15)] text-[#9090BB] hover:border-[rgba(94,23,235,0.3)]"
                            }`}
                          >
                            <p className="text-xs font-bold">{l.label}</p>
                            <p className="text-[10px] mt-0.5 opacity-70">{l.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#9090BB] mb-2 block uppercase tracking-wider">Language</label>
                      <select
                        className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
                        value={form.language}
                        onChange={(e) => update("language", e.target.value)}
                      >
                        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => update("is_series", !form.is_series)}
                      className={`w-10 h-5 rounded-full transition-all relative ${form.is_series ? "bg-[#5E17EB]" : "bg-[rgba(94,23,235,0.2)]"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.is_series ? "left-5" : "left-0.5"}`} />
                    </div>
                    <span className="text-xs text-[#9090BB]">This is part of a series</span>
                  </label>

                  <button
                    type="submit"
                    className="w-full btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    ✨ Generate Story ({selectedLength?.credits || 2} credits)
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
