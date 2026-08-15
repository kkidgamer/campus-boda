import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRoutes, fetchSchedules, createBooking } from '../api';

function BookingPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ route: '', schedule: '', passenger_name: '', passenger_email: '', passenger_phone: '', seats: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchSchedules({}).catch(() => [])]).then(([rData, sData]) => {
      setRoutes(Array.isArray(rData) ? rData : rData?.results || []);
      setSchedules(Array.isArray(sData) ? sData : sData?.results || []);
      setLoading(false);
    });
  }, []);

  const filteredSchedules = form.route ? schedules.filter(s => s.route === parseInt(form.route)) : [];
  const selectedSchedule = schedules.find(s => s.id === parseInt(form.schedule));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('');
    if (!form.passenger_name || !form.passenger_email || !form.schedule) { setError('Fill in required fields'); setSubmitting(false); return; }
    try {
      await createBooking({ ...form, schedule: parseInt(form.schedule), seats: parseInt(form.seats), total_fare: selectedSchedule ? parseFloat(selectedSchedule.total_fare || 0) * parseInt(form.seats) : 0, status: 'pending' });
      navigate('/bookings');
    } catch (err) { setError('Booking failed'); }
    setSubmitting(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="detail-grid">
      <div className="detail-section">
        <h2>🚌 Book a Seat</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Route</label><select className="form-select" value={form.route} onChange={e => { setForm({...form, route: e.target.value, schedule: ''}); }}>
            <option value="">Select route</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.name} - ${r.fare}</option>)}
          </select></div>
          {form.route && <div className="form-group"><label className="form-label">Schedule</label><select className="form-select" value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})}>
            <option value="">Select time</option>
            {filteredSchedules.map(s => <option key={s.id} value={s.id}>🕐 {new Date(s.departure_time).toLocaleString()} - Seats: {s.available_seats}</option>)}
          </select></div>}
          <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.passenger_name} onChange={e => setForm({...form, passenger_name: e.target.value})} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.passenger_email} onChange={e => setForm({...form, passenger_email: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.passenger_phone} onChange={e => setForm({...form, passenger_phone: e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">Seats</label><input className="form-input" type="number" min="1" max="10" value={form.seats} onChange={e => setForm({...form, seats: e.target.value})} /></div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={submitting}>{submitting ? 'Booking...' : 'Confirm Booking'}</button>
        </form>
      </div>
      <div>
        {selectedSchedule && <div className="detail-section"><h2>📋 Booking Summary</h2>
          <div className="detail-row"><span className="detail-label">Route</span><span>{routes.find(r => r.id === parseInt(form.route))?.name}</span></div>
          <div className="detail-row"><span className="detail-label">Departure</span><span>{new Date(selectedSchedule.departure_time).toLocaleString()}</span></div>
          <div className="detail-row"><span className="detail-label">Seats</span><span>{form.seats}</span></div>
          <div className="detail-row"><span className="detail-label">Available</span><span>{selectedSchedule.available_seats}</span></div>
        </div>}
      </div>
    </div>
  );
}
export default BookingPage;
