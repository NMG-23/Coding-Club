import { useLeaderboard } from '../hooks/useLeaderboard';

export function FirstBloodToast() {
  const { firstBlood } = useLeaderboard();

  if (!firstBlood) return null;

  return (
    <div className="first-blood-toast">
      <h4>🩸 First Blood!</h4>
      <p>
        <strong>{firstBlood.username}</strong>
        {firstBlood.teamName && ` (Team ${firstBlood.teamName})`} just solved{' '}
        <strong>{firstBlood.challengeTitle}</strong> for{' '}
        <span className="badge badge-points">{firstBlood.points} pts</span>
      </p>
    </div>
  );
}
