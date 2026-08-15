# High-Performance CTF Platform Backend

A Capture The Flag (CTF) platform backend engineered for 500-600 concurrent participants. Built from the ground up for speed, simplicity, and strict session integrity.

## 🚀 Tech Stack

* **Runtime:** [Bun](https://bun.sh/)
* **Framework:** [ElysiaJS](https://elysiajs.com/) (REST & WebSockets)
* **Database & ORM:** SQLite (WAL mode) + [Drizzle ORM](https://orm.drizzle.team/)
* **Testing Client:** Zero-build vanilla HTML/CSS/JS

## ✨ Core Features

* **Strict Session Locking (1 Team = 1 Device):** A team can only have one active session. If they attempt to log in on a second device, the connection is rejected. Admins can manually invalidate stuck sessions.
* **Real-time Leaderboard & Events:** The backend natively broadcasts WebSockets events (`leaderboard:update`, `challenge:first_blood`, `event:state_change`) ready for a React UI to plug into.
* **Precision Scoring Engine:** Enforces time-bound submissions based on server configuration. Tie-breakers are resolved by the timestamp of the earliest solve.
* **Organizer Console:** A dedicated `/admin` suite to start, pause, stop, freeze the event, and monitor live metrics.

## 🛠️ Setup & Installation

1. **Navigate to the project and install dependencies:**
```bash
cd ctf-platform
bun install
```

2. **Initialize Database & Run Migrations:**
```bash
bun run db:generate
bun run db:push
```

3. **Seed Database (Mock Data):**
```bash
bun run seed
```

## 🎮 Running the Platform

Start the development server:
```bash
bun run dev
```

The server will start at `http://localhost:3000`.

### Endpoints to Test
Once running, you can open the built-in Vanilla HTML interfaces in your browser to test all functionality:
- **Participant UI (Arena):** [http://localhost:3000/public/index.html](http://localhost:3000/public/index.html)
- **Admin Console:** [http://localhost:3000/public/admin.html](http://localhost:3000/public/admin.html)

### Default Test Accounts
If you ran the seed script, the following teams are pre-registered:
- Team Name: `sudoers` | Leader: `alice`
- Team Name: `b0f` | Leader: `dave`
- Team Name: `null_pointer` | Leader: `mallory`

*(Try logging in with `sudoers` and `alice` on two different browsers to test the active session lock!)*

## 📡 WebSocket Events

Connect to `ws://localhost:3000/ws`. The server broadcasts the following JSON payloads:
- `{"type": "leaderboard:update", "payload": { ... } }`
- `{"type": "challenge:first_blood", "payload": { "challengeName": "...", "teamName": "..." } }`
- `{"type": "event:state_change", "payload": { "action": "pause|start|stop", "timestamp": 123456789 } }`
