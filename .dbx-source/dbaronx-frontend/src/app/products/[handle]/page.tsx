"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProductByHandle, type Product } from "@/lib/api";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const handle = params?.handle as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError("");
    getProductByHandle(handle)
      .then((res) => setProduct(res.product))
      .catch(() => setError("Product not found or unavailable."))
      .finally(() => setLoading(false));
  }, [handle]);

  const handleBuyNow = () => {
    if (!product) return;
    const params = new URLSearchParams({
      product_id: product.id,
      product_name: product.name,
      product_handle: product.handle,
      unit_price: String(product.price),
      quantity: String(qty),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] circuit-bg">
        <Header />
        <main className="pt-24 pb-20 max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 animate-pulse">
            <div className="aspect-square bg-[#0D0D2B] rounded-2xl" />
            <div className="space-y-4">
              <div className="h-4 bg-[#0D0D2B] rounded w-1/4" />
              <div className="h-8 bg-[#0D0D2B] rounded w-3/4" />
              <div className="h-4 bg-[#0D0D2B] rounded w-full" />
              <div className="h-4 bg-[#0D0D2B] rounded w-2/3" />
              <div className="h-10 bg-[#0D0D2B] rounded w-1/3 mt-6" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#050510] circuit-bg">
        <Header />
        <main className="pt-24 pb-20 max-w-6xl mx-auto px-4 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
          <p className="text-[#9090BB] mb-6">{error || "This product may have been removed or is temporarily unavailable."}</p>
          <Link href="/products" className="bg-[rgba(94,23,235,0.2)] border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-6 py-3 rounded-full text-sm hover:bg-[rgba(94,23,235,0.3)] transition-colors">
            ← Back to Shop
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="py-6 text-xs text-[#9090BB] flex items-center gap-2">
            <Link href="/home" className="hover:text-[#C084FC] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#C084FC] transition-colors">Shop</Link>
            <span>/</span>
            <span className="text-white truncate max-w-[200px]">{product.name}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
            {/* Images */}
            <div>
              <div className="aspect-square bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl overflow-hidden mb-3">
                {images[selectedImage] ? (
                  <img
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-24 h-24 text-[rgba(94,23,235,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === i ? "border-[#5E17EB]" : "border-[rgba(94,23,235,0.2)] hover:border-[rgba(94,23,235,0.4)]"
                      }`}
                    >
                      <img src={img} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col">
              {product.category && (
                <span className="tag-badge mb-3 self-start">{product.category}</span>
              )}
              <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3">{product.name}</h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-white">${product.price?.toFixed(2)}</span>
                {product.compare_price && product.compare_price > product.price && (
                  <span className="text-lg text-[#9090BB] line-through">${product.compare_price?.toFixed(2)}</span>
                )}
                {discount && (
                  <span className="bg-[#22C55E] text-white text-xs font-bold px-2 py-1 rounded-full">Save {discount}%</span>
                )}
              </div>

              {product.description && (
                <p className="text-[#9090BB] text-sm leading-relaxed mb-6">{product.description}</p>
              )}

              {/* Stock */}
              {product.stock !== undefined && (
                <div className="flex items-center gap-2 mb-5">
                  <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? "bg-[#22C55E]" : "bg-red-500"}`} />
                  <span className="text-xs text-[#9090BB]">
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm text-[#9090BB]">Quantity</span>
                <div className="flex items-center gap-2 bg-[#0D0D2B] border border-[rgba(94,23,235,0.25)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[#9090BB] hover:text-white hover:bg-[rgba(94,23,235,0.1)] transition-colors"
                  >−</button>
                  <span className="w-10 text-center text-white font-semibold text-sm">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-10 h-10 flex items-center justify-center text-[#9090BB] hover:text-white hover:bg-[rgba(94,23,235,0.1)] transition-colors"
                  >+</button>
                </div>
                <span className="text-sm text-[#9090BB]">
                  Total: <span className="text-white font-semibold">${(product.price * qty).toFixed(2)}</span>
                </span>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="flex-1 btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {product.stock === 0 ? "Out of Stock" : "Buy Now →"}
                </button>
                <Link
                  href="/products"
                  className="flex-1 text-center bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white hover:border-[rgba(94,23,235,0.6)] py-4 rounded-full font-semibold text-sm transition-all duration-300"
                >
                  ← Continue Shopping
                </Link>
              </div>

              {/* Trust */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🔒", title: "Secure Payment", desc: "Pay-first protection" },
                  { icon: "📦", title: "Direct Shipping", desc: "Supplier ships to you" },
                  { icon: "✅", title: "Verified Supplier", desc: "Quality guaranteed" },
                  { icon: "💬", title: "Support", desc: "Contact us anytime" },
                ].map((t) => (
                  <div key={t.title} className="flex items-start gap-2 bg-[rgba(94,23,235,0.04)] border border-[rgba(94,23,235,0.1)] rounded-xl p-3">
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">{t.title}</p>
                      <p className="text-[10px] text-[#9090BB]">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-16 bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">How Your Order Works</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: "01", icon: "💳", title: "You Pay", desc: "Secure payment processed first" },
                { step: "02", icon: "✅", title: "We Confirm", desc: "Order verified and approved" },
                { step: "03", icon: "🏭", title: "Supplier Fulfills", desc: "We place order with supplier" },
                { step: "04", icon: "📦", title: "Ships to You", desc: "Direct delivery to your door" },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-[10px] font-mono text-[#5E17EB] mb-1">{s.step}</div>
                  <div className="text-sm font-semibold text-white mb-1">{s.title}</div>
                  <div className="text-xs text-[#9090BB]">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
