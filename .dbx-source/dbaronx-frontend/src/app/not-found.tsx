'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-base circuit-bg p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <h1 className="text-9xl font-bold text-primary opacity-20">404</h1>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-fg-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist. Let&apos;s get you back!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router?.back()}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-light transition-colors"
          >
            ← Go Back
          </button>
          <Link
            href="/home"
            className="inline-flex items-center justify-center gap-2 border border-[rgba(94,23,235,0.3)] text-fg-muted px-6 py-3 rounded-xl font-medium hover:text-accent hover:border-accent/40 transition-colors"
          >
            🏠 Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}