import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import NavUser from './auth/NavUser';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import HomePage from './pages/HomePage';
import RoutesPage from './pages/RoutesPage';
import RouteDetailPage from './pages/RouteDetailPage';
import SchedulesPage from './pages/SchedulesPage';
import BookingPage from './pages/BookingPage';
import BookingsListPage from './pages/BookingsListPage';
import BookingDetailPage from './pages/BookingDetailPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <AuthProvider>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-inner">
            <Link to="/" className="navbar-brand">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z"/><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z"/></svg>
              CampusTransit
            </Link>
            <div className="navbar-links">
              <NavLink to="/" end>Home</NavLink>
              <NavLink to="/routes">Routes</NavLink>
              <NavLink to="/schedules">Schedule</NavLink>
              <NavLink to="/bookings">Bookings</NavLink>
              <NavLink to="/book">Book Now</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </div>
            <NavUser />
          </div>
        </nav>
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/routes/:id" element={<RouteDetailPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/bookings" element={<BookingsListPage />} />
            <Route path="/bookings/:id" element={<BookingDetailPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </main>
        <footer className="footer"><p>© 2026 CampusTransit — Transport & Mobility Management</p></footer>
      </div>
      </AuthProvider>
    </Router>
  );
}
export default App;
