import { useState, useEffect, useCallback } from 'react';
import { fetchAdminRides } from '../../api';

const STATUS_BADGE = {
  REQUESTED: 'badge-warn',
  SEARCHING: 'badge-warn',
  ACCEPTED: 'badge-confirmed',
  ARRIVING: 'badge-processing',
  STARTED: 'badge-info',
  COMPLETED: 'badge-active',
  CANCELLED: 'badge-cancelled',
};

function fmtDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function AdminRides() {
  const [rides, setRides] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = status ? { status } : {};
      const res = await fetchAdminRides(params);
      setRides(res.results || []);
    } catch {
      setError('Could not load rides.');
    }
  }, [status]);

  useEffect(load, [load]);

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters">
        <select
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="SEARCHING">Searching</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="ARRIVING">Arriving</option>
          <option value="STARTED">Started</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <span className="text-muted">{rides.length} ride(s)</span>
      </div>

      {rides.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No rides found.</p>
        </div></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Passenger</th>
                <th>Rider</th>
                <th>Route</th>
                <th>Fare (KSh)</th>
                <th>Status</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride._id}>
                  <td className="mono">{String(ride._id).slice(-6)}</td>
                  <td>{ride.passengerId?.name || '—'}</td>
                  <td>{ride.riderId?.name || '—'}</td>
                  <td>{ride.pickup?.label || '?'} → {ride.destination?.label || '?'}</td>
                  <td>{ride.finalFare || ride.estimatedFare || 0}</td>
                  <td><span className={`badge ${STATUS_BADGE[ride.status] || 'badge-inactive'}`}>{ride.status}</span></td>
                  <td>{fmtDate(ride.requestedAt || ride.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
