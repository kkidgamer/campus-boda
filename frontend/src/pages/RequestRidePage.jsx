import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchCampuses, fetchPickupPoints, fetchFareQuote, requestRide } from '../api';

export default function RequestRidePage() {
  const [campuses, setCampuses] = useState([]);
  const [points, setPoints] = useState([]);
  const [form, setForm] = useState({ campusId: '', pickup: '', destination: '', distanceKm: '2' });
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchCampuses()
      .then((res) => {
        setCampuses(res.results || []);
        if (res.results?.length === 1) {
          setForm((f) => ({ ...f, campusId: res.results[0]._id }));
        }
      })
      .catch(() => setCampuses([]));
  }, []);

  useEffect(() => {
    if (!form.campusId) {
      setPoints([]);
      return;
    }
    fetchPickupPoints(form.campusId)
      .then((res) => setPoints(res.results || []))
      .catch(() => setPoints([]));
  }, [form.campusId]);

  // Live fare quote whenever campus or distance changes
  const loadQuote = useCallback(() => {
    if (!form.campusId || !form.distanceKm) {
      setQuote(null);
      return;
    }
    setQuoteError('');
    fetchFareQuote({ campusId: form.campusId, distanceKm: form.distanceKm })
      .then((res) => setQuote(res.quote))
      .catch((err) => {
        setQuote(null);
        setQuoteError(err.response?.data?.error?.message || 'Fare quote unavailable');
      });
  }, [form.campusId, form.distanceKm]);

  useEffect(loadQuote, [loadQuote]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await requestRide({
        campusId: form.campusId,
        pickup: { label: form.pickup },
        destination: { label: form.destination },
        distanceKm: Number(form.distanceKm) || 2,
      });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not request the ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fare = result?.fareDetails || quote;

  return (
    <div>
      <div className="page-header">
        <h2>🛵 Request a Boda</h2>
        <p style={{ color: 'var(--text-muted)' }}>Where are you headed on campus?</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result ? (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <h3 className="card-title">Ride requested! 🎉</h3>
            <p style={{ color: 'var(--text-light)' }}>
              <strong>{result.ride.pickup?.label}</strong> → <strong>{result.ride.destination?.label}</strong>
            </p>
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-value">KSh {result.ride.estimatedFare}</div>
                <div className="stat-label">Estimated fare</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🛵</div>
                <div className="stat-value">{result.riderCount}</div>
                <div className="stat-label">Riders online</div>
              </div>
            </div>
            <div className="badge badge-active">Status: {result.ride.status}</div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <Link to="/trips" className="btn btn-primary">Track My Trips</Link>
              <button className="btn btn-secondary" onClick={() => { setResult(null); setForm({ ...form, pickup: '', destination: '' }); }}>
                Request Another
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="campusId">Campus</label>
                <select id="campusId" name="campusId" className="form-input" value={form.campusId} onChange={handleChange} required>
                  <option value="">Select campus</option>
                  {campuses.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pickup">Pickup point</label>
                <select id="pickup" name="pickup" className="form-input" value={form.pickup} onChange={handleChange} required>
                  <option value="">Select pickup</option>
                  {points.map((p) => (
                    <option key={p._id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="destination">Destination</label>
                <select id="destination" name="destination" className="form-input" value={form.destination} onChange={handleChange} required>
                  <option value="">Select destination</option>
                  {points.map((p) => (
                    <option key={p._id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="distanceKm">Distance (km)</label>
                <input id="distanceKm" type="number" min="0.1" step="0.1" name="distanceKm"
                  className="form-input" value={form.distanceKm} onChange={handleChange} />
              </div>

              {quote && (
                <div className="fare-quote">
                  <div className="fare-quote-row">
                    <span>Base fare</span><span>KSh {quote.baseFare}</span>
                  </div>
                  <div className="fare-quote-row">
                    <span>{quote.distanceKm} km × KSh {quote.pricePerKm}/km</span>
                    <span>KSh {Math.round(quote.pricePerKm * quote.distanceKm)}</span>
                  </div>
                  {quote.estimatedFare === quote.minimumFare && (
                    <div className="fare-quote-row">
                      <span>Minimum fare applied</span><span>KSh {quote.minimumFare}</span>
                    </div>
                  )}
                  {quote.peakApplied && (
                    <div className="fare-quote-row">
                      <span>Peak hour ×{quote.peakMultiplier}</span><span>applied</span>
                    </div>
                  )}
                  <div className="fare-quote-row fare-quote-total">
                    <strong>Estimated fare</strong>
                    <strong>KSh {quote.estimatedFare}</strong>
                  </div>
                </div>
              )}
              {quoteError && <div className="alert alert-error">{quoteError}</div>}

              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || !points.length}>
                {loading ? <><span className="spinner-sm" /> Requesting...</> : 'Request Ride'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
