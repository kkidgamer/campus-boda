import { useState, useEffect, useCallback } from 'react';
import { fetchAdminComplaints, updateComplaint } from '../../api';

const STATUS_BADGE = {
  open: 'badge-warn',
  in_progress: 'badge-processing',
  resolved: 'badge-active',
  dismissed: 'badge-inactive',
};

function fmtDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [status, setStatus] = useState('');
  const [drafts, setDrafts] = useState({}); // id -> { status, resolution }
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = status ? { status } : {};
      const res = await fetchAdminComplaints(params);
      setComplaints(res.results || []);
    } catch {
      setError('Could not load complaints.');
    }
  }, [status]);

  useEffect(load, [load]);

  const updateDraft = (id, patch) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  const save = async (complaint) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const draft = drafts[complaint._id] || {};
      const payload = {};
      if (draft.status && draft.status !== complaint.status) payload.status = draft.status;
      if (draft.resolution !== undefined) payload.resolution = draft.resolution;
      if (Object.keys(payload).length === 0) return;
      await updateComplaint(complaint._id, payload);
      setNotice('Complaint updated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update complaint.');
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
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <span className="text-muted">{complaints.length} complaint(s)</span>
      </div>

      {complaints.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No complaints found.</p>
        </div></div>
      ) : (
        <div className="grid grid-2">
          {complaints.map((complaint) => (
            <div className="card" key={complaint._id}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <h4 style={{ margin: 0 }}>{complaint.category || 'General'}</h4>
                  <span className={`badge ${STATUS_BADGE[complaint.status] || 'badge-inactive'}`}>{complaint.status}</span>
                </div>
                <p className="card-text" style={{ whiteSpace: 'pre-wrap' }}>{complaint.description}</p>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                  {complaint.passengerId?.name || 'Passenger'} · {fmtDate(complaint.createdAt)}
                  {complaint.riderId?.name && <> · rider: {complaint.riderId.name}</>}
                </div>

                {complaint.resolution && (
                  <div style={{ background: 'var(--primary-light)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem' }}>
                    <strong>Resolution:</strong> {complaint.resolution}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(complaint);
                  }}
                >
                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`complaint-status-${complaint._id}`}>Status</label>
                      <select
                        id={`complaint-status-${complaint._id}`}
                        className="form-select"
                        value={drafts[complaint._id]?.status ?? complaint.status}
                        onChange={(e) => updateDraft(complaint._id, { status: e.target.value })}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label" htmlFor={`complaint-note-${complaint._id}`}>Resolution note</label>
                    <textarea
                      id={`complaint-note-${complaint._id}`}
                      className="form-textarea"
                      rows={2}
                      placeholder="What was done about this complaint?"
                      value={drafts[complaint._id]?.resolution ?? complaint.resolution ?? ''}
                      onChange={(e) => updateDraft(complaint._id, { resolution: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
                    {busy ? 'Saving...' : 'Update complaint'}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
