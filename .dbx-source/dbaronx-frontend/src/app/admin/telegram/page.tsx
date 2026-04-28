'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface TelegramLog {
  id: string;
  type: string;
  chat_id: string;
  message: string;
  status: string;
  sent_at: string;
}

export default function TelegramAdminPage() {
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('telegram_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);
      if (error) { console.error('Telegram logs error:', error.message); return; }
      setLogs(data || []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.type === filter);
  const types = ['all', ...Array.from(new Set(logs.map((l) => l.type)))];

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="py-8">
            <h1 className="text-3xl font-bold gradient-text-purple mb-2">Telegram Bot Admin</h1>
            <p className="text-fg-muted text-sm">Monitor all bot interactions and notifications.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Logs', value: logs.length },
              { label: 'Bot Replies', value: logs.filter((l) => l.type === 'bot_reply').length },
              { label: 'Story Created', value: logs.filter((l) => l.type === 'ai_story_created').length },
              { label: 'Other', value: logs.filter((l) => !['bot_reply', 'ai_story_created'].includes(l.type)).length },
            ].map((stat) => (
              <div key={stat.label} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-4 text-center">
                <p className="text-2xl font-bold text-accent">{stat.value}</p>
                <p className="text-xs text-fg-muted mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                  filter === t
                    ? 'bg-accent text-bg-base' :'bg-bg-card border border-[rgba(94,23,235,0.2)] text-fg-muted hover:border-accent/40'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={fetchLogs}
              className="ml-auto px-4 py-1.5 rounded-full text-xs font-medium bg-eco-green/20 border border-eco-green/30 text-eco-green hover:bg-eco-green/30 transition-all"
            >
              ↻ Refresh
            </button>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-bg-card rounded-xl h-16 animate-pulse border border-[rgba(94,23,235,0.1)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-12 text-center">
              <p className="text-fg-muted">No logs found.</p>
            </div>
          ) : (
            <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(94,23,235,0.2)]">
                      <th className="text-left px-4 py-3 text-fg-muted font-medium">Type</th>
                      <th className="text-left px-4 py-3 text-fg-muted font-medium">Chat ID</th>
                      <th className="text-left px-4 py-3 text-fg-muted font-medium">Message</th>
                      <th className="text-left px-4 py-3 text-fg-muted font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-fg-muted font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log) => (
                      <tr key={log.id} className="border-b border-[rgba(94,23,235,0.1)] hover:bg-bg-base/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="tag-badge text-xs capitalize">{log.type}</span>
                        </td>
                        <td className="px-4 py-3 text-fg-muted font-mono text-xs">{log.chat_id || '—'}</td>
                        <td className="px-4 py-3 text-fg-base max-w-xs truncate">{log.message}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'sent' ? 'bg-eco-green/20 text-eco-green' : 'bg-yellow-400/20 text-yellow-400'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-fg-muted text-xs">
                          {new Date(log.sent_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
