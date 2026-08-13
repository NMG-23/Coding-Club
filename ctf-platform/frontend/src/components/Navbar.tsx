import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🚩 <span>CTF</span> Platform
      </Link>

      <div className="navbar-links">
        <Link
          to="/challenges"
          className={`navbar-link ${location.pathname === '/challenges' ? 'active' : ''}`}
        >
          Challenges
        </Link>
        <Link
          to="/leaderboard"
          className={`navbar-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
        >
          Leaderboard
        </Link>
        {user && (
          <Link
            to="/team"
            className={`navbar-link ${location.pathname === '/team' ? 'active' : ''}`}
          >
            Team
          </Link>
        )}
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            <span className="badge badge-category">{user.username}</span>
            <button onClick={() => logout()} className="btn btn-ghost btn-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
