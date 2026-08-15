import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/campuses', label: 'Campuses' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/riders', label: 'Riders' },
  { to: '/admin/fares', label: 'Fares' },
  { to: '/admin/rides', label: 'Rides' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/complaints', label: 'Complaints' },
];

export default function AdminLayout() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🛠️ Admin Panel</h1>
          <p>Manage campuses, users, rides, payments and complaints.</p>
        </div>
      </div>
      <nav className="admin-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `admin-tab${isActive ? ' active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
