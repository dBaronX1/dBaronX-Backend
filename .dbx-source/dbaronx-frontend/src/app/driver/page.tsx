'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface DeliveryJob {
  id: string;
  tracking_code: string;
  status: string;
  pickup_location: string;
  delivery_location: Record<string, unknown>;
  estimated_time_minutes: number | null;
  carbon_offset_kg: number;
  created_at: string;
  order_id: string | null;
}

interface DriverStats {
  total_deliveries: number;
  earnings_dbx: number;
  rating: number;
  availability: boolean;
  vehicle_type: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-400/20 text-yellow-400',
  assigned: 'bg-blue-400/20 text-blue-400',
  picked_up: 'bg-purple-400/20 text-purple-400',
  in_transit: 'bg-accent/20 text-accent',
  delivered: 'bg-eco-green/20 text-eco-green',
  cancelled: 'bg-red-400/20 text-red-400',
};

export default function DriverDashboardPage() {
  const [jobs, setJobs] = useState<DeliveryJob[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        supabase
          .from('delivery_jobs')
          .select('*')
          .eq('driver_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('drivers')
          .select('total_deliveries, earnings_dbx, rating, availability, vehicle_type')
          .eq('id', user.id)
          .single(),
      ]);
      if (jobsRes.data) setJobs(jobsRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (jobId: string, newStatus: string) => {
    setUpdating(jobId);
    try {
      const { error } = await supabase
        .from('delivery_jobs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', jobId);
      if (!error) {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j));
        if (newStatus === 'delivered') fetchData(); // refresh stats
      }
    } finally {
      setUpdating(null);
    }
  };

  const toggleAvailability = async () => {
    if (!user || !stats) return;
    const newAvail = !stats.availability;
    await supabase.from('drivers').update({ availability: newAvail }).eq('id', user.id);
    setStats((prev) => prev ? { ...prev, availability: newAvail } : prev);
  };

  const NEXT_STATUS: Record<string, string> = {
    assigned: 'picked_up',
    picked_up: 'in_transit',
    in_transit: 'delivered',
  };

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="py-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text-purple mb-1">🚀 Driver Portal</h1>
              <p className="text-fg-muted text-sm">Earn DBX per delivery. Farm → Door.</p>
            </div>
            {stats && (
              <button
                onClick={toggleAvailability}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  stats.availability
                    ? 'bg-eco-green/20 border border-eco-green/30 text-eco-green hover:bg-eco-green/30' :'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                }`}
              >
                {stats.availability ? '🟢 Available' : '🔴 Offline'}
              </button>
            )}
          </div>

          {/* Stats */}
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Deliveries', value: stats.total_deliveries, icon: '📦' },
                { label: 'DBX Earned', value: `${stats.earnings_dbx.toFixed(2)} DBX`, icon: '💎' },
                { label: 'Rating', value: `${stats.rating}/5.0 ⭐`, icon: '⭐' },
                { label: 'Vehicle', value: stats.vehicle_type, icon: '🚲' },
              ].map((s) => (
                <div key={s.label} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-4">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-lg font-bold text-fg-base capitalize">{s.value}</p>
                  <p className="text-xs text-fg-muted">{s.label}</p>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="bg-bg-card rounded-2xl border border-yellow-400/20 p-6 mb-8">
              <p className="text-yellow-400 text-sm">⚠️ You are not registered as a driver yet. Contact admin to get started.</p>
            </div>
          )}

          {/* Active Jobs */}
          <h2 className="text-xl font-bold text-fg-base mb-4">My Delivery Jobs</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse border border-[rgba(94,23,235,0.1)]" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-12 text-center">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-fg-muted">No delivery jobs assigned yet.</p>
              <p className="text-xs text-fg-muted mt-1">Make sure you are set to Available above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-accent">{job.tracking_code}</p>
                      <p className="text-xs text-fg-muted mt-0.5">{new Date(job.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[job.status] || 'bg-fg-muted/20 text-fg-muted'}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="bg-bg-base rounded-lg p-2 border border-[rgba(94,23,235,0.1)]">
                      <p className="text-fg-muted">Pickup</p>
                      <p className="text-fg-base font-medium">{job.pickup_location}</p>
                    </div>
                    <div className="bg-bg-base rounded-lg p-2 border border-[rgba(94,23,235,0.1)]">
                      <p className="text-fg-muted">Carbon Offset</p>
                      <p className="text-eco-green font-medium">🌱 {job.carbon_offset_kg} kg CO₂</p>
                    </div>
                  </div>

                  {NEXT_STATUS[job.status] && (
                    <button
                      onClick={() => updateStatus(job.id, NEXT_STATUS[job.status])}
                      disabled={updating === job.id}
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 capitalize"
                    >
                      {updating === job.id ? 'Updating...' : `Mark as ${NEXT_STATUS[job.status].replace('_', ' ')} →`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
