import { db } from '../db';
import { teams, challenges, eventConfig } from '../db/schema';

async function main() {
  console.log('🌱 Seeding database...');

  await db.delete(teams);
  await db.delete(challenges);
  await db.delete(eventConfig);

  await db.insert(eventConfig).values({
    isPaused: false,
    scoreboardFrozen: false,
    startTime: new Date(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
  });

  const mockTeams = [
    { teamName: 'sudoers', leaderName: 'alice', members: 'bob,charlie' },
    { teamName: 'b0f', leaderName: 'dave', members: 'eve' },
    { teamName: 'null_pointer', leaderName: 'mallory', members: 'trent' }
  ];
  await db.insert(teams).values(mockTeams);

  const mockChallenges = [
    { title: 'Sanity Check', description: 'Welcome to the CTF!', category: 'Misc', difficulty: 'Easy', points: 100, serverSideFlag: 'flag{w3lc0m3}' },
    { title: 'SQLi Time', description: 'Can you bypass the login?', category: 'Web', difficulty: 'Medium', points: 200, serverSideFlag: 'flag{un10n_s3l3ct}' },
    { title: 'RSA Prime', description: 'Factorize this N.', category: 'Crypto', difficulty: 'Hard', points: 300, serverSideFlag: 'flag{p_q_f4ct0rs}' }
  ];
  await db.insert(challenges).values(mockChallenges);

  console.log('✅ Seeding complete!');
  process.exit(0);
}

main().catch(console.error);
