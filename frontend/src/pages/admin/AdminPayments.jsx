import { useState, useEffect, useCallback } from 'react';
import { fetchAdminPayments } from '../../api';

const STATUS_BADGE = {
  pending: 'badge-warn',
  paid: 'badge-paid',
  failed: 'badge-cancelled',
  refunded: 'badge-inactive',
};

function fmtDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = status ? { status } : {};
      const res = await fetchAdminPayments(params);
      setPayments(res.results || []);
    } catch {
      setError('Could not load payments.');
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
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <span className="text-muted">{payments.length} payment(s)</span>
      </div>

      {payments.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No payments found.</p>
        </div></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Amount (KSh)</th>
                <th>Passenger</th>
                <th>Ride</th>
                <th>Method</th>
                <th>Receipt</th>
                <th>Status</th>
                <th>Paid at</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td><strong>{payment.amount}</strong></td>
                  <td>{payment.passengerId?.name || '—'}</td>
                  <td>
                    {payment.rideId
                      ? `${payment.rideId.pickup?.label || '?'} → ${payment.rideId.destination?.label || '?'}`
                      : '—'}
                  </td>
                  <td>{payment.method || '—'}</td>
                  <td className="mono">{payment.mpesaReceipt || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[payment.status] || 'badge-inactive'}`}>{payment.status}</span></td>
                  <td>{fmtDate(payment.paidAt || payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
