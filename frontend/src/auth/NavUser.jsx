import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function NavUser() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="navbar-user">
        <Link to="/login" className="btn btn-sm btn-primary">Sign In</Link>
        <Link to="/register" className="btn btn-sm btn-secondary">Register</Link>
      </div>
    );
  }

  const displayName = user.name || user.email || 'User';

  return (
    <div className="navbar-user">
      <span className="navbar-username" title={displayName}>
        <span className="navbar-avatar">{displayName[0].toUpperCase()}</span>
        {displayName}
      </span>
      <button onClick={logout} className="btn btn-sm btn-secondary">Logout</button>
    </div>
  );
}
