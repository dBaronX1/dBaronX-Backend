"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface AdVideo {
  id: number;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  reward_amount: number;
  min_watch_seconds: number;
}

export default function WatchEarnPage() {
  const { user } = useAuth();
  const [ads, setAds] = useState<AdVideo[]>([]);
  const [currentAd, setCurrentAd] = useState<AdVideo | null>(null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [minReached, setMinReached] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPresalePopup, setShowPresalePopup] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captchaRef = useRef<any>(null);

  // Load ads from your unified FastAPI (no direct Supabase)
  useEffect(() => {
    const loadAds = async () => {
      try {
        const res = await fetch("https://dbaronx-fastapi.onrender.com/ads", {
          headers: {
            "telegram_id": user?.telegram_id || "",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setAds(data);
        }
      } catch (err) {
        setError("Failed to load available ads");
      }
    };

    if (user) loadAds();
  }, [user]);

  // Auto-show Zoho presale form popup after 6 seconds (internal ecosystem)
  useEffect(() => {
    const timer = setTimeout(() => setShowPresalePopup(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = Math.floor(videoRef.current.currentTime);
    setWatchedSeconds(current);

    if (current >= (currentAd?.min_watch_seconds || 30)) {
      setMinReached(true);
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const confirmWatch = async () => {
    if (!currentAd || !captchaToken || !minReached) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("https://dbaronx-fastapi.onrender.com/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "telegram_id": user?.telegram_id || "",
        },
        body: JSON.stringify({
          ad_id: currentAd.id,
          captcha_token: captchaToken,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setConfirmed(true);
        setAds((prev) => prev.filter((a) => a.id !== currentAd.id));
        setCurrentAd(null);
        setWatchedSeconds(0);
        setMinReached(false);
        setCaptchaToken(null);
      } else {
        setError(data.detail || "Failed to claim reward");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />

      <main className="pt-20 pb-20 max-w-7xl mx-auto px-4">
        <div className="text-center py-12">
          <h1 className="text-5xl font-bold mb-4">Watch & Earn</h1>
          <p className="text-xl text-fg-muted">
            Watch ads • Confirm with hCaptcha • Earn real rewards instantly
          </p>
          <p className="text-sm mt-2 text-green-500">
            60% of advertiser daily budget distributed to users • Higher tiers get priority access
          </p>
        </div>

        {/* Ads Grid */}
        <div className="grid md:grid-cols-3 gap-6">{ads.map((ad) => (
            <div key={ad.id} className="bg-bg-card rounded-3xl overflow-hidden border border-accent/20">
              <img 
                src={ad.thumbnail_url || "/placeholder-ad.jpg"} 
                alt={ad.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-5">
                <h3 className="font-bold mb-2">{ad.title}</h3>
                <p className="text-sm text-fg-muted mb-4">
                  Reward: ${ad.reward_amount} • Min watch: {ad.min_watch_seconds}s
                </p>
                <button
                  onClick={() => {
                    setCurrentAd(ad);
                    setWatchedSeconds(0);
                    setMinReached(false);
                    setCaptchaToken(null);
                    setConfirmed(false);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-2xl font-medium"
                >
                  Watch & Earn
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* VIDEO + VERIFICATION MODAL */}
      {currentAd && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-3xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">{currentAd.title}</h2>

            <video
              ref={videoRef}
              src={currentAd.video_url}
              controls
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              className="w-full rounded-2xl mb-4"
            />

            <div className="text-center mb-6">
              <p className="text-sm">
                Watched: <span className="font-mono">{watchedSeconds}s</span> / 
                <span className="font-mono"> {currentAd.min_watch_seconds}s</span> required
              </p>
            </div>

            {/* Real hCaptcha */}
            {minReached && !captchaToken && (
              <div className="my-6 flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey="a2a82348-57d6-4346-881c-7752cfd029ee"
                  onVerify={handleCaptchaVerify}
                />
              </div>
            )}

            <button
              onClick={confirmWatch}
              disabled={!minReached || !captchaToken || loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-4 rounded-2xl font-bold text-lg disabled:cursor-not-allowed"
            >
              {loading ? "Processing Reward..." : "✅ Confirm Watch & Claim Reward"}
            </button>

            {error && <p className="text-red-500 text-center mt-3">{error}</p>}
            {confirmed && <p className="text-green-500 text-center mt-3">Reward claimed successfully!</p>}

            <button
              onClick={() => setCurrentAd(null)}
              className="mt-4 w-full text-fg-muted underline"
            >
              Close Video
            </button>
          </div>
        </div>
      )}

      {/* ZOHO PRESALE COMMITMENT POPUP – INTERNAL ECOSYSTEM ONLY */}
      {showPresalePopup && (
        <div className="fixed bottom-6 right-6 bg-bg-card p-6 rounded-3xl border border-accent/20 shadow-2xl max-w-sm z-50">
          <h3 className="font-bold text-lg mb-3">Join DBX Token Presale</h3>
          <p className="text-sm text-fg-muted mb-4">
            Be part of the ecosystem. Limited supply. Early commitment benefits.
          </p>
          
          {/* Zoho Form Embedded – No external redirect */}
          <iframe
            src="https://forms.zohopublic.com/your-zoho-form-link"
            width="100%"
            height="380"
            frameBorder="0"
            className="rounded-2xl"
          />
          <button
            onClick={() => setShowPresalePopup(false)}
            className="mt-4 w-full text-sm text-fg-muted underline"
          >
            Close
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}