import { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';

export function Leaderboard() {
  const { data, frozen, connected } = useLeaderboard();
  const [view, setView] = useState<'users' | 'teams'>('users');

  const entries = view === 'users' ? data.users : data.teams;

  return (
    <div className="container page animate-in">
      <div className="section-header">
        <h1 className="section-title">
          Live <span>Leaderboard</span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
            <button
              className={`px-4 py-1 text-sm rounded-md transition-colors ${
                view === 'users' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setView('users')}
            >
              Users
            </button>
            <button
              className={`px-4 py-1 text-sm rounded-md transition-colors ${
                view === 'teams' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setView('teams')}
            >
              Teams
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-400 font-mono">
              {connected ? 'LIVE' : 'RECONNECTING...'}
            </span>
          </div>
        </div>
      </div>

      {frozen && (
        <div className="frozen-banner">
          ❄️ SCOREBOARD IS FROZEN ❄️
        </div>
      )}

      <div className="card--static overflow-x-auto">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Rank</th>
              <th>Name</th>
              <th style={{ textAlign: 'right' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  No solvers yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td className={`leaderboard-rank leaderboard-rank-${entry.rank}`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </td>
                  <td className="leaderboard-name">{entry.name}</td>
                  <td className="leaderboard-score">{entry.score}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
