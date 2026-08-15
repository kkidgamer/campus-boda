import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchRoute, fetchStops, fetchSchedules } from '../api';

function RouteDetailPage() {
  const { id } = useParams();
  const [route, setRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchRoute(id), fetchStops({}).catch(() => []), fetchSchedules({}).catch(() => [])])
      .then(([r, sData, schData]) => {
        setRoute(r);
        const allStops = Array.isArray(sData) ? sData : sData?.results || []; setStops(allStops.filter(s => s.route === parseInt(id)).sort((a, b) => a.order - b.order));
        const allSchedules = Array.isArray(schData) ? schData : schData?.results || []; setSchedules(allSchedules.filter(s => s.route === parseInt(id)));
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!route) return <div className="empty-state"><h3>Route not found</h3></div>;

  return (
    <div>
      <Link to="/routes" className="btn btn-secondary" style={{ marginBottom: 16 }}>← Back</Link>
      <div className="detail-grid">
        <div className="detail-section">
          <h2>{route.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '1.1rem' }}>
            <span style={{ background: '#dbeafe', padding: '6px 14px', borderRadius: 8 }}>📍 {route.start_location}</span>
            <span>→</span>
            <span style={{ background: '#dbeafe', padding: '6px 14px', borderRadius: 8 }}>📍 {route.end_location}</span>
          </div>
          <div className="detail-row"><span className="detail-label">Distance</span><span>{route.distance_km} km</span></div>
          <div className="detail-row"><span className="detail-label">Duration</span><span>{route.duration_minutes} min</span></div>
          <div className="detail-row"><span className="detail-label">Fare</span><span className="price">${route.fare}</span></div>
          {route.description && <p style={{ color: 'var(--text-light)', marginTop: 12 }}>{route.description}</p>}
        </div>
        <div>
          <div className="detail-section"><h2>📍 Stops ({stops.length})</h2>
            {stops.map(s => <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#1e40af' }}>{s.order}</div>
              <div><strong>{s.name}</strong><p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>+{s.estimated_time_from_start} min from start</p></div>
            </div>)}
          </div>
          <div className="detail-section" style={{ marginTop: 16 }}><h2>🚌 Upcoming Trips</h2>
            <Link to="/book" className="btn btn-primary" style={{ width: '100%' }}>Book This Route</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RouteDetailPage;
