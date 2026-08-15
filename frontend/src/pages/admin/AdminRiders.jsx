import { useState, useEffect, useCallback } from 'react';
import { fetchAdminRiders, verifyRider } from '../../api';

const STATUS_BADGE = {
  pending: 'badge-warn',
  approved: 'badge-active',
  rejected: 'badge-cancelled',
  suspended: 'badge-inactive',
};

const MOTORCYCLE_BADGE = {
  pending: 'badge-warn',
  approved: 'badge-active',
  rejected: 'badge-cancelled',
  suspended: 'badge-inactive',
};

function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function AdminRiders() {
  const [riders, setRiders] = useState([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = status ? { status } : {};
      const res = await fetchAdminRiders(params);
      setRiders(res.results || []);
    } catch {
      setError('Could not load rider applications.');
    }
  }, [status]);

  useEffect(load, [load]);

  const act = async (rider, nextStatus) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await verifyRider(rider.userId._id || rider.userId, { status: nextStatus });
      setNotice(res.message || `Rider ${nextStatus}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update rider.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="filters">
        <select
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
          <option value="">All</option>
        </select>
        <span className="text-muted">{riders.length} application(s)</span>
      </div>

      {riders.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No rider applications in this view.</p>
        </div></div>
      ) : (
        <div className="grid grid-2">
          {riders.map((rider) => (
            <div className="card" key={rider._id}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <h4 style={{ margin: 0 }}>
                    {rider.userId?.name || 'Rider'}
                  </h4>
                  <span className={`badge ${STATUS_BADGE[rider.verificationStatus] || 'badge-inactive'}`}>
                    {rider.verificationStatus}
                  </span>
                </div>

                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                  {rider.userId?.email} · {rider.userId?.phone}
                  {rider.userId?.accountType && <> · {rider.userId.accountType}</>}
                  {rider.userId?.status === 'suspended' && <> · <span style={{ color: 'var(--danger)' }}>account suspended</span></>}
                </div>

                <div className="detail-row"><span className="detail-label">National ID</span><span className="detail-value">{rider.nationalId || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">License no.</span><span className="detail-value">{rider.licenseNumber || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Rating / trips</span><span className="detail-value">{rider.rating || '—'} ⭐ · {rider.totalTrips || 0} trips</span></div>
                <div className="detail-row"><span className="detail-label">Online</span><span className="detail-value">{rider.isOnline ? '🟢' : '⚪'}</span></div>
                <div className="detail-row"><span className="detail-label">Applied</span><span className="detail-value">{fmtDate(rider.createdAt)}</span></div>

                {/* Motorcycles */}
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: '0.85rem' }}>Motorcycles ({rider.motorcycles?.length || 0})</strong>
                  {rider.motorcycles?.length ? (
                    <div style={{ marginTop: 6 }}>
                      {rider.motorcycles.map((m) => (
                        <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                          <span>
                            <strong>{m.registrationNumber}</strong>
                            {m.make && m.model && <span className="text-muted"> · {m.make} {m.model}</span>}
                          </span>
                          <span className={`badge ${MOTORCYCLE_BADGE[m.verificationStatus] || 'badge-inactive'}`}>{m.verificationStatus}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>No motorcycles registered.</p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {rider.verificationStatus !== 'approved' && (
                    <button className="btn btn-sm btn-success" onClick={() => act(rider, 'approved')} disabled={busy}>
                      ✓ Approve
                    </button>
                  )}
                  {rider.verificationStatus !== 'rejected' && (
                    <button className="btn btn-sm btn-danger" onClick={() => act(rider, 'rejected')} disabled={busy}>
                      ✕ Reject
                    </button>
                  )}
                  {rider.verificationStatus !== 'suspended' && rider.verificationStatus === 'approved' && (
                    <button className="btn btn-sm btn-secondary" onClick={() => act(rider, 'suspended')} disabled={busy}>
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
