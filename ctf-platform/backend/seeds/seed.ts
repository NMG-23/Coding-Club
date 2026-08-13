import { db } from "../src/db";
import { challenges, users, events } from "../src/db/schema";
import seedData from "./challenges.json";

/**
 * Seed script: loads challenges from JSON, creates an admin user, and optionally an event.
 *
 * Usage: bun run seed
 */
async function seed() {
  console.log("🌱 Starting seed...\n");

  // 1. Create admin user
  const adminPassword = await Bun.password.hash("admin123", { algorithm: "bcrypt", cost: 12 });

  try {
    await db.insert(users).values({
      username: "admin",
      email: "admin@ctf.local",
      passwordHash: adminPassword,
      role: "admin",
    }).onConflictDoNothing();
    console.log("✅ Admin user created (admin / admin123)");
  } catch (e) {
    console.log("ℹ️  Admin user already exists");
  }

  // 2. Seed challenges
  let inserted = 0;
  for (const c of seedData) {
    const flagHash = await Bun.password.hash(c.flag, { algorithm: "bcrypt", cost: 12 });

    try {
      await db.insert(challenges).values({
        title: c.title,
        description: c.description,
        category: c.category as any,
        difficulty: c.difficulty as any,
        initialPoints: c.initialPoints,
        minPoints: c.minPoints,
        decay: c.decay,
        flagHash,
        hints: JSON.stringify(c.hints || []),
        files: JSON.stringify(c.files || []),
        authorName: c.authorName,
      });
      inserted++;
      console.log(`  ✅ ${c.title} (${c.category}/${c.difficulty})`);
    } catch (e: any) {
      console.log(`  ⚠️  Skipped "${c.title}": ${e.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n📦 Inserted ${inserted}/${seedData.length} challenges`);

  // 3. Create a sample event (starts now, ends in 24 hours, freezes 1h before end)
  const now = new Date();
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const freezeTime = new Date(endTime.getTime() - 60 * 60 * 1000);

  try {
    await db.insert(events).values({
      name: "Coding Club CTF 2026",
      description: "Welcome to the first Coding Club CTF! Hack the planet! 🌍",
      startTime: now,
      endTime: endTime,
      scoreboardFreezeTime: freezeTime,
      isActive: true,
    });
    console.log("\n🏁 Sample event created (24h duration, 1h freeze)");
  } catch (e) {
    console.log("\nℹ️  Event already exists");
  }

  console.log("\n✨ Seed complete!\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
