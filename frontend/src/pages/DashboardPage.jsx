import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const PASSENGER_ACTIONS = [
  { icon: '🛵', title: 'Request Boda', to: '/request' },
  { icon: '🧾', title: 'Recent Trips', to: '/trips' },
  { icon: '💳', title: 'Payments', to: '/payments' },
  { icon: '⚠️', title: 'File a Complaint', to: '/complaints' },
  { icon: '👤', title: 'My Profile', to: '/profile' },
];

function DashboardPage() {
  const { user } = useAuth();
  const name = user?.name || user?.email || 'there';
  const isRider = user?.systemRole === 'rider';
  const isAdmin = user?.systemRole === 'admin';

  return (
    <div>
      <div className="hero" style={{ background: 'linear-gradient(135deg, #0ea5e9, #1d4ed8)' }}>
        <h1>Welcome, {name} 👋</h1>
        <p>
          {isRider
            ? 'Rider dashboard — accept rides and track your earnings.'
            : isAdmin
              ? 'Admin dashboard — manage riders, rides and the platform.'
              : 'Passenger dashboard — request a boda and manage your trips.'}
        </p>
      </div>

      <div className="stats-grid">
        {PASSENGER_ACTIONS.map((a) => (
          <Link key={a.title} to={a.to} className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-icon">{a.icon}</div>
            <div className="stat-value" style={{ fontSize: '1rem', marginTop: 8 }}>{a.title}</div>
          </Link>
        ))}
      </div>

      <div className="page-header">
        <h2>Coming next</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Live tracking, payments and reviews arrive in the next development phases.
        </p>
      </div>

      {isRider && (
        <div className="card" style={{ maxWidth: 520, marginTop: 8 }}>
          <div className="card-body">
            <h3 className="card-title">🏍️ Rider Dashboard</h3>
            <p style={{ color: 'var(--text-light)' }}>
              Accept ride requests, track your active ride and complete trips.
            </p>
            <Link to="/rider" className="btn btn-primary">Open Rider Hub</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
