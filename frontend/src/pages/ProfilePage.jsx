import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  fetchMyProfile,
  updateMyProfile,
  changeMyPassword,
  fetchEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  fetchCampuses,
} from '../api';

const ACCOUNT_TYPES = ['student', 'staff', 'lecturer', 'visitor', 'contractor', 'other'];
const EMPTY_CONTACT = { name: '', phone: '', relationship: '' };

export default function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [campuses, setCampuses] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', accountType: 'other', campusId: '', profilePhoto: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [contacts, setContacts] = useState([]);
  const [contactModal, setContactModal] = useState(null); // { mode: 'create' } | { mode: contactId, form }
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchMyProfile();
      const user = res.user || res;
      setProfile(user);
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        accountType: user.accountType || 'other',
        campusId: user.campusId || '',
        profilePhoto: user.profilePhoto || '',
      });
      const contactsRes = await fetchEmergencyContacts();
      setContacts(contactsRes.results || []);
    } catch {
      setError('Could not load your profile.');
    }
  }, []);

  useEffect(() => {
    load();
    fetchCampuses()
      .then((res) => setCampuses(res.results || []))
      .catch(() => {});
  }, [load]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await updateMyProfile({
        name: form.name,
        phone: form.phone,
        accountType: form.accountType,
        campusId: form.campusId || null,
        profilePhoto: form.profilePhoto,
      });
      setNotice(res.message || 'Profile updated.');
      const user = res.user;
      setProfile(user);
      refreshUser().catch(() => {});
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        accountType: user.accountType || 'other',
        campusId: user.campusId || '',
        profilePhoto: user.profilePhoto || '',
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    if (pw.newPassword !== pw.confirm) {
      setError('New passwords do not match.');
      setBusy(false);
      return;
    }
    try {
      const res = await changeMyPassword({
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setNotice(res.message || 'Password updated.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };

  const submitContact = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (contactModal.mode === 'create') {
        const res = await addEmergencyContact(contactModal.form);
        setNotice(res.message || 'Emergency contact added.');
      } else {
        const res = await updateEmergencyContact(contactModal.mode, contactModal.form);
        setNotice(res.message || 'Emergency contact updated.');
      }
      setContactModal(null);
      const contactsRes = await fetchEmergencyContacts();
      setContacts(contactsRes.results || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save emergency contact.');
    } finally {
      setBusy(false);
    }
  };

  const removeContact = async (contactId) => {
    if (!window.confirm('Delete this emergency contact?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await deleteEmergencyContact(contactId);
      setNotice(res.message || 'Emergency contact deleted.');
      const contactsRes = await fetchEmergencyContacts();
      setContacts(contactsRes.results || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not delete emergency contact.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>My Profile</h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your details, password and emergency contacts.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="grid grid-2">
        {/* Personal info */}
        <div className="card">
          <div className="card-body">
            <h3 className="card-title">👤 Personal details</h3>
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full name *</label>
                <input id="profile-name" className="form-input" required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone">Phone *</label>
                <input id="profile-phone" className="form-input" required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-account">Account type</label>
                  <select id="profile-account" className="form-select"
                    value={form.accountType}
                    onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
                    {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-campus">Campus</label>
                  <select id="profile-campus" className="form-select"
                    value={form.campusId}
                    onChange={(e) => setForm({ ...form, campusId: e.target.value })}>
                    <option value="">— none —</option>
                    {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-photo">Profile photo URL</label>
                <input id="profile-photo" className="form-input" placeholder="https://…"
                  value={form.profilePhoto}
                  onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input className="form-input" value={profile?.email || ''} disabled />
              </div>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save details'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          {/* Password */}
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">🔒 Change password</h3>
              <form onSubmit={savePassword}>
                <div className="form-group">
                  <label className="form-label" htmlFor="pw-current">Current password</label>
                  <input id="pw-current" className="form-input" type="password" required
                    value={pw.currentPassword}
                    onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pw-new">New password</label>
                  <input id="pw-new" className="form-input" type="password" required minLength={8}
                    value={pw.newPassword}
                    onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pw-confirm">Confirm new password</label>
                  <input id="pw-confirm" className="form-input" type="password" required
                    value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </div>
                <div className="modal-actions" style={{ marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? 'Updating...' : 'Update password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Emergency contacts */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 className="card-title" style={{ marginBottom: 0 }}>🆘 Emergency contacts</h3>
                <button className="btn btn-sm btn-primary" onClick={() => setContactModal({ mode: 'create', form: EMPTY_CONTACT })}>
                  + Add contact
                </button>
              </div>
              {contacts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No emergency contacts yet — add someone who can be reached if you're in trouble.</p>
              ) : (
                <div>
                  {contacts.map((contact) => (
                    <div key={contact._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <div><strong>{contact.name}</strong> {contact.relationship && <span className="text-muted" style={{ fontSize: '0.85rem' }}>· {contact.relationship}</span>}</div>
                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>{contact.phone}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setContactModal({ mode: contact._id, form: { name: contact.name, phone: contact.phone, relationship: contact.relationship || '' } })} disabled={busy}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => removeContact(contact._id)} disabled={busy}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency contact modal */}
      {contactModal && (
        <div className="modal-overlay" onClick={() => setContactModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{contactModal.mode === 'create' ? 'Add emergency contact' : 'Edit emergency contact'}</h2>
            <form onSubmit={submitContact}>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-name">Name *</label>
                <input id="contact-name" className="form-input" required
                  value={contactModal.form.name}
                  onChange={(e) => setContactModal({ ...contactModal, form: { ...contactModal.form, name: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-phone">Phone *</label>
                <input id="contact-phone" className="form-input" required
                  value={contactModal.form.phone}
                  onChange={(e) => setContactModal({ ...contactModal, form: { ...contactModal.form, phone: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-rel">Relationship</label>
                <input id="contact-rel" className="form-input" placeholder="e.g. Parent, Friend, Spouse"
                  value={contactModal.form.relationship}
                  onChange={(e) => setContactModal({ ...contactModal, form: { ...contactModal.form, relationship: e.target.value } })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setContactModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
