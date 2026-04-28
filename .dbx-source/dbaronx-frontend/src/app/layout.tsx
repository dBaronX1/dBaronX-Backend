"use client";

import React, { useEffect, useState } from 'react';
import '../styles/tailwind.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import AccessibilityBar from '@/components/AccessibilityBar';
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPopup(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  const SCHEMA_ORG = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "dBaronX Ltd",
    "url": "https://dbaronx.com",
    "logo": "https://img.rocket.new/generatedImages/rocket_gen_img_166c89281-1766491408448.png",
  };

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityBar />
            {children}
            <Toaster />

            {showPopup && (
              <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999
              }}>
                <div style={{ background: "#fff", padding: 20 }}>
                  <a
                    href="https://forms.zoho.com/infodba1/form/dBaronXPrivateSaleCommitment"
                    target="_blank"
                    style={{
                      display: "block",
                      background: "#5E17EB",
                      color: "#fff",
                      padding: "10px 20px",
                      textAlign: "center"
                    }}
                  >
                    Open Presale Form
                  </a>
                  <button
                    onClick={() => setShowPopup(false)}
                    style={{ marginTop: 10 }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <Script
              id="schema-org"
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_ORG) }}
            />
          </LanguageProvider>
        </AuthProvider>

<script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fdbaronx8001back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.18" />
<script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}