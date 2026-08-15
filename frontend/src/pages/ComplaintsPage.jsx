import { useState, useEffect, useCallback } from 'react';
import { fetchComplaints, createComplaint, fetchRides } from '../api';

const CATEGORIES = [
  'driver_behaviour',
  'overcharging',
  'unsafe_driving',
  'vehicle_condition',
  'late_pickup',
  'route_deviation',
  'other',
];

const STATUS_BADGE = {
  open: 'badge-warn',
  in_progress: 'badge-processing',
  resolved: 'badge-active',
  dismissed: 'badge-inactive',
};

function labelOf(category) {
  return category ? category.replace(/_/g, ' ') : 'other';
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [rides, setRides] = useState([]);
  const [form, setForm] = useState({ rideId: '', category: 'other', description: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [complaintRes, rideRes] = await Promise.all([fetchComplaints({}), fetchRides({})]);
      setComplaints(complaintRes.results || []);
      setRides(rideRes.results || []);
    } catch {
      setError('Could not load complaints.');
    }
  }, []);

  useEffect(load, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        rideId: form.rideId || undefined,
        category: form.category,
        description: form.description.trim(),
      };
      await createComplaint(payload);
      setNotice('Complaint filed — our team will review it.');
      setForm({ rideId: '', category: 'other', description: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not file complaint.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>⚠️ Complaints</h2>
          <p style={{ color: 'var(--text-light)' }}>Report a problem with a ride or the service. We'll follow up here.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {/* File a complaint */}
      <div className="card" style={{ maxWidth: 640, marginBottom: 24 }}>
        <div className="card-body">
          <h3 className="card-title">File a complaint</h3>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label" htmlFor="complaint-ride">Ride (optional)</label>
              <select
                id="complaint-ride"
                className="form-select"
                value={form.rideId}
                onChange={(e) => setForm({ ...form, rideId: e.target.value })}
              >
                <option value="">No specific ride</option>
                {rides.map((ride) => (
                  <option key={ride.id} value={ride.id}>
                    {ride.pickup?.label || '?'} → {ride.destination?.label || '?'} ({ride.status})
                  </option>
                ))}
              </select>
              <span className="form-hint">Optional — pick a ride if this complaint is about a specific trip.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="complaint-category">Category</label>
              <select
                id="complaint-category"
                className="form-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{labelOf(c)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="complaint-description">What happened?</label>
              <textarea
                id="complaint-description"
                className="form-textarea"
                rows={4}
                required
                placeholder="Describe the issue in as much detail as you can..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit complaint'}
            </button>
          </form>
        </div>
      </div>

      {/* My complaints */}
      <div className="page-header"><h3>My complaints</h3></div>
      {complaints.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No complaints filed yet.</p>
        </div></div>
      ) : (
        <div className="grid grid-2">
          {complaints.map((complaint) => (
            <div className="card" key={complaint.id}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <h4 style={{ margin: 0 }}>{labelOf(complaint.category)}</h4>
                  <span className={`badge ${STATUS_BADGE[complaint.status] || 'badge-inactive'}`}>{complaint.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="card-text" style={{ whiteSpace: 'pre-wrap' }}>{complaint.description}</p>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {complaint.rideLabel ? <>🚗 {complaint.rideLabel} · </> : 'General complaint · '}
                  {new Date(complaint.createdAt).toLocaleString()}
                </div>
                {complaint.resolution && (
                  <div style={{ background: 'var(--primary-light)', padding: '8px 12px', borderRadius: 8, marginTop: 12, fontSize: '0.85rem' }}>
                    <strong>Response:</strong> {complaint.resolution}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
