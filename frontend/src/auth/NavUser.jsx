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

  return (
    <div className="navbar-user">
      <span className="navbar-username" title={user.username}>
        <span className="navbar-avatar">{user.username[0].toUpperCase()}</span>
        {user.username}
      </span>
      <button onClick={logout} className="btn btn-sm btn-secondary">Logout</button>
    </div>
  );
}
