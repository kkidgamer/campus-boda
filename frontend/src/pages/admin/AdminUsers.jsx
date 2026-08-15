import { useState, useEffect, useCallback } from 'react';
import { fetchAdminUsers, updateUserStatus } from '../../api';

const ROLE_BADGE = {
  passenger: 'badge-inactive',
  rider: 'badge-confirmed',
  admin: 'badge-active',
};

const STATUS_BADGE = {
  active: 'badge-active',
  suspended: 'badge-warn',
  deactivated: 'badge-inactive',
};

function StatusBadge({ value, map }) {
  return <span className={`badge ${map[value] || 'badge-inactive'}`}>{value}</span>;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ status: '', systemRole: '', q: '' });
  const [qInput, setQInput] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    try {
      const res = await fetchAdminUsers(params);
      setUsers(res.results || []);
    } catch {
      setError('Could not load users.');
    }
  }, [filters]);

  useEffect(load, [load]);

  const submitSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: qInput.trim() }));
  };

  const toggleStatus = async (user) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = user.status === 'active' ? 'suspended' : 'active';
      await updateUserStatus(user._id, { status: next });
      setNotice(`${user.name} is now ${next}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update user.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <form className="filters" onSubmit={submitSearch}>
        <div className="search-box">
          <input
            type="search"
            placeholder="Search name, email or phone..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          value={filters.systemRole}
          onChange={(e) => setFilters((f) => ({ ...f, systemRole: e.target.value }))}
        >
          <option value="">All roles</option>
          <option value="passenger">Passenger</option>
          <option value="rider">Rider</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      {users.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>No users match your filters.</p>
        </div></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Account type</th>
                <th>Role</th>
                <th>Campus</th>
                <th>Status</th>
                <th>Verified</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <strong>{user.name}</strong>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{user.email} · {user.phone}</div>
                  </td>
                  <td>{user.accountType}</td>
                  <td><StatusBadge value={user.systemRole} map={ROLE_BADGE} /></td>
                  <td>{user.campusId?.name || '—'}</td>
                  <td><StatusBadge value={user.status} map={STATUS_BADGE} /></td>
                  <td>{user.verified ? '✅' : '—'}</td>
                  <td className="actions">
                    {user.systemRole !== 'admin' && (
                      <button
                        className={`btn btn-sm ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleStatus(user)}
                        disabled={busy}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                    {user.systemRole === 'admin' && <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
