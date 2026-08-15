import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboard, fetchRoutes, fetchBookings, fetchBuses } from '../api';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboard().catch(() => null), fetchRoutes().catch(() => []), fetchBookings({}).catch(() => []), fetchBuses().catch(() => [])])
      .then(([dash, r, b, bus]) => { if (dash) setStats(dash); setRoutes(Array.isArray(r) ? r : r?.results || []); setBookings(Array.isArray(b) ? b : b?.results || []); setBuses(Array.isArray(bus) ? bus : bus?.results || []); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  return (
    <div>
      <div className="hero" style={{ background: 'linear-gradient(135deg, #0ea5e9, #1d4ed8)' }}><h1>📊 Dashboard</h1><p>Transport operations overview</p></div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>🚌</div><div className="stat-value">{buses.length}</div><div className="stat-label">Buses</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>🛣️</div><div className="stat-value">{routes.length}</div><div className="stat-label">Routes</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fae8ff', color: '#6b21a8' }}>📋</div><div className="stat-value">{bookings.length}</div><div className="stat-label">Bookings</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}>✅</div><div className="stat-value">{bookings.filter(b => b.status === 'completed').length}</div><div className="stat-label">Completed</div></div>
      </div>
    </div>
  );
}
export default DashboardPage;
