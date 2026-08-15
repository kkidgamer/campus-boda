import { useState, useEffect, useCallback } from 'react';
import {
  fetchMyRiderProfile,
  fetchAvailableRides,
  fetchActiveRide,
  fetchRides,
  acceptRide,
  arriveRide,
  startRide,
  completeRide,
  updateRiderStatus,
} from '../api';
import { useSocketEvents } from '../hooks/useSocketEvents';

function StatusBadge({ status }) {
  const active = ['COMPLETED'].includes(status);
  const warn = ['STARTED', 'ARRIVING', 'ACCEPTED', 'REQUESTED', 'SEARCHING'].includes(status);
  return (
    <span className={`badge ${active ? 'badge-active' : warn ? 'badge-warn' : 'badge-inactive'}`}>
      {status}
    </span>
  );
}

export default function RiderDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [available, setAvailable] = useState([]);
  const [active, setActive] = useState(null);
  const [recent, setRecent] = useState([]);
  const [finalFare, setFinalFare] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [prof, avail, recentRes] = await Promise.all([
        fetchMyRiderProfile(),
        fetchAvailableRides().catch(() => ({ results: [] })),
        fetchRides({}).catch(() => ({ results: [] })),
      ]);
      setProfile(prof);
      setAvailable(avail.results || []);
      setRecent(recentRes.results || []);
    } catch (err) {
      if (!silent) setError('Could not load your rider dashboard.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadActive = useCallback(() => {
    fetchActiveRide()
      .then((res) => setActive(res.ride))
      .catch(() => setActive(null));
  }, []);

  useEffect(() => {
    load();
    loadActive();
  }, [load, loadActive]);

  // Real-time: a new/taken/updated/cancelled ride refreshes the dashboard
  // without flashing the loading spinner.
  useSocketEvents({
    'ride:new': () => load(true),
    'ride:taken': () => load(true),
    'ride:update': () => {
      load(true);
      loadActive();
    },
    'ride:cancelled': () => {
      load(true);
      loadActive();
    },
  });

  const refresh = async () => {
    await load();
    loadActive();
  };

  const toggleOnline = async () => {
    setBusy(true);
    try {
      await updateRiderStatus({ isOnline: !profile.isOnline });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update online status.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn, onDone) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onDone();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = (id) => act(() => acceptRide(id), refresh);
  const handleArrive = () => act(() => arriveRide(active.id), refresh);
  const handleStart = () => act(() => startRide(active.id), refresh);
  const handleComplete = () =>
    act(
      () => completeRide(active.id, { finalFare: Number(finalFare) || active.estimatedFare }),
      refresh
    );

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  if (!profile) {
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-body">
          <h3 className="card-title">No rider profile yet</h3>
          <p style={{ color: 'var(--text-light)' }}>
            Your rider account hasn't been fully set up yet — contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  const isApproved = profile.verificationStatus === 'approved';

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>🏍️ Rider Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {isApproved ? 'Accept rides and earn.' : 'Your rider profile is pending verification by an administrator.'}
          </p>
          {isApproved && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: 4 }}>
              ⭐ {profile.rating || '—'} rating · {profile.totalTrips || 0} trips
            </p>
          )}
        </div>
        {isApproved && (
          <button
            className={`btn ${profile.isOnline ? 'btn-secondary' : 'btn-primary'}`}
            onClick={toggleOnline}
            disabled={busy}
          >
            {profile.isOnline ? '🟢 Online — Go Offline' : '⚪ Offline — Go Online'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!isApproved ? (
        <div className="card"><div className="card-body">
          <StatusBadge status={profile.verificationStatus} />
          <p style={{ color: 'var(--text-light)', marginTop: 12 }}>
            You'll be able to accept rides once an administrator verifies your rider profile.
          </p>
        </div></div>
      ) : (
        <>
          {/* Active ride */}
          {active && (
            <div className="card" style={{ borderColor: '#0284c7', marginBottom: 24 }}>
              <div className="card-body">
                <div className="page-header" style={{ marginTop: 0 }}>
                  <h3 className="card-title">🚦 Active Ride</h3>
                  <StatusBadge status={active.status} />
                </div>
                <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>
                  {active.pickup?.label} → {active.destination?.label}
                </p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-light)', marginBottom: 16 }}>
                  <span>🧑 {active.passengerName || 'Passenger'}</span>
                  <span>💰 {active.finalFare || active.estimatedFare} KSh</span>
                  <span>🕐 {new Date(active.requestedAt).toLocaleTimeString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {active.status === 'ACCEPTED' && (
                    <button className="btn btn-primary" onClick={handleArrive} disabled={busy}>I've Arrived</button>
                  )}
                  {active.status === 'ARRIVING' && (
                    <button className="btn btn-primary" onClick={handleStart} disabled={busy}>Start Trip</button>
                  )}
                  {active.status === 'STARTED' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: 120 }}
                        placeholder={`Fare (${active.estimatedFare})`}
                        value={finalFare}
                        onChange={(e) => setFinalFare(e.target.value)}
                      />
                      <button className="btn btn-primary" onClick={handleComplete} disabled={busy}>
                        Complete Ride
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Available rides */}
          <div className="page-header">
            <h3>🛵 Ride Requests</h3>
            {!profile.isOnline && <span className="badge badge-inactive">Go online to see requests</span>}
          </div>
          {profile.isOnline && available.length === 0 && (
            <div className="card"><div className="card-body">
              <p style={{ color: 'var(--text-muted)' }}>No ride requests right now.</p>
            </div></div>
          )}
          <div className="grid grid-1">
            {available.map((ride) => (
              <div className="card" key={ride.id}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ marginBottom: 4 }}>{ride.pickup?.label} → {ride.destination?.label}</h4>
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                        <span>🧑 {ride.passengerName || 'Passenger'}</span>
                        <span>💰 {ride.estimatedFare} KSh</span>
                        <span>🕐 {new Date(ride.requestedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleAccept(ride.id)} disabled={busy}>
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent trips */}
          {recent.length > 0 && (
            <>
              <div className="page-header"><h3>📋 Recent Trips</h3></div>
              <div className="grid grid-1">
                {recent.slice(0, 5).map((ride) => (
                  <div className="card" key={ride.id}>
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ color: 'var(--text-light)' }}>
                          {ride.pickup?.label} → {ride.destination?.label}
                        </span>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-light)' }}>💰 {ride.finalFare || ride.estimatedFare} KSh</span>
                          <StatusBadge status={ride.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
