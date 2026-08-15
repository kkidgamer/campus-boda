import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from './AuthContext';

function RoleCheck({ role, children }) {
  const { user } = useAuth();
  if (user?.systemRole !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/** Authenticated + system-role-gated route. */
export default function RoleRoute({ role, children }) {
  return (
    <ProtectedRoute>
      <RoleCheck role={role}>{children}</RoleCheck>
    </ProtectedRoute>
  );
}
