import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminStats } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(() => setError('Could not load dashboard stats.'));
  }, []);

  if (!stats && !error) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  const cards = [
    { icon: '👥', label: 'Total users', value: stats.totalUsers, to: '/admin/users' },
    { icon: '🏍️', label: 'Riders', value: stats.totalRiders, to: '/admin/users' },
    { icon: '🛵', label: 'Total rides', value: stats.totalRides, to: '/admin/rides' },
    { icon: '🚦', label: 'Active rides', value: stats.activeRides, to: '/admin/rides' },
    { icon: '💳', label: 'Payments', value: stats.totalPayments, to: '/admin/payments' },
    { icon: '💰', label: 'Revenue (KSh)', value: Number(stats.revenue).toLocaleString(), to: '/admin/payments' },
    { icon: '⚠️', label: 'Open complaints', value: stats.openComplaints, to: '/admin/complaints' },
    { icon: '🏫', label: 'Active campuses', value: stats.activeCampuses, to: '/admin/campuses' },
  ];

  return (
    <div>
      <div className="stats-grid">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>{card.icon}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
