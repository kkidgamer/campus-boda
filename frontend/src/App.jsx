import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import NavUser from './auth/NavUser';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleRoute from './auth/RoleRoute';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import RequestRidePage from './pages/RequestRidePage';
import RideHistoryPage from './pages/RideHistoryPage';
import RiderDashboardPage from './pages/RiderDashboardPage';
import PaymentsPage from './pages/PaymentsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import ProfilePage from './pages/ProfilePage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCampuses from './pages/admin/AdminCampuses';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRiders from './pages/admin/AdminRiders';
import AdminFares from './pages/admin/AdminFares';
import AdminRides from './pages/admin/AdminRides';
import AdminPayments from './pages/admin/AdminPayments';
import AdminComplaints from './pages/admin/AdminComplaints';

function NavLinks() {
  const { user } = useAuth();
  return (
    <div className="navbar-links">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/dashboard">Dashboard</NavLink>
      {user?.systemRole === 'rider' && <NavLink to="/rider">Rider Hub</NavLink>}
      {user?.systemRole === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      <NavLink to="/request">Request Ride</NavLink>
      <NavLink to="/trips">My Trips</NavLink>
      <NavLink to="/payments">Payments</NavLink>
      {user && <NavLink to="/complaints">Complaints</NavLink>}
      {user && <NavLink to="/profile">Profile</NavLink>}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-inner">
            <Link to="/" className="navbar-brand">
              🏍️ Campus Boda
            </Link>
            <NavLinks />
            <NavUser />
          </div>
        </nav>
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider"
              element={
                <RoleRoute role="rider">
                  <RiderDashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="/request"
              element={
                <ProtectedRoute>
                  <RequestRidePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips"
              element={
                <ProtectedRoute>
                  <RideHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/complaints"
              element={
                <ProtectedRoute>
                  <ComplaintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleRoute role="admin">
                  <AdminLayout />
                </RoleRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="campuses" element={<AdminCampuses />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="riders" element={<AdminRiders />} />
              <Route path="fares" element={<AdminFares />} />
              <Route path="rides" element={<AdminRides />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="complaints" element={<AdminComplaints />} />
            </Route>
          </Routes>
        </main>
        <footer className="footer">
          <p>© 2026 Campus Boda — Campus Transport &amp; Ride-Hailing System</p>
        </footer>
      </div>
      </AuthProvider>
    </Router>
  );
}
export default App;
