import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', password2: '', first_name: '', last_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const messages = Object.entries(data).map(([key, val]) =>
          Array.isArray(val) ? `${key}: ${val.join(', ')}` : `${key}: ${val}`
        );
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
          <p>Join the campus community today</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="first_name">First Name</label>
              <input id="first_name" type="text" name="first_name" className="form-input"
                value={form.first_name} onChange={handleChange} placeholder="John" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="last_name">Last Name</label>
              <input id="last_name" type="text" name="last_name" className="form-input"
                value={form.last_name} onChange={handleChange} placeholder="Doe" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username *</label>
            <input id="reg-username" type="text" name="username" className="form-input"
              value={form.username} onChange={handleChange} placeholder="johndoe" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email *</label>
            <input id="reg-email" type="email" name="email" className="form-input"
              value={form.email} onChange={handleChange} placeholder="john@campus.edu" required />
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
