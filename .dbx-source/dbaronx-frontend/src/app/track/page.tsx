'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DeliveryJob {
  id: string;
  tracking_code: string;
  status: string;
  pickup_location: string;
  delivery_location: Record<string, unknown>;
  estimated_time_minutes: number | null;
  carbon_offset_kg: number;
  created_at: string;
  updated_at: string;
}

const STATUS_STEPS = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Pending',
  assigned: '🚲 Driver Assigned',
  picked_up: '📦 Picked Up',
  in_transit: '🚀 In Transit',
  delivered: '✅ Delivered',
  cancelled: '❌ Cancelled',
};

export default function TrackDeliveryPage() {
  const [trackingCode, setTrackingCode] = useState('');
  const [delivery, setDelivery] = useState<DeliveryJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myDeliveries, setMyDeliveries] = useState<DeliveryJob[]>([]);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (user) fetchMyDeliveries();
  }, [user]);

  const fetchMyDeliveries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('delivery_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setMyDeliveries(data);
  };

  const trackDelivery = async () => {
    if (!trackingCode.trim()) return;
    setLoading(true);
    setError('');
    setDelivery(null);
    try {
      const res = await fetch(`/api/delivery/assign?code=${trackingCode.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not found');
      setDelivery(data.delivery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delivery not found');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = delivery ? STATUS_STEPS.indexOf(delivery.status) : -1;

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <span className="tag-badge-green mb-4 inline-block">Real-Time Tracking</span>
            <h1 className="text-4xl font-bold gradient-text-purple mb-2">Track My Delivery</h1>
            <p className="text-fg-muted text-sm">Farm → Door. Enter your tracking code below.</p>
          </div>

          {/* Search */}
          <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-6 mb-6">
            <div className="flex gap-3">
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && trackDelivery()}
                placeholder="e.g. DBX-ABC123"
                className="flex-1 bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-fg-base text-sm focus:outline-none focus:border-accent font-mono"
              />
              <button
                onClick={trackDelivery}
                disabled={loading}
                className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {loading ? '...' : 'Track'}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          {/* Delivery Status */}
          {delivery && (
            <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-fg-muted">Tracking Code</p>
                  <p className="font-mono font-bold text-accent">{delivery.tracking_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-fg-muted">Carbon Offset</p>
                  <p className="text-eco-green font-bold text-sm">🌱 {delivery.carbon_offset_kg} kg CO₂</p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="relative mb-6">
                <div className="flex justify-between items-center">
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          i <= currentStepIndex
                            ? 'bg-eco-green border-eco-green text-white' :'bg-bg-base border-[rgba(94,23,235,0.3)] text-fg-muted'
                        }`}
                      >
                        {i < currentStepIndex ? '✓' : i + 1}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`absolute h-0.5 transition-all`}
                          style={{
                            left: `${(i / (STATUS_STEPS.length - 1)) * 100}%`,
                            width: `${100 / (STATUS_STEPS.length - 1)}%`,
                            top: '16px',
                            backgroundColor: i < currentStepIndex ? '#22c55e' : 'rgba(94,23,235,0.2)',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {STATUS_STEPS.map((step) => (
                    <p key={step} className="text-xs text-fg-muted text-center flex-1 capitalize">{step.replace('_', ' ')}</p>
                  ))}
                </div>
              </div>

              <div className="bg-bg-base rounded-xl p-4 border border-[rgba(94,23,235,0.15)]">
                <p className="text-lg font-bold text-fg-base mb-1">{STATUS_LABELS[delivery.status] || delivery.status}</p>
                <p className="text-xs text-fg-muted">Pickup: {delivery.pickup_location}</p>
                {delivery.estimated_time_minutes && (
                  <p className="text-xs text-accent mt-1">⏱ Est. {delivery.estimated_time_minutes} min remaining</p>
                )}
              </div>

              {/* QR Code */}
              <div className="flex justify-center mt-4">
                <div className="bg-white p-2 rounded-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://dbaronx.com/track/${delivery.tracking_code}`)}&size=120x120`}
                    alt={`QR code for tracking ${delivery.tracking_code}`}
                    width={120}
                    height={120}
                  />
                </div>
              </div>
            </div>
          )}

          {/* My Deliveries */}
          {user && myDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-fg-base mb-4">My Recent Deliveries</h2>
              <div className="space-y-3">
                {myDeliveries.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setTrackingCode(d.tracking_code); setDelivery(d); }}
                    className="w-full text-left bg-bg-card rounded-xl border border-[rgba(94,23,235,0.2)] p-4 hover:border-accent/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-accent text-sm">{d.tracking_code}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'delivered' ? 'bg-eco-green/20 text-eco-green' : 'bg-accent/20 text-accent'}`}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted mt-1">{new Date(d.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
