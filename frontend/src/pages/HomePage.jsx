import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRoutes, fetchSchedules, fetchDashboard } from '../api';

function HomePage() {
  const [stats, setStats] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboard().catch(() => null), fetchRoutes().catch(() => [])])
      .then(([dash, rData]) => { if (dash) setStats(dash); setRoutes(Array.isArray(rData) ? rData : rData?.results || []); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="hero" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
        <h1>🚌 CampusTransit</h1>
        <p>Campus transport and mobility made easy. Check bus routes, schedules, and book your seat in advance.</p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link to="/routes" className="btn btn-lg" style={{ background: 'white', color: '#0284c7' }}>View Routes</Link>
          <Link to="/book" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>Book Now</Link>
        </div>
      </div>
      {stats && <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>🚌</div><div className="stat-value">{stats.total_buses || 0}</div><div className="stat-label">Buses</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>🛣️</div><div className="stat-value">{routes.length}</div><div className="stat-label">Routes</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}>📋</div><div className="stat-value">{stats.total_bookings || 0}</div><div className="stat-label">Bookings</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fae8ff', color: '#6b21a8' }}>🕐</div><div className="stat-value">{stats.total_schedules || 0}</div><div className="stat-label">Schedules</div></div>
      </div>}
      <div className="page-header"><h2>🚌 Available Routes</h2><Link to="/routes" className="btn btn-primary btn-sm">View All</Link></div>
      <div className="grid grid-2">
        {routes.slice(0, 6).map(r => (
          <Link to={`/routes/${r.id}`} key={r.id} className="card" style={{ textDecoration: 'none' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 className="card-title">{r.name}</h3>
                <span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                <span>📍 {r.start_location}</span>
                <span>→ {r.end_location}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>📏 {r.distance_km} km</span>
                <span>⏱ {r.duration_minutes} min</span>
                <span className="price">${r.fare}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
export default HomePage;
