'use client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface TracePageProps {
  params: { id: string };
}

export default function TracePage({ params }: TracePageProps) {
  const traceUrl = `https://dbaronx.com/trace/${params.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(traceUrl)}&size=200x200`;

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="mb-8">
            <span className="tag-badge mb-4 inline-block">On-Chain Verified</span>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text-purple mb-4">
              Traceability Verified on Solana
            </h1>
            <p className="text-fg-muted">
              This pledge has been recorded on the Solana blockchain for full transparency and carbon traceability.
            </p>
          </div>

          <div className="bg-bg-card rounded-3xl border border-[rgba(94,23,235,0.2)] p-10 mb-8">
            <div className="mb-6">
              <p className="text-xs text-fg-muted mb-1">Pledge Reference</p>
              <p className="font-mono text-accent text-sm break-all">{params.id}</p>
            </div>

            <div className="flex justify-center mb-6">
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <img
                  src={qrUrl}
                  alt={`QR code for pledge traceability ${params.id}`}
                  width={200}
                  height={200}
                  className="rounded-xl"
                />
              </div>
            </div>

            <p className="text-xs text-fg-muted mb-6">Scan QR to verify on-chain</p>

            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: '🌱', label: 'CO₂ Offset', value: 'Verified' },
                { icon: '🔗', label: 'Blockchain', value: 'Solana' },
                { icon: '✅', label: 'Status', value: 'Confirmed' },
              ].map((item) => (
                <div key={item.label} className="bg-bg-base rounded-xl p-3 border border-[rgba(94,23,235,0.15)]">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <p className="text-xs text-fg-muted">{item.label}</p>
                  <p className="text-xs font-bold text-eco-green">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <a
              href="/dreams"
              className="bg-primary/20 border border-primary/40 text-primary px-6 py-3 rounded-xl text-sm font-medium hover:bg-primary hover:text-white transition-all"
            >
              ← Back to Campaigns
            </a>
            <a
              href={`/api/carbon-certificate?pledge_id=${params.id}`}
              className="bg-eco-green/20 border border-eco-green/30 text-eco-green px-6 py-3 rounded-xl text-sm font-medium hover:bg-eco-green/30 transition-all"
            >
              📄 Download Certificate
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
