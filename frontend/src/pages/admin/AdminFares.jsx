import { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminFares,
  fetchAdminCampuses,
  createAdminFare,
  updateAdminFare,
} from '../../api';

const DEFAULT_RATES = { baseFare: 0, pricePerKm: 0, minimumFare: 0, peakMultiplier: 1, active: true };

function fmtUpdated(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function AdminFares() {
  const [campuses, setCampuses] = useState([]);
  const [fares, setFares] = useState({}); // campusId -> config
  const [drafts, setDrafts] = useState({}); // campusId -> form
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [campusRes, fareRes] = await Promise.all([fetchAdminCampuses({}), fetchAdminFares()]);
      setCampuses(campusRes.results || []);
      const fareMap = {};
      (fareRes.results || []).forEach((fare) => {
        fareMap[fare.campusId?._id || fare.campusId] = fare;
      });
      setFares(fareMap);
    } catch {
      setError('Could not load fare configurations.');
    }
  }, []);

  useEffect(load, [load]);

  const configFor = (campusId) => {
    const cfg = fares[campusId];
    return cfg
      ? {
          baseFare: cfg.baseFare,
          pricePerKm: cfg.pricePerKm,
          minimumFare: cfg.minimumFare,
          peakMultiplier: cfg.peakMultiplier,
          active: cfg.active,
        }
      : DEFAULT_RATES;
  };

  const draftFor = (campusId) => drafts[campusId] || configFor(campusId);

  const updateDraft = (campusId, patch) =>
    setDrafts((prev) => ({ ...prev, [campusId]: { ...draftFor(campusId), ...patch } }));

  const save = async (campusId) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...draftFor(campusId), active: Boolean(draftFor(campusId).active) };
      if (fares[campusId]) {
        await updateAdminFare(campusId, payload);
        setNotice('Fare configuration updated.');
      } else {
        await createAdminFare({ campusId, ...payload });
        setNotice('Fare configuration created.');
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save fare configuration.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {campuses.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No campuses yet. Create one first.</p>
        </div></div>
      ) : (
        <div className="grid grid-2">
          {campuses.map((campus) => {
            const cfg = fares[campus._id];
            const draft = draftFor(campus._id);
            return (
              <div className="card" key={campus._id}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                    <h4 style={{ margin: 0 }}>🏫 {campus.name}</h4>
                    {cfg ? (
                      <span className={`badge ${cfg.active ? 'badge-active' : 'badge-inactive'}`}>
                        {cfg.active ? 'active' : 'inactive'}
                      </span>
                    ) : (
                      <span className="badge badge-warn">no config</span>
                    )}
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>
                    {cfg ? `Updated ${fmtUpdated(cfg.updatedAt)}` : 'No fare configuration yet — set one below.'}
                  </p>

                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`base-${campus._id}`}>Base fare (KSh)</label>
                      <input id={`base-${campus._id}`} className="form-input" type="number" min="0" step="any"
                        value={draft.baseFare}
                        onChange={(e) => updateDraft(campus._id, { baseFare: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`perkm-${campus._id}`}>Per km (KSh)</label>
                      <input id={`perkm-${campus._id}`} className="form-input" type="number" min="0" step="any"
                        value={draft.pricePerKm}
                        onChange={(e) => updateDraft(campus._id, { pricePerKm: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`min-${campus._id}`}>Minimum fare (KSh)</label>
                      <input id={`min-${campus._id}`} className="form-input" type="number" min="0" step="any"
                        value={draft.minimumFare}
                        onChange={(e) => updateDraft(campus._id, { minimumFare: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`peak-${campus._id}`}>Peak multiplier (≥ 1)</label>
                      <input id={`peak-${campus._id}`} className="form-input" type="number" min="1" step="0.1"
                        value={draft.peakMultiplier}
                        onChange={(e) => updateDraft(campus._id, { peakMultiplier: e.target.value })} />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', marginBottom: 16, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={Boolean(draft.active)}
                      onChange={(e) => updateDraft(campus._id, { active: e.target.checked })} />
                    Configuration active
                  </label>

                  <button className="btn btn-primary" onClick={() => save(campus._id)} disabled={busy}>
                    {busy ? 'Saving...' : cfg ? 'Save changes' : 'Create configuration'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
