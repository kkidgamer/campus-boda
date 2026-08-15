import { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminRiders,
  verifyRider,
  createAdminRider,
  addRiderMotorcycle,
  deleteRiderMotorcycle,
  fetchCampuses,
} from '../../api';

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

const ACCOUNT_TYPES = ['student', 'staff', 'lecturer', 'visitor', 'contractor', 'other'];

const EMPTY_RIDER = {
  name: '',
  email: '',
  phone: '',
  password: '',
  accountType: 'student',
  campusId: '',
  nationalId: '',
  licenseNumber: '',
  motorcycleRegistration: '',
  motorcycleMake: '',
  motorcycleModel: '',
  motorcycleColor: '',
  motorcycleYear: '',
};

const EMPTY_BIKE = {
  registrationNumber: '',
  make: '',
  model: '',
  color: '',
  year: '',
};

function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function AdminRiders() {
  const [riders, setRiders] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [status, setStatus] = useState('approved');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [riderModal, setRiderModal] = useState(null); // { form } | null
  const [bikeModal, setBikeModal] = useState(null); // { userId, form } | null

  const load = useCallback(async () => {
    try {
      const params = status ? { status } : {};
      const res = await fetchAdminRiders(params);
      setRiders(res.results || []);
    } catch {
      setError('Could not load riders.');
    }
  }, [status]);

  useEffect(() => {
    load();
    fetchCampuses()
      .then((res) => setCampuses(res.results || []))
      .catch(() => {});
  }, [load]);

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

  const submitRider = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const f = riderModal.form;
    try {
      const payload = {
        name: f.name,
        email: f.email,
        phone: f.phone,
        password: f.password,
        accountType: f.accountType,
        campusId: f.campusId || null,
        nationalId: f.nationalId,
        licenseNumber: f.licenseNumber,
      };
      if (f.motorcycleRegistration) {
        payload.motorcycle = {
          registrationNumber: f.motorcycleRegistration,
          make: f.motorcycleMake,
          model: f.motorcycleModel,
          color: f.motorcycleColor,
          year: f.motorcycleYear ? Number(f.motorcycleYear) : undefined,
        };
      }
      const res = await createAdminRider(payload);
      setNotice(res.message || 'Rider registered.');
      setRiderModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not register rider.');
    } finally {
      setBusy(false);
    }
  };

  const submitBike = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const { userId, form } = bikeModal;
    try {
      const payload = {
        registrationNumber: form.registrationNumber,
        make: form.make,
        model: form.model,
        color: form.color,
        year: form.year ? Number(form.year) : undefined,
      };
      const res = await addRiderMotorcycle(userId, payload);
      setNotice(res.message || 'Motorcycle added.');
      setBikeModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not add motorcycle.');
    } finally {
      setBusy(false);
    }
  };

  const removeBike = async (rider, motorcycleId) => {
    if (!window.confirm('Remove this motorcycle from the rider?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await deleteRiderMotorcycle(rider.userId._id || rider.userId, motorcycleId);
      setNotice(res.message || 'Motorcycle removed.');
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not remove motorcycle.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h3>Riders</h3>
        <button className="btn btn-primary" onClick={() => setRiderModal({ form: EMPTY_RIDER })}>
          + Register rider
        </button>
      </div>

      <div className="filters">
        <select
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
          <option value="">All</option>
        </select>
        <span className="text-muted">{riders.length} rider(s)</span>
      </div>

      {riders.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No riders in this view. Use “Register rider” to add one.</p>
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
                <div className="detail-row"><span className="detail-label">Registered</span><span className="detail-value">{fmtDate(rider.createdAt)}</span></div>

                {/* Motorcycles */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Motorcycles ({rider.motorcycles?.length || 0})</strong>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setBikeModal({ userId: rider.userId._id || rider.userId, form: EMPTY_BIKE })}
                      disabled={busy}
                    >
                      + Add
                    </button>
                  </div>
                  {rider.motorcycles?.length ? (
                    <div style={{ marginTop: 6 }}>
                      {rider.motorcycles.map((m) => (
                        <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                          <span>
                            <strong>{m.registrationNumber}</strong>
                            {m.make && m.model && <span className="text-muted"> · {m.make} {m.model}</span>}
                            {m.color && <span className="text-muted"> · {m.color}</span>}
                          </span>
                          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className={`badge ${MOTORCYCLE_BADGE[m.verificationStatus] || 'badge-inactive'}`}>{m.verificationStatus}</span>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => removeBike(rider, m._id)}
                              disabled={busy}
                              title="Remove motorcycle"
                            >
                              ✕
                            </button>
                          </span>
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

      {/* Register rider modal */}
      {riderModal && (
        <div className="modal-overlay" onClick={() => setRiderModal(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <h2>Register rider</h2>
            <form onSubmit={submitRider}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-name">Full name *</label>
                  <input id="rider-name" className="form-input" required
                    value={riderModal.form.name}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, name: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-account">Account type</label>
                  <select id="rider-account" className="form-select"
                    value={riderModal.form.accountType}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, accountType: e.target.value } })}>
                    {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-email">Email *</label>
                  <input id="rider-email" className="form-input" type="email" required
                    value={riderModal.form.email}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, email: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-phone">Phone *</label>
                  <input id="rider-phone" className="form-input" required
                    value={riderModal.form.phone}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, phone: e.target.value } })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-password">Temporary password *</label>
                  <input id="rider-password" className="form-input" type="password" required minLength={8} placeholder="min 8 characters"
                    value={riderModal.form.password}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, password: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-campus">Campus</label>
                  <select id="rider-campus" className="form-select"
                    value={riderModal.form.campusId}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, campusId: e.target.value } })}>
                    <option value="">— none —</option>
                    {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-national-id">National ID</label>
                  <input id="rider-national-id" className="form-input"
                    value={riderModal.form.nationalId}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, nationalId: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="rider-license">License number</label>
                  <input id="rider-license" className="form-input"
                    value={riderModal.form.licenseNumber}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, licenseNumber: e.target.value } })} />
                </div>
              </div>

              <h3 style={{ fontSize: '0.95rem', margin: '16px 0 8px' }}>Motorcycle (optional)</h3>
              <div className="form-group">
                <label className="form-label" htmlFor="bike-reg">Registration number</label>
                <input id="bike-reg" className="form-input" placeholder="e.g. KDL 234A"
                  value={riderModal.form.motorcycleRegistration}
                  onChange={(e) => setRiderModal({ form: { ...riderModal.form, motorcycleRegistration: e.target.value } })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-make">Make</label>
                  <input id="bike-make" className="form-input"
                    value={riderModal.form.motorcycleMake}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, motorcycleMake: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-model">Model</label>
                  <input id="bike-model" className="form-input"
                    value={riderModal.form.motorcycleModel}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, motorcycleModel: e.target.value } })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-color">Color</label>
                  <input id="bike-color" className="form-input"
                    value={riderModal.form.motorcycleColor}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, motorcycleColor: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-year">Year</label>
                  <input id="bike-year" className="form-input" type="number" placeholder="2020"
                    value={riderModal.form.motorcycleYear}
                    onChange={(e) => setRiderModal({ form: { ...riderModal.form, motorcycleYear: e.target.value } })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setRiderModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Registering...' : 'Register rider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add motorcycle modal */}
      {bikeModal && (
        <div className="modal-overlay" onClick={() => setBikeModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add motorcycle</h2>
            <form onSubmit={submitBike}>
              <div className="form-group">
                <label className="form-label" htmlFor="bike-add-reg">Registration number *</label>
                <input id="bike-add-reg" className="form-input" required placeholder="e.g. KDL 234A"
                  value={bikeModal.form.registrationNumber}
                  onChange={(e) => setBikeModal({ ...bikeModal, form: { ...bikeModal.form, registrationNumber: e.target.value } })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-add-make">Make</label>
                  <input id="bike-add-make" className="form-input"
                    value={bikeModal.form.make}
                    onChange={(e) => setBikeModal({ ...bikeModal, form: { ...bikeModal.form, make: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-add-model">Model</label>
                  <input id="bike-add-model" className="form-input"
                    value={bikeModal.form.model}
                    onChange={(e) => setBikeModal({ ...bikeModal, form: { ...bikeModal.form, model: e.target.value } })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-add-color">Color</label>
                  <input id="bike-add-color" className="form-input"
                    value={bikeModal.form.color}
                    onChange={(e) => setBikeModal({ ...bikeModal, form: { ...bikeModal.form, color: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="bike-add-year">Year</label>
                  <input id="bike-add-year" className="form-input" type="number" placeholder="2020"
                    value={bikeModal.form.year}
                    onChange={(e) => setBikeModal({ ...bikeModal, form: { ...bikeModal.form, year: e.target.value } })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setBikeModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Adding...' : 'Add motorcycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
