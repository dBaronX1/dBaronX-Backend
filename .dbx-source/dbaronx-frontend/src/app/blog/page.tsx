"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import OpenInBotButton from "@/components/OpenInBotButton";


interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  published_at: string;
  view_count: number;
}

const CATEGORIES = [
  { value: "all", label: "All Stories" },
  { value: "farm-stories", label: "🌾 Farm Stories" },
  { value: "sustainability", label: "🌱 Sustainability" },
  { value: "recycling", label: "♻️ Recycling" },
  { value: "community", label: "🤝 Community" },
];

const SCHEMA_ORG_BLOG = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "dBaronX Farm & Recycling Stories",
  "description": "Real stories from our Ghana operations — palm kernel farming, plastic recycling, biochar production, and community impact.",
  "url": "https://dbaronx.com/blog",
  "publisher": {
    "@type": "Organization",
    "name": "dBaronX Ltd",
    "url": "https://dbaronx.com",
    "logo": "https://dbaronx.com/assets/images/app_logo.png"
  }
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, category, tags, published_at, view_count")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      const { data, error } = await query.limit(12);
      if (error) { console.log("Blog error:", error.message); return; }
      setPosts(data || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative bg-bg-base min-h-screen" id="main-content">
      {/* Schema.org Blog markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_ORG_BLOG) }}
      />

      <Header />

      {/* Hero */}
      <section className="relative pt-28 pb-12 px-6 circuit-bg" aria-labelledby="blog-title">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(94,23,235,0.1) 0%, transparent 60%)" }}
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 tag-badge mb-6">
            <span aria-hidden="true">📖</span> Farm & Recycling Stories
          </div>
          <h1 id="blog-title" className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text-silver">Real Stories.</span>{" "}
            <span className="gradient-text-purple">Real Impact.</span>
          </h1>
          <p className="text-fg-muted text-lg max-w-2xl mx-auto mb-6">
            From palm kernel harvests to plastic recycling — follow the journey of every product we make.
          </p>
          <div className="flex justify-center">
            <OpenInBotButton page="blog" size="md" variant="outline" label="Follow in Bot" />
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-6 pb-6" aria-label="Filter blog posts by category">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category filters">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                aria-pressed={activeCategory === cat.value}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent ${
                  activeCategory === cat.value
                    ? "bg-primary text-white border border-primary" :"bg-bg-card text-fg-muted border border-[rgba(94,23,235,0.2)] hover:text-accent hover:border-accent/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="px-6 pb-20" aria-label="Blog posts">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading posts">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-bg-card rounded-3xl overflow-hidden animate-pulse" aria-hidden="true">
                  <div className="h-48 bg-bg-card2" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-bg-card2 rounded w-1/3" />
                    <div className="h-6 bg-bg-card2 rounded" />
                    <div className="h-4 bg-bg-card2 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4" aria-hidden="true">📝</div>
              <p className="text-fg-muted text-lg">No stories published yet in this category.</p>
              <p className="text-fg-muted text-sm mt-2">Check back soon — our team is writing from the field!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-bg-card rounded-3xl overflow-hidden border border-[rgba(94,23,235,0.15)] hover:border-[rgba(94,23,235,0.4)] transition-all group card-hover-glow"
                  aria-labelledby={`post-title-${post.id}`}
                >
                  {/* Cover image */}
                  <div className="relative h-48 overflow-hidden bg-bg-card2">
                    {post.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.cover_image_url}
                        alt={`Cover image for: ${post.title}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl" aria-hidden="true">
                        {post.category === "farm-stories" ? "🌾" : post.category === "recycling" ? "♻️" : "🌱"}
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="tag-badge text-[10px]">
                        {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3 text-xs text-fg-muted font-mono">
                      <time dateTime={post.published_at}>
                        {new Date(post.published_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </time>
                      {post.view_count > 0 && (
                        <span aria-label={`${post.view_count} views`}>· {post.view_count} views</span>
                      )}
                    </div>

                    <h2 id={`post-title-${post.id}`} className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-accent transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    <p className="text-fg-muted text-sm leading-relaxed mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Tags">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[rgba(94,23,235,0.1)] text-[#C084FC] border border-[rgba(94,23,235,0.2)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Social share + read more */}
                    <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center gap-2">
                        {/* Share on X */}
                        <a
                          href={`https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://dbaronx.com/blog/${post.slug}`)}&via=dbaronx_eco`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                          aria-label={`Share "${post.title}" on X`}
                        >
                          <svg className="w-3.5 h-3.5 text-fg-muted" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                        {/* Share on Telegram */}
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(`https://dbaronx.com/blog/${post.slug}`)}&text=${encodeURIComponent(post.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-[rgba(0,240,255,0.05)] hover:bg-[rgba(0,240,255,0.1)] transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                          aria-label={`Share "${post.title}" on Telegram`}
                        >
                          <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                          </svg>
                        </a>
                      </div>
                      <span className="text-xs text-accent font-medium group-hover:underline cursor-pointer">
                        Read Story →
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Telegram CTA */}
      <section className="px-6 pb-20" aria-labelledby="blog-cta-title">
        <div className="max-w-2xl mx-auto text-center bg-bg-card rounded-3xl p-8 border border-[rgba(0,240,255,0.15)]">
          <div className="text-3xl mb-3" aria-hidden="true">📱</div>
          <h2 id="blog-cta-title" className="text-xl font-bold text-white mb-2">Get Stories in Telegram</h2>
          <p className="text-fg-muted text-sm mb-5">
            Follow our Telegram channel for real-time farm updates, recycling milestones, and community stories.
          </p>
          <a
            href="https://t.me/dBaronX_DBX_Token"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow-cyan inline-flex items-center gap-2 bg-transparent border border-accent text-accent px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-accent hover:text-bg-base transition-all focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Join dBaronX Telegram channel"
          >
            <span aria-hidden="true">✈️</span> Join Telegram Channel
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
