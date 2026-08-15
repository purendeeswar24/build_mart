const STATS = [
  { label: 'Orders today', value: '48' },
  { label: 'Pending pack', value: '12' },
  { label: 'Out for delivery', value: '9' },
  { label: 'Low stock SKUs', value: '6' },
];

export function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="lede">Phase 7 scaffold — wire to Supabase orders next.</p>
      <div className="stat-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
