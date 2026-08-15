import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchRides, cancelRide, fetchReviews, createReview } from '../api';
import { useSocketEvents } from '../hooks/useSocketEvents';

const CANCELLABLE = ['REQUESTED', 'SEARCHING', 'ACCEPTED'];

function StatusBadge({ status }) {
  const active = ['COMPLETED'].includes(status);
  const warn = ['STARTED', 'ARRIVING', 'ACCEPTED', 'REQUESTED', 'SEARCHING'].includes(status);
  return (
    <span className={`badge ${active ? 'badge-active' : warn ? 'badge-warn' : 'badge-inactive'}`}>
      {status}
    </span>
  );
}

function Stars({ value, onChange, size = '1.2rem' }) {
  return (
    <div className="rating" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? 'star' : 'star-empty'}
          style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', fontSize: size, padding: 0 }}
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RideHistoryPage() {
  const [rides, setRides] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [drafts, setDrafts] = useState({}); // rideId -> { rating, comment }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchRides(), fetchReviews({})])
      .then(([rideRes, reviewRes]) => {
        setRides(rideRes.results || []);
        setReviews(reviewRes.results || []);
      })
      .catch(() => setError('Could not load your rides.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Real-time: ride status changes (accepted, started, completed, cancelled)
  // refresh the trip list instantly.
  useSocketEvents({
    'ride:update': load,
    'ride:cancelled': load,
  });

  const reviewForRide = (rideId) =>
    reviews.find((review) => String(review.rideId?._id || review.rideId) === String(rideId));

  const updateDraft = (rideId, patch) =>
    setDrafts((prev) => ({ ...prev, [rideId]: { ...(prev[rideId] || {}), ...patch } }));

  const submitReview = async (rideId) => {
    const draft = drafts[rideId];
    if (!draft?.rating) {
      setError('Pick a star rating first.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await createReview({ rideId, rating: draft.rating, comment: draft.comment || '' });
      setNotice('Thanks! Your review has been submitted.');
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[rideId];
        return next;
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not submit review.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this ride?')) return;
    try {
      await cancelRide(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not cancel the ride.');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>🧾 My Trips</h2>
        <Link to="/request" className="btn btn-primary btn-sm">Request a Boda</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}
      {rides.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No rides yet. Request your first boda!</p>
        </div></div>
      ) : (
        <div className="grid grid-1">
          {rides.map((ride) => {
            const review = reviewForRide(ride.id);
            const draft = drafts[ride.id];
            return (
              <div className="card" key={ride.id}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 className="card-title" style={{ marginBottom: 4 }}>
                        {ride.pickup?.label} → {ride.destination?.label}
                      </h3>
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                        <span>🛵 {ride.riderName || 'No rider yet'}</span>
                        <span>💰 {ride.finalFare || ride.estimatedFare} KSh</span>
                        <span>🕐 {new Date(ride.requestedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <StatusBadge status={ride.status} />
                      {CANCELLABLE.includes(ride.status) && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleCancel(ride.id)}>Cancel</button>
                      )}
                    </div>
                  </div>

                  {ride.status === 'COMPLETED' && (
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
                      {review ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <Stars value={review.rating} />
                          <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                            {review.comment || 'No comment'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Rate your ride:</span>
                            <Stars
                              value={draft?.rating || 0}
                              onChange={(rating) => updateDraft(ride.id, { rating })}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              className="form-input"
                              style={{ maxWidth: 320 }}
                              placeholder="Optional comment..."
                              value={draft?.comment || ''}
                              onChange={(e) => updateDraft(ride.id, { comment: e.target.value })}
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => submitReview(ride.id)} disabled={busy}>
                              {busy ? 'Submitting...' : 'Submit review'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
