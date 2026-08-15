import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchBookings } from '../api';

function BookingsListPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchBookings({}).then(data => { setBookings(Array.isArray(data) ? data : data?.results || []); setLoading(false); }); }, []);

  const filtered = filter ? bookings.filter(b => b.status === filter) : bookings;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header"><div><h1>📋 My Bookings</h1><p>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p></div><Link to="/book" className="btn btn-primary">Book Now</Link></div>
      <div className="filters"><select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="">All</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
      </select></div>
      {filtered.length === 0 ? <div className="empty-state"><h3>No bookings yet</h3><Link to="/book" className="btn btn-primary">Book a Ride</Link></div> : (
        <div className="grid grid-2">{filtered.map(b => <Link to={`/bookings/${b.id}`} key={b.id} className="card" style={{ textDecoration: 'none' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
              <div><h3 className="card-title">Booking #{b.id}</h3><p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{b.passenger_name}</p></div>
              <span className={`badge ${b.status === 'completed' ? 'badge-delivered' : b.status === 'cancelled' ? 'badge-cancelled' : b.status === 'confirmed' ? 'badge-active' : 'badge-pending'}`}>{b.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>🚌 {b.seats} seat{b.seats > 1 ? 's' : ''}</span>
              <span className="price">${b.total_fare}</span>
            </div>
          </div>
        </Link>)}</div>
      )}
    </div>
  );
}
export default BookingsListPage;
