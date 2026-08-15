import { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminCampuses,
  createCampus,
  updateCampus,
  fetchAdminPickupPoints,
  createPickupPoint,
  updatePickupPoint,
  deletePickupPoint,
} from '../../api';

const EMPTY_CAMPUS = { name: '', institution: '', address: '', latitude: '', longitude: '', status: 'active' };
const EMPTY_POINT = { name: '', description: '', latitude: '', longitude: '', status: 'active' };

// Convert '' / non-numeric coordinates to null so the backend stores clean values.
function normalizeCoords(form) {
  const next = { ...form };
  for (const key of ['latitude', 'longitude']) {
    const raw = form[key];
    next[key] = raw === '' || raw === null || raw === undefined || Number.isNaN(Number(raw)) ? null : Number(raw);
  }
  return next;
}

function StatusBadge({ status }) {
  const cls = status === 'active' ? 'badge-active' : 'badge-inactive';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function AdminCampuses() {
  const [campuses, setCampuses] = useState([]);
  const [pointsByCampus, setPointsByCampus] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [campusModal, setCampusModal] = useState(null); // { mode: 'create' } | { mode: id, form }
  const [pointModal, setPointModal] = useState(null); // { campusId, mode, form }
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminCampuses({});
      setCampuses(res.results || []);
    } catch {
      setError('Could not load campuses.');
    }
  }, []);

  useEffect(load, [load]);

  const loadPoints = async (campusId) => {
    try {
      const res = await fetchAdminPickupPoints({ campusId });
      setPointsByCampus((prev) => ({ ...prev, [campusId]: res.results || [] }));
    } catch {
      setError('Could not load pickup points.');
    }
  };

  const toggleExpand = async (campusId) => {
    if (expandedId === campusId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(campusId);
    if (!pointsByCampus[campusId]) await loadPoints(campusId);
  };

  const openCreateCampus = () => setCampusModal({ mode: 'create', form: EMPTY_CAMPUS });
  const openEditCampus = (campus) =>
    setCampusModal({
      mode: campus._id,
      form: {
        name: campus.name,
        institution: campus.institution || '',
        address: campus.address || '',
        latitude: campus.latitude ?? '',
        longitude: campus.longitude ?? '',
        status: campus.status,
      },
    });

  const openCreatePoint = (campusId) => setPointModal({ campusId, mode: 'create', form: EMPTY_POINT });
  const openEditPoint = (campusId, point) =>
    setPointModal({
      campusId,
      mode: point._id,
      form: {
        name: point.name,
        description: point.description || '',
        latitude: point.latitude ?? '',
        longitude: point.longitude ?? '',
        status: point.status,
      },
    });

  const submitCampus = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = normalizeCoords(campusModal.form);
      if (campusModal.mode === 'create') {
        await createCampus(payload);
        setNotice('Campus created.');
      } else {
        await updateCampus(campusModal.mode, payload);
        setNotice('Campus updated.');
      }
      setCampusModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save campus.');
    } finally {
      setBusy(false);
    }
  };

  const toggleCampusStatus = async (campus) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = campus.status === 'active' ? 'inactive' : 'active';
      await updateCampus(campus._id, { status: next });
      setNotice(`Campus ${next === 'active' ? 'reactivated' : 'deactivated'}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update campus.');
    } finally {
      setBusy(false);
    }
  };

  const submitPoint = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = { campusId: pointModal.campusId, ...normalizeCoords(pointModal.form) };
      if (pointModal.mode === 'create') {
        await createPickupPoint(payload);
        setNotice('Pickup point created.');
      } else {
        await updatePickupPoint(pointModal.mode, payload);
        setNotice('Pickup point updated.');
      }
      setPointModal(null);
      await loadPoints(pointModal.campusId);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save pickup point.');
    } finally {
      setBusy(false);
    }
  };

  const removePoint = async (campusId, pointId) => {
    if (!window.confirm('Delete this pickup point?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await deletePickupPoint(pointId);
      setNotice('Pickup point deleted.');
      await loadPoints(campusId);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not delete pickup point.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h3>Campuses</h3>
        <button className="btn btn-primary" onClick={openCreateCampus}>+ Add campus</button>
      </div>

      {campuses.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No campuses yet. Add your first one.</p>
        </div></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Institution</th>
                <th>Address</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campuses.map((campus) => (
                <CampusRow
                  key={campus._id}
                  campus={campus}
                  expanded={expandedId === campus._id}
                  points={pointsByCampus[campus._id] || []}
                  busy={busy}
                  onToggleExpand={toggleExpand}
                  onEdit={openEditCampus}
                  onToggleStatus={toggleCampusStatus}
                  onAddPoint={openCreatePoint}
                  onEditPoint={openEditPoint}
                  onDeletePoint={removePoint}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Campus create/edit modal */}
      {campusModal && (
        <div className="modal-overlay" onClick={() => setCampusModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{campusModal.mode === 'create' ? 'Add campus' : 'Edit campus'}</h2>
            <form onSubmit={submitCampus}>
              <div className="form-group">
                <label className="form-label" htmlFor="campus-name">Name *</label>
                <input id="campus-name" className="form-input" required
                  value={campusModal.form.name}
                  onChange={(e) => setCampusModal({ ...campusModal, form: { ...campusModal.form, name: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="campus-institution">Institution</label>
                <input id="campus-institution" className="form-input"
                  value={campusModal.form.institution}
                  onChange={(e) => setCampusModal({ ...campusModal, form: { ...campusModal.form, institution: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="campus-address">Address</label>
                <input id="campus-address" className="form-input"
                  value={campusModal.form.address}
                  onChange={(e) => setCampusModal({ ...campusModal, form: { ...campusModal.form, address: e.target.value } })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="campus-lat">Latitude</label>
                  <input id="campus-lat" className="form-input" type="number" step="any" placeholder="-1.28"
                    value={campusModal.form.latitude}
                    onChange={(e) => setCampusModal({ ...campusModal, form: { ...campusModal.form, latitude: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="campus-lng">Longitude</label>
                  <input id="campus-lng" className="form-input" type="number" step="any" placeholder="36.82"
                    value={campusModal.form.longitude}
                    onChange={(e) => setCampusModal({ ...campusModal, form: { ...campusModal.form, longitude: e.target.value } })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="campus-status">Status</label>
                <select id="campus-status" className="form-select"
                  value={campusModal.form.status}
                  onChange={(e) => setCampusModal({ ...campusModal, form: { ...campusModal.form, status: e.target.value } })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCampusModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pickup point create/edit modal */}
      {pointModal && (
        <div className="modal-overlay" onClick={() => setPointModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{pointModal.mode === 'create' ? 'Add pickup point' : 'Edit pickup point'}</h2>
            <form onSubmit={submitPoint}>
              <div className="form-group">
                <label className="form-label" htmlFor="point-name">Name *</label>
                <input id="point-name" className="form-input" required
                  value={pointModal.form.name}
                  onChange={(e) => setPointModal({ ...pointModal, form: { ...pointModal.form, name: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="point-desc">Description</label>
                <input id="point-desc" className="form-input"
                  value={pointModal.form.description}
                  onChange={(e) => setPointModal({ ...pointModal, form: { ...pointModal.form, description: e.target.value } })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="point-lat">Latitude</label>
                  <input id="point-lat" className="form-input" type="number" step="any"
                    value={pointModal.form.latitude}
                    onChange={(e) => setPointModal({ ...pointModal, form: { ...pointModal.form, latitude: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="point-lng">Longitude</label>
                  <input id="point-lng" className="form-input" type="number" step="any"
                    value={pointModal.form.longitude}
                    onChange={(e) => setPointModal({ ...pointModal, form: { ...pointModal.form, longitude: e.target.value } })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPointModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save point'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CampusRow({
  campus,
  expanded,
  points,
  busy,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  onAddPoint,
  onEditPoint,
  onDeletePoint,
}) {
  const coords =
    campus.latitude != null && campus.longitude != null
      ? `${campus.latitude.toFixed ? campus.latitude.toFixed(4) : campus.latitude}, ${campus.longitude.toFixed ? campus.longitude.toFixed(4) : campus.longitude}`
      : '—';

  return (
    <>
      <tr>
        <td><strong>{campus.name}</strong></td>
        <td>{campus.institution || '—'}</td>
        <td>{campus.address || '—'}</td>
        <td className="mono">{coords}</td>
        <td><StatusBadge status={campus.status} /></td>
        <td className="actions">
          <button className="btn btn-sm btn-secondary" onClick={() => onToggleExpand(campus._id)} disabled={busy}>
            {expanded ? 'Hide points' : 'Pickup points'}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(campus)} disabled={busy}>Edit</button>
          <button
            className={`btn btn-sm ${campus.status === 'active' ? 'btn-danger' : 'btn-success'}`}
            onClick={() => onToggleStatus(campus)}
            disabled={busy}
          >
            {campus.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="expanded-row">
          <td colSpan={6} style={{ background: '#fafafa' }}>
            <div style={{ padding: '4px 0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>Pickup points ({points.length})</strong>
                <button className="btn btn-sm btn-primary" onClick={() => onAddPoint(campus._id)} disabled={busy}>
                  + Add point
                </button>
              </div>
              {points.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No pickup points for this campus yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Coordinates</th>
                      <th>Status</th>
                      <th className="actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point._id}>
                        <td><strong>{point.name}</strong></td>
                        <td>{point.description || '—'}</td>
                        <td className="mono">
                          {point.latitude != null && point.longitude != null
                            ? `${point.latitude}, ${point.longitude}`
                            : '—'}
                        </td>
                        <td><StatusBadge status={point.status} /></td>
                        <td className="actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => onEditPoint(campus._id, point)} disabled={busy}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => onDeletePoint(campus._id, point._id)} disabled={busy}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
