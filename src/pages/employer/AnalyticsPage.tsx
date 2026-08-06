import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Briefcase, Users, CheckCircle2, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getEmployerAnalytics } from '@/lib/api';
import type { EmployerAnalytics } from '@/lib/api';
import { Spinner, EmptyState } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const SCORE_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

export function AnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<EmployerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      try { setData(await getEmployerAnalytics(days)); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [profile, days]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const funnel = data?.funnel || { applied: 0, shortlisted: 0, hired: 0, rejected: 0 };
  const totalApps = Object.values(funnel).reduce((s, v) => s + v, 0);
  const activeJobs = data?.per_posting.filter(p => p.status === 'active').length || 0;
  const funnelData = [
    { label: 'Applied', value: funnel.applied || 0, color: '#06b6d4' },
    { label: 'Shortlisted', value: funnel.shortlisted || 0, color: '#f59e0b' },
    { label: 'Hired', value: funnel.hired || 0, color: '#10b981' },
    { label: 'Rejected', value: funnel.rejected || 0, color: '#ef4444' },
  ];

  const statIcons: Record<string, string> = {
    'Active Postings': 'bg-cyan-500/20 text-cyan-400',
    'Total Applications': 'bg-violet-500/20 text-violet-400',
    'Time to Fill': 'bg-amber-500/20 text-amber-400',
    'Avg / Posting': 'bg-emerald-500/20 text-emerald-400',
  };

  function exportVolumeCSV() {
    if (!data || data.volume_over_time.length === 0) { alert('No data to export.'); return; }
    const rows = data.volume_over_time.map(p => `${p.date},${p.count}`).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(`data:text/csv;charset=utf-8,date,applications\n${rows}`));
    link.setAttribute('download', `synapse_analytics_${days}d_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400">Hiring insights and application metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-700/50 bg-slate-800/50 p-0.5">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${days === d ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>{d}d</button>
            ))}
          </div>
          {data && data.volume_over_time.length > 0 && (
            <button onClick={exportVolumeCSV} className="btn-secondary flex items-center gap-2 text-xs"><Download className="h-3.5 w-3.5" /> CSV</button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Postings', value: activeJobs, icon: Briefcase },
          { label: 'Total Applications', value: totalApps, icon: Users },
          { label: 'Time to Fill', value: data?.time_to_fill_days != null ? `${data.time_to_fill_days}d` : '—', icon: TrendingUp },
          { label: 'Avg / Posting', value: data?.avg_applicants_per_posting ?? 0, icon: CheckCircle2 },
        ].map((stat) => (
          <GlassmorphicCard key={stat.label} className="p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${statIcons[stat.label]}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-3xl font-bold font-mono text-white">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </GlassmorphicCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassmorphicCard className="p-6">
          <h3 className="text-base font-semibold text-white">Application Volume</h3>
          {!data || data.volume_over_time.length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No volume yet" description="Applications per day will appear here." />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.volume_over_time} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#volGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassmorphicCard>

        <GlassmorphicCard className="p-6">
          <h3 className="text-base font-semibold text-white">Match Score Distribution</h3>
          {!data || data.score_distribution.every(s => s.count === 0) ? (
            <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No scores yet" description="Scores appear once applicants have match scores." />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.score_distribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.score_distribution.map((_, i) => <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassmorphicCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassmorphicCard className="p-6">
          <h3 className="text-base font-semibold text-white">Hiring Funnel</h3>
          {totalApps === 0 ? (
            <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No data" description="The funnel appears once you have applicants." />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                    {funnelData.map((f, i) => <Cell key={i} fill={f.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassmorphicCard>

        <GlassmorphicCard className="p-6">
          <h3 className="text-base font-semibold text-white">Applications per Job</h3>
          {!data || data.per_posting.length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No data yet" description="Applications will appear here once candidates start applying to your postings." />
          ) : (
            <div className="mt-4 space-y-3">
              {data.per_posting.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm"><span className="text-slate-300 truncate pr-2">{item.title}</span><span className="font-medium text-white">{item.count}</span></div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${(item.count / Math.max(...data.per_posting.map(p => p.count), 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassmorphicCard>
      </div>
    </div>
  );
}
