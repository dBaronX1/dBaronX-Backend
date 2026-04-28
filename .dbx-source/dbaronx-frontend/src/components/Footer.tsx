"use client";
import React from "react";
import AppImage from "@/components/ui/AppImage";
import Link from "next/link";

const socialLinks = [
{
  name: "YouTube",
  href: "https://youtube.com/@dbaronx_official?si=le0m4708zPagEUPD",
  icon:
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>,

  accent: "#FF0000"
},
{
  name: "Telegram",
  href: "https://t.me/dBaronX_DBX_Token",
  icon:
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>,

  accent: "#00F0FF"
},
{
  name: "X (Twitter)",
  href: "https://x.com/dbaronx_eco",
  icon:
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>,

  accent: "#C084FC"
},
{
  name: "TikTok",
  href: "https://www.tiktok.com/@dbaronx_official?_r=1&_t=ZS-94nfG7lU2QX",
  icon:
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>,

  accent: "#00F0FF"
},
{
  name: "Facebook",
  href: "https://www.facebook.com/profile.php?id=61579460884968",
  icon:
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>,

  accent: "#5E17EB"
},
{
  name: "Instagram",
  href: "https://www.instagram.com/dbaronx_official?igsh=bzh1NXNoMXd4YjB3",
  icon:
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>,

  accent: "#C084FC"
},
{
  name: "Snapchat",
  href: "https://www.snapchat.com/add/dbaronx?share_id=1Dv1XURkDlw&locale=en-US",
  icon:
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
      </svg>,

  accent: "#F59E0B"
}];


const navLinks = [
{ label: "Shop", href: "/products" },
{ label: "AI Stories", href: "/ai-stories" },
{ label: "Watch & Earn", href: "/watch-earn" },
{ label: "Affiliates", href: "/affiliates" },
{ label: "Dreams", href: "/dreams" },
{ label: "DBX Token", href: "/dbx-token" },
{ label: "Pricing", href: "/pricing" },
{ label: "Dashboard", href: "/dashboard" },
{ label: "ID Card", href: "/id-card" },
{ label: "Join", href: "/join" },
];


export default function Footer() {
  return (
    <footer className="border-t border-[rgba(94,23,235,0.15)] bg-[#050510]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="logo-glow rounded-full w-10 h-10 overflow-hidden flex-shrink-0">
                <AppImage
                  src="https://img.rocket.new/generatedImages/rocket_gen_img_1da063d60-1774722137373.png"
                  alt="dBaronX DBX token logo — official circular glowing purple with circuit background and green laurels"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-full" />
                
              </div>
              <span className="font-bold text-xl tracking-tight gradient-text-purple">
                dBaronX
              </span>
            </div>
            <p className="text-fg-muted text-sm max-w-xs leading-relaxed">
              Powering sustainable commerce on Solana.
              <br />
              <span className="text-[#4ADE80] text-xs font-mono">Global dBaronX Ecosystem</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {socialLinks?.map((link) =>
            <a
              key={link?.name}
              href={link?.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link?.name}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={{
                background: `${link?.accent}15`,
                border: `1px solid ${link?.accent}30`,
                color: link?.accent
              }}>
              
                {link?.icon}
              </a>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-fg-muted" role="navigation" aria-label="Footer navigation">
          <a
            href="https://solscan.io/token/4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
            aria-label="View DBX token on Solscan">
            
            Solscan
          </a>
          {navLinks?.map((link) =>
          <Link key={link?.label} href={link?.href} className="hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded">
              {link?.label}
            </Link>
          )}
          <a href="mailto:info@dbaronx.com" className="hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded" aria-label="Contact dBaronX by email">
            Contact
          </a>
        </div>

        <div className="neon-line my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-fg-muted">
          <span>© 2026 dBaronX Ltd – Global Eco-Commerce. Dubai Freezone · Ghana Operations. All rights reserved.</span>
          <div className="flex gap-6">
            <span className="hover:text-accent transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-accent transition-colors cursor-pointer">Terms</span>
            <a href="/api/bot?action=menu" className="hover:text-accent transition-colors" aria-label="Telegram Bot API">Bot API</a>
          </div>
        </div>
      </div>
    </footer>);

}