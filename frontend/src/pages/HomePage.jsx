import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🛵',
    title: 'Request a Boda',
    text: 'Students, staff, lecturers and visitors can request campus transportation in seconds.',
  },
  {
    icon: '🛡️',
    title: 'Verified Riders',
    text: 'Every rider and motorcycle is verified and approved before taking passengers.',
  },
  {
    icon: '📍',
    title: 'Campus Pickup Points',
    text: 'Main Gate, Library, Hostels and more — always know where your ride will meet you.',
  },
];

function HomePage() {
  return (
    <div>
      <div className="hero" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
        <h1>🏍️ Campus Boda</h1>
        <p>
          Campus-wide boda transportation for students, staff, lecturers and visitors.
          Request a ride, track it in real time, and pay securely.
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-lg" style={{ background: 'white', color: '#0284c7' }}>
            Request a Ride
          </Link>
          <Link
            to="/dashboard"
            className="btn btn-lg"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            Passenger Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-3">
        {FEATURES.map((f) => (
          <div className="card" key={f.title}>
            <div className="card-body">
              <div className="stat-icon" style={{ fontSize: '1.8rem', marginBottom: 12 }}>{f.icon}</div>
              <h3 className="card-title">{f.title}</h3>
              <p style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;
