import { useEffect, useState } from 'react';
import { apiGet } from '../api';

const FALLBACK = [
  { label: 'Orders today', value: '—' },
  { label: 'Pending pack', value: '—' },
  { label: 'Out for delivery', value: '—' },
  { label: 'Low stock SKUs', value: '—' },
];

export function DashboardPage() {
  const [stats, setStats] = useState(FALLBACK);
  const [source, setSource] = useState('Connecting to API…');

  useEffect(() => {
    apiGet<{
      stats: {
        ordersToday: number;
        pendingPack: number;
        outForDelivery: number;
        lowStockSkus: number;
      };
    }>('/api/v1/admin/stats')
      .then((res) => {
        setStats([
          { label: 'Orders today', value: String(res.stats.ordersToday) },
          { label: 'Pending pack', value: String(res.stats.pendingPack) },
          { label: 'Out for delivery', value: String(res.stats.outForDelivery) },
          { label: 'Low stock SKUs', value: String(res.stats.lowStockSkus) },
        ]);
        setSource('Live from PostgreSQL');
      })
      .catch(() => setSource('API offline — start the backend on port 4000'));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="lede">{source}</p>
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
