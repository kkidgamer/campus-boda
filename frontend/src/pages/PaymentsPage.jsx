import { useState, useEffect, useCallback } from 'react';
import {
  fetchPayments,
  fetchRides,
  fetchHealth,
  initiatePayment,
  simulateConfirmPayment,
} from '../api';

function StatusBadge({ status }) {
  const cls = status === 'paid' ? 'badge-active' : status === 'failed' ? 'badge-inactive' : 'badge-warn';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [unpaidRides, setUnpaidRides] = useState([]);
  const [mpesaEnv, setMpesaEnv] = useState('simulation');
  const [form, setForm] = useState({ rideId: '', phone: '', amount: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [payRes, ridesRes, health] = await Promise.all([
        fetchPayments({}),
        fetchRides({ status: 'COMPLETED' }),
        fetchHealth(),
      ]);
      setPayments(payRes.results || []);
      setMpesaEnv(health.mpesa || 'simulation');
      const paidRideIds = new Set(
        (payRes.results || []).map((p) => p.rideId?._id || p.rideId)
      );
      setUnpaidRides((ridesRes.results || []).filter((r) => !paidRideIds.has(r.id)));
    } catch {
      setError('Could not load payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(load, [load]);

  const handleInitiate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await initiatePayment({
        rideId: form.rideId,
        phone: form.phone,
        amount: Number(form.amount) || undefined,
      });
      setNotice(
        res.simulated
          ? 'Payment initiated (simulation mode) — approve it.'
          : 'M-Pesa prompt sent — approve it on your phone.'
      );
      setForm({ ...form, rideId: '', phone: '', amount: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not initiate payment.');
    } finally {
      setBusy(false);
    }
  };

  const handleSimulate = async (id) => {
    setBusy(true);
    setError('');
    try {
      await simulateConfirmPayment(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not confirm payment.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>💳 Payments</h2>
        <span className="badge badge-inactive">M-Pesa {mpesaEnv}</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert" style={{ background: '#dcfce7', color: '#166534' }}>{notice}</div>}

      {/* Pay an unpaid completed ride */}
      {unpaidRides.length > 0 && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <h3 className="card-title">Pay for a completed ride</h3>
            <form onSubmit={handleInitiate}>
              <div className="form-group">
                <label className="form-label" htmlFor="pay-ride">Ride</label>
                <select id="pay-ride" name="rideId" className="form-input" value={form.rideId} onChange={(e) => {
                  const ride = unpaidRides.find((r) => r.id === e.target.value);
                  setForm({ ...form, rideId: e.target.value, amount: ride ? String(ride.finalFare || ride.estimatedFare) : '' });
                }} required>
                  <option value="">Select a completed ride</option>
                  {unpaidRides.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.pickup?.label} → {r.destination?.label} (KSh {r.finalFare || r.estimatedFare})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="pay-phone">M-Pesa phone</label>
                  <input id="pay-phone" type="tel" name="phone" className="form-input"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="07XX XXX XXX" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pay-amount">Amount (KSh)</label>
                  <input id="pay-amount" type="number" name="amount" className="form-input"
                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? <><span className="spinner-sm" /> Initiating...</> : 'Pay with M-Pesa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="page-header"><h3>Payment history</h3></div>
      {payments.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No payments yet. Complete a ride to pay for it.</p>
        </div></div>
      ) : (
        <div className="grid grid-1">
          {payments.map((p) => (
            <div className="card" key={p.id}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h4 style={{ marginBottom: 4 }}>{p.rideFrom || 'Ride'} → {p.rideTo || ''}</h4>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                      <span>💰 KSh {p.amount}</span>
                      <span>🕐 {new Date(p.createdAt).toLocaleString()}</span>
                      {p.mpesaReceipt && <span>🧾 {p.mpesaReceipt}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <StatusBadge status={p.status} />
                    {p.status === 'pending' && mpesaEnv === 'simulation' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => handleSimulate(p.id)} disabled={busy}>
                        Confirm (simulate)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
