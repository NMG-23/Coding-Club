import { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Team() {
  const { user, refreshUser } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Forms
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const data: any = await api.getMyTeam();
      setTeam(data.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      await api.createTeam(teamName);
      await refreshUser();
      await fetchTeam();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      await api.joinTeam(inviteCode);
      await refreshUser();
      await fetchTeam();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave your team?')) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await api.leaveTeam();
      await refreshUser();
      setTeam(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="loading-spinner"></div>;
  }

  // If user has a team, show team dashboard
  if (team) {
    return (
      <div className="container page animate-in">
        <div className="section-header">
          <h1 className="section-title">
            Team <span>Dashboard</span>
          </h1>
        </div>

        {error && <div className="error-message mb-6">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="team-card">
            <h2 className="text-2xl font-mono font-bold text-white mb-2">{team.name}</h2>
            <p className="text-gray-400 mb-6">Invite your friends using the code below.</p>
            
            <div 
              className="team-invite-code"
              onClick={() => {
                navigator.clipboard.writeText(team.inviteCode);
                alert('Invite code copied to clipboard!');
              }}
              title="Click to copy"
            >
              {team.inviteCode}
            </div>
            
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleLeave} 
                className="btn btn-danger"
                disabled={isSubmitting}
              >
                Leave Team
              </button>
            </div>
          </div>

          <div className="team-card">
            <h3 className="text-xl font-bold text-white mb-4">Members ({team.members.length})</h3>
            <div className="team-members">
              {team.members.map((member: any) => (
                <div key={member.id} className="team-member">
                  <span className="team-member-name">
                    {member.username} 
                    {member.id === user?.id && <span className="text-gray-500 text-sm ml-2">(You)</span>}
                  </span>
                  {member.id === team.captainId && (
                    <span className="team-member-badge">Captain</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user has no team, show create/join forms
  return (
    <div className="container page animate-in">
      <div className="section-header">
        <h1 className="section-title">
          Join a <span>Team</span>
        </h1>
      </div>

      {error && <div className="error-message mb-6">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-2">Create New Team</h2>
          <p className="text-gray-400 mb-6 text-sm">Form a new team and invite others to join.</p>
          
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="input-group">
              <label>Team Name</label>
              <input
                type="text"
                className="input"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Cyber Knights"
                minLength={2}
                maxLength={64}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              Create Team
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-white mb-2">Join Existing Team</h2>
          <p className="text-gray-400 mb-6 text-sm">Enter the 8-character invite code from the team captain.</p>
          
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div className="input-group">
              <label>Invite Code</label>
              <input
                type="text"
                className="input font-mono"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                maxLength={8}
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={isSubmitting}>
              Join Team
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
