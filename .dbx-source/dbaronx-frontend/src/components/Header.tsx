"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AppImage from "@/components/ui/AppImage";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const primaryNavLinks = [
  { label: "Home", href: "/home" },
  { label: "Shop", href: "/products" },
];

const secondaryNavLinks = [
  { label: "AI Stories", href: "/ai-stories", badge: "New" },
  { label: "Watch & Earn", href: "/watch-earn", badge: "Earn" },
  { label: "Affiliates", href: "/affiliates" },
  { label: "Dreams", href: "/dreams" },
  { label: "DBX Token", href: "/dbx-token" },
  { label: "Pricing", href: "/pricing" },
];

const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router?.push("/home");
    } catch (e) {
      console.log("Sign out error:", e);
    }
  };

  return (
    <header
      role="banner"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#050510]/95 backdrop-blur-xl border-b border-[rgba(94,23,235,0.2)]"
          : "bg-[#050510]/80 backdrop-blur-md"
      }`}>
      <nav
        className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4"
        role="navigation"
        aria-label="Main navigation">
        
        <Link
          href="/home"
          className="flex items-center gap-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-accent rounded-lg"
          aria-label="dBaronX — Go to home page">
          <div className="logo-glow rounded-full w-8 h-8 overflow-hidden flex-shrink-0">
            <AppImage
              src="https://img.rocket.new/generatedImages/rocket_gen_img_192c8f3e6-1774722128854.png"
              alt="dBaronX DBX logo"
              width={32}
              height={32}
              className="w-full h-full object-cover rounded-full"
              priority />
          </div>
          <span className="font-bold text-base tracking-tight gradient-text-purple hidden sm:block">
            dBaronX
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-0.5 text-xs font-medium" role="list">
          {/* Primary links - always visible */}
          {primaryNavLinks?.map((item) => (
            <Link
              key={item?.label}
              href={item?.href}
              role="listitem"
              className={`px-3 py-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent font-semibold ${
                pathname === item?.href
                  ? "text-accent bg-accent/10 border border-accent/20" :"text-fg-base hover:text-accent hover:bg-accent/5"
              }`}
              aria-current={pathname === item?.href ? "page" : undefined}>
              {item?.label}
            </Link>
          ))}
          {/* Divider */}
          <div className="w-px h-4 bg-[rgba(94,23,235,0.3)] mx-1" aria-hidden="true" />
          {/* Secondary links */}
          {secondaryNavLinks?.map((item) => (
            <Link
              key={item?.label}
              href={item?.href}
              role="listitem"
              className={`px-2.5 py-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent flex items-center gap-1 ${
                pathname === item?.href
                  ? "text-accent bg-accent/10 border border-accent/20" :"text-fg-muted hover:text-accent hover:bg-accent/5"
              }`}
              aria-current={pathname === item?.href ? "page" : undefined}>
              {item?.label}
              {item?.badge && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[rgba(94,23,235,0.3)] text-[#C084FC] leading-none">
                  {item?.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/id-card"
                    className="hidden md:flex items-center gap-1 text-xs text-[#C084FC] hover:text-accent transition-colors px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent rounded"
                    aria-label="DBX Premium ID Card">
                    <span aria-hidden="true">💎</span>
                    <span className="hidden lg:inline">ID Card</span>
                  </Link>
                  <Link
                    href="/admin"
                    className="hidden md:block text-xs text-fg-muted hover:text-accent transition-colors px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent rounded"
                    aria-label="Admin panel">
                    Admin
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-fg-muted hover:text-accent transition-colors px-3 py-1.5 border border-[rgba(94,23,235,0.3)] rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Sign out of your account">
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-xs text-fg-muted hover:text-accent transition-colors px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent rounded"
                    aria-label="Login to your account">
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="btn-glow-cyan text-xs bg-transparent border border-accent text-accent px-4 py-1.5 rounded-full font-bold uppercase tracking-wider hover:bg-accent hover:text-bg-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Join dBaronX — create an account">
                    Join Free
                  </Link>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="xl:hidden p-2 text-fg-muted hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-lg"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu">
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div
          id="mobile-menu"
          className="xl:hidden bg-[#050510]/98 backdrop-blur-xl border-b border-[rgba(94,23,235,0.2)] px-4 py-4"
          role="navigation"
          aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {/* Primary links */}
            <p className="text-[10px] font-mono text-fg-muted uppercase tracking-widest px-4 py-1 mt-1">Main</p>
            {primaryNavLinks?.map((item) => (
              <Link
                key={item?.label}
                href={item?.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent ${
                  pathname === item?.href
                    ? "text-accent bg-accent/10 border border-accent/20" :"text-fg-base hover:text-accent hover:bg-accent/5"
                }`}
                aria-current={pathname === item?.href ? "page" : undefined}>
                {item?.label}
              </Link>
            ))}
            {/* Secondary links */}
            <p className="text-[10px] font-mono text-fg-muted uppercase tracking-widest px-4 py-1 mt-2">Explore</p>
            {secondaryNavLinks?.map((item) => (
              <Link
                key={item?.label}
                href={item?.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent flex items-center justify-between ${
                  pathname === item?.href
                    ? "text-accent bg-accent/10 border border-accent/20" :"text-fg-muted hover:text-accent hover:bg-accent/5"
                }`}
                aria-current={pathname === item?.href ? "page" : undefined}>
                {item?.label}
                {item?.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(94,23,235,0.3)] text-[#C084FC]">
                    {item?.badge}
                  </span>
                )}
              </Link>
            ))}
            <Link
              href="/id-card"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3 rounded-lg text-sm font-medium text-[#C084FC] hover:text-accent hover:bg-accent/5 transition-all focus:outline-none focus:ring-2 focus:ring-accent">
              💎 Premium ID Card
            </Link>
            {user && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-fg-muted hover:text-accent hover:bg-accent/5 transition-all focus:outline-none focus:ring-2 focus:ring-accent">
                  Admin Panel
                </Link>
                <Link
                  href="/admin/dreams"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-fg-muted hover:text-accent hover:bg-accent/5 transition-all focus:outline-none focus:ring-2 focus:ring-accent">
                  💫 Dreams Admin
                </Link>
              </>
            )}
            <div className="px-4 py-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
