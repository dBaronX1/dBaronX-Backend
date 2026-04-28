'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AIStoryGeneratorPage() {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('general');
  const [story, setStory] = useState<{ id: string; title: string; content: string; genre: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!title.trim() || !prompt.trim()) {
      setError('Please enter both a title and a prompt.');
      return;
    }
    setLoading(true);
    setError('');
    setStory(null);
    try {
      const res = await fetch('/api/ai-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'anonymous', title, prompt, genre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setStory(data.story);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-8">
            <span className="tag-badge mb-4 inline-block">Claude + GPT Fallback</span>
            <h1 className="text-4xl font-bold gradient-text-purple mb-2">AI Story Generator</h1>
            <p className="text-fg-muted text-sm">Generate immersive eco-themed stories powered by Claude 3.5 Sonnet with GPT-4o fallback.</p>
          </div>

          <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-muted mb-1.5">Story Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Recycling Forest"
                className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fg-muted mb-1.5">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent"
              >
                {['general', 'eco-adventure', 'sci-fi', 'fantasy', 'mystery', 'children', 'thriller'].map((g) => (
                  <option key={g} value={g} className="bg-bg-base capitalize">{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg-muted mb-1.5">Story Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your story... e.g. A young farmer discovers a magical biochar that transforms the desert into a lush forest."
                className="w-full h-32 bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <button
              onClick={generate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? '✨ Generating...' : 'Generate with Claude (or GPT fallback)'}
            </button>
          </div>

          {story && (
            <div className="mt-8 bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-fg-base">{story.title}</h2>
                <span className="tag-badge capitalize">{story.genre}</span>
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="text-sm text-fg-base leading-relaxed whitespace-pre-wrap">{story.content}</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
