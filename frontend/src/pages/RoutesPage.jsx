import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRoutes } from '../api';

function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRoutes().then(data => { setRoutes(Array.isArray(data) ? data : data?.results || []); setLoading(false); }); }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header"><div><h1>🛣️ Routes</h1><p>{routes.length} route{routes.length !== 1 ? 's' : ''}</p></div><Link to="/schedules" className="btn btn-primary">View Schedule</Link></div>
      <div className="grid grid-2">
        {routes.map(r => (
          <Link to={`/routes/${r.id}`} key={r.id} className="card" style={{ textDecoration: 'none' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 className="card-title">{r.name}</h3>
                <span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '1.1rem' }}>
                <span style={{ background: '#dbeafe', padding: '4px 10px', borderRadius: 8 }}>📍 {r.start_location}</span>
                <span>→</span>
                <span style={{ background: '#dbeafe', padding: '4px 10px', borderRadius: 8 }}>📍 {r.end_location}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, color: 'var(--text-light)', fontSize: '0.9rem' }}>
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
export default RoutesPage;
