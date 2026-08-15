import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchCampuses } from '../api';

const ACCOUNT_TYPES = ['student', 'staff', 'lecturer', 'visitor', 'contractor', 'other'];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password2: '',
    accountType: 'student', campusId: '',
  });
  const [campuses, setCampuses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.password2) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        accountType: form.accountType,
        campusId: form.campusId || undefined,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error?.message) {
        setError(data.error.message);
      } else if (data?.error?.fields) {
        const messages = Object.entries(data.error.fields).map(([key, val]) => `${key}: ${val}`);
        setError(messages.join('. '));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">✨</div>
          <h1>Create Account</h1>
          <p>Join the campus boda service — students, staff, lecturers &amp; visitors welcome</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name *</label>
            <input id="reg-name" type="text" name="name" className="form-input"
              value={form.name} onChange={handleChange} placeholder="John Doe" required autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email *</label>
              <input id="reg-email" type="email" name="email" className="form-input"
                value={form.email} onChange={handleChange} placeholder="john@campus.edu" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Phone *</label>
              <input id="reg-phone" type="tel" name="phone" className="form-input"
                value={form.phone} onChange={handleChange} placeholder="+2547..." required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">I am a:</label>
            <div className="account-type-grid">
              {ACCOUNT_TYPES.map((type) => (
                <label key={type} className="account-type-option">
                  <input
                    type="radio"
                    name="accountType"
                    value={type}
                    checked={form.accountType === type}
                    onChange={handleChange}
                  />
                  <span className="account-type-label">{type[0].toUpperCase() + type.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-campus">Campus</label>
            <select id="reg-campus" name="campusId" className="form-input"
              value={form.campusId} onChange={handleChange}>
              <option value="">Select your campus</option>
              {campuses.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {campuses.length === 0 && (
              <small className="form-hint">No campuses available yet — you can still create an account.</small>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password *</label>
              <input id="reg-password" type="password" name="password" className="form-input"
                value={form.password} onChange={handleChange} placeholder="Min. 8 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password2">Confirm Password *</label>
              <input id="reg-password2" type="password" name="password2" className="form-input"
                value={form.password2} onChange={handleChange} placeholder="Repeat password" required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? <><span className="spinner-sm" /> Creating account...</> : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
