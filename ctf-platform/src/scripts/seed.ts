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
    startTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
  });

  const mockTeams = [
    { teamName: 'sudoers', leaderName: 'alice', members: 'bob,charlie' },
    { teamName: 'b0f', leaderName: 'dave', members: 'eve' },
    { teamName: 'null_pointer', leaderName: 'mallory', members: 'trent' }
  ];
  await db.insert(teams).values(mockTeams);

  const mockChallenges = [
    { 
      title: 'Sanity Check', 
      description: 'What is the standard TCP port used by HTTPS for encrypted, secure web communication?', 
      options: JSON.stringify([
        'Port 80',
        'Port 443',
        'Port 8080',
        'Port 22'
      ]),
      category: 'Misc', 
      difficulty: 'Easy', 
      points: 100, 
      serverSideFlag: 'B' 
    },
    { 
      title: 'Web Security', 
      description: 'Which HTTP security header helps mitigate Cross-Site Scripting (XSS) and unauthorized code execution by restricting allowed resource domains?', 
      options: JSON.stringify([
        'Content-Security-Policy',
        'Access-Control-Allow-Origin',
        'X-Frame-Options',
        'Strict-Transport-Security'
      ]),
      category: 'Web', 
      difficulty: 'Easy', 
      points: 150, 
      serverSideFlag: 'A' 
    },
    { 
      title: 'Cryptography', 
      description: 'In asymmetric public-key cryptography (e.g., RSA), which key must a sender use to encrypt a confidential message destined solely for Alice?', 
      options: JSON.stringify([
        "Sender's Private Key",
        "Sender's Public Key",
        "Alice's Public Key",
        "Alice's Private Key"
      ]),
      category: 'Crypto', 
      difficulty: 'Medium', 
      points: 200, 
      serverSideFlag: 'C' 
    },
    { 
      title: 'Network Recon', 
      description: 'Which Nmap scanning flag initiates a TCP SYN "Stealth" half-open scan without completing the 3-way handshake?', 
      options: JSON.stringify([
        '-sT (TCP Connect)',
        '-sU (UDP Scan)',
        '-sS (SYN Stealth)',
        '-sP (Ping Sweep)'
      ]),
      category: 'Networking', 
      difficulty: 'Medium', 
      points: 250, 
      serverSideFlag: 'C' 
    },
    { 
      title: 'Linux Forensics', 
      description: 'In modern Linux systems, which file stores encrypted user password hashes with permissions restricted to the root user?', 
      options: JSON.stringify([
        '/etc/passwd',
        '/etc/shadow',
        '/etc/security/limits.conf',
        '/etc/group'
      ]),
      category: 'Forensics', 
      difficulty: 'Hard', 
      points: 300, 
      serverSideFlag: 'B' 
    },
    { 
      title: 'Binary Analysis', 
      description: 'In the x86-64 calling convention (System V AMD64 ABI), which register is standardly utilized to store the return value of a function?', 
      options: JSON.stringify([
        'RAX',
        'RBX',
        'RSP',
        'RIP'
      ]),
      category: 'Rev', 
      difficulty: 'Hard', 
      points: 400, 
      serverSideFlag: 'A' 
    }
  ];
  await db.insert(challenges).values(mockChallenges);

  console.log('✅ Seeding complete!');
  process.exit(0);
}

main().catch(console.error);
