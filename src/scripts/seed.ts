import { db } from '../db';
import { teams, challenges, eventConfig, events } from '../db/schema';

async function main() {
  console.log('🌱 Seeding database with Multi-Event schema...');

  await db.delete(events);

  const now = new Date();
  
  // Create an active event
  const [activeEvent] = await db.insert(events).values({
    name: 'Main CTF 2026',
    description: 'The main event for Coding Club',
    isActive: true,
    startTime: now,
    endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24), // 24 hours
    createdAt: now
  }).returning();

  await db.insert(eventConfig).values({
    eventId: activeEvent.id,
    isPaused: false,
    scoreboardFrozen: false,
  });

  const mockTeams = [
    { eventId: activeEvent.id, teamName: 'sudoers', leaderName: 'alice', members: 'bob,charlie' },
    { eventId: activeEvent.id, teamName: 'b0f', leaderName: 'dave', members: 'eve' },
    { eventId: activeEvent.id, teamName: 'null_pointer', leaderName: 'mallory', members: 'trent' }
  ];
  await db.insert(teams).values(mockTeams);

  const mockChallenges = [
    { eventId: activeEvent.id, title: 'Sanity Check', description: 'Welcome to the CTF!', category: 'Misc', difficulty: 'Easy', points: 100, serverSideFlag: 'flag{w3lc0m3}' },
    { eventId: activeEvent.id, title: 'SQLi Time', description: 'Can you bypass the login?', category: 'Web', difficulty: 'Medium', points: 200, serverSideFlag: 'flag{un10n_s3l3ct}' },
    { eventId: activeEvent.id, title: 'RSA Prime', description: 'Factorize this N.', category: 'Crypto', difficulty: 'Hard', points: 300, serverSideFlag: 'flag{p_q_f4ct0rs}' }
  ];
  await db.insert(challenges).values(mockChallenges);

  console.log('✅ Seeding complete!');
  process.exit(0);
}

main().catch(console.error);
