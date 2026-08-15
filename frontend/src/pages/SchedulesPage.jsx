import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSchedules, fetchRoutes, fetchBuses } from '../api';

function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRoute, setFilterRoute] = useState('');

  useEffect(() => {
    Promise.all([fetchSchedules({}).catch(() => []), fetchRoutes().catch(() => []), fetchBuses().catch(() => [])]).then(([s, r, b]) => {
      setSchedules(Array.isArray(s) ? s : s?.results || []); setRoutes(Array.isArray(r) ? r : r?.results || []); setBuses(Array.isArray(b) ? b : b?.results || []); setLoading(false);
    });
  }, []);

  const routeMap = Object.fromEntries(routes.map(r => [r.id, r]));
  const busMap = Object.fromEntries(buses.map(b => [b.id, b]));
  const filtered = filterRoute ? schedules.filter(s => s.route === parseInt(filterRoute)) : schedules;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header"><div><h1>🕐 Schedule</h1><p>{filtered.length} trip{filtered.length !== 1 ? 's' : ''}</p></div><Link to="/book" className="btn btn-primary">Book Now</Link></div>
      <div className="filters"><select className="form-select" value={filterRoute} onChange={e => setFilterRoute(e.target.value)}>
        <option value="">All Routes</option>
        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select></div>
      {filtered.length === 0 ? <div className="empty-state"><h3>No schedules found</h3></div> : (
        <div className="grid grid-2">{filtered.map(s => (
          <div key={s.id} className="card"><div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="card-title">{routeMap[s.route]?.name || `Route #${s.route}`}</h3>
              <span className="price">${routeMap[s.route]?.fare || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', color: 'var(--text-light)' }}>
              <span>🕐 {new Date(s.departure_time).toLocaleString()}</span>
              <span>🚌 {busMap[s.bus]?.bus_number || `Bus #${s.bus}`}</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${s.available_seats > 5 ? 'badge-active' : s.available_seats > 0 ? 'badge-pending' : 'badge-cancelled'}`}>
                {s.available_seats} seats left
              </span>
              <Link to="/book" className="btn btn-primary btn-sm">Book</Link>
            </div>
          </div></div>
        ))}</div>
      )}
    </div>
  );
}
export default SchedulesPage;
