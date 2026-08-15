import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBooking } from '../api';

function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBooking(id).then(b => { setBooking(b); setLoading(false); }); }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!booking) return <div className="empty-state"><h3>Booking not found</h3><Link to="/bookings" className="btn btn-primary">Back</Link></div>;

  return (
    <div>
      <Link to="/bookings" className="btn btn-secondary" style={{ marginBottom: 16 }}>← Back</Link>
      <div className="detail-grid">
        <div className="detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
            <div><h2>Booking #{booking.id}</h2><p style={{ color: 'var(--text-light)' }}>{new Date(booking.created_at).toLocaleString()}</p></div>
            <span className={`badge ${booking.status === 'completed' ? 'badge-delivered' : booking.status === 'cancelled' ? 'badge-cancelled' : booking.status === 'confirmed' ? 'badge-active' : 'badge-pending'}`}>{booking.status}</span>
          </div>
          <div className="detail-row"><span className="detail-label">Passenger</span><span>{booking.passenger_name}</span></div>
          <div className="detail-row"><span className="detail-label">Email</span><span>{booking.passenger_email}</span></div>
          <div className="detail-row"><span className="detail-label">Phone</span><span>{booking.passenger_phone}</span></div>
          <div className="detail-row"><span className="detail-label">Seats</span><span>{booking.seats}</span></div>
          <div className="detail-row"><span className="detail-label">Total Fare</span><span className="price">${booking.total_fare}</span></div>
        </div>
      </div>
    </div>
  );
}
export default BookingDetailPage;
