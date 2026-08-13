import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="container">
      <div className="hero animate-in">
        <h1 className="hero-title" data-text="HACK THE PLANET">
          HACK THE PLANET
        </h1>
        <p className="hero-subtitle">
          Welcome to the ultimate cyberpunk Capture The Flag experience. Form a team, solve challenges, and climb the real-time leaderboard.
        </p>

        <div className="hero-timer">
          <div className="hero-timer-segment">
            <div className="hero-timer-value">24</div>
            <div className="hero-timer-label">HOURS</div>
          </div>
          <div className="hero-timer-segment">
            <div className="hero-timer-value">00</div>
            <div className="hero-timer-label">MINUTES</div>
          </div>
          <div className="hero-timer-segment">
            <div className="hero-timer-value">00</div>
            <div className="hero-timer-label">SECONDS</div>
          </div>
        </div>

        <div className="flex gap-4">
          {user ? (
            <Link to="/challenges" className="btn btn-primary btn-lg">
              Enter the Grid
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">
                Join the Fight
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Access Terminal
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="stats-row animate-in" style={{ animationDelay: '0.2s' }}>
        <div className="stat-card">
          <div className="stat-card-value">600+</div>
          <div className="stat-card-label">Hackers</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">50</div>
          <div className="stat-card-label">Challenges</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">$5k</div>
          <div className="stat-card-label">Prize Pool</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">24h</div>
          <div className="stat-card-label">Duration</div>
        </div>
      </div>
    </div>
  );
}
