# Coding Club CTF Platform 🚩

A high-performance, real-time Capture The Flag (CTF) platform built for 500-600 concurrent users. 

## 🏗️ Architecture & Stack

The platform is completely self-contained and designed to run locally on Windows without needing Docker or hardware virtualization.

*   **Backend:** Bun runtime + ElysiaJS for maximum performance, handling both REST API requests and WebSocket connections simultaneously.
*   **Database:** SQLite (`bun:sqlite` & Drizzle ORM). The database is stored locally in `backend/sqlite.db` and persists all users, teams, and solves.
*   **Frontend:** Vite + React + TypeScript, utilizing a bespoke Cyberpunk/Hacker CSS design system.
*   **State Management:** Custom in-memory caching for sliding-window rate limiting and $O(\log N)$ dynamic score recalculations. The leaderboard state is automatically rebuilt from the database upon server restart.

## 🚀 Key Features

### 1. Dynamic Scoring System 📉
Implemented a decay-based scoring model using a custom in-memory sorted array.
*   Challenges start at an `initialPoints` value (e.g., 500).
*   As users solve a challenge, the score decays logarithmically down to `minPoints`.
*   The backend ensures that when a challenge's value drops, all previous solvers have their total scores mathematically adjusted instantly.

### 2. Real-Time Leaderboard & "First Blood" 🩸
*   A dedicated WebSocket server runs alongside the Elysia HTTP server.
*   When a user submits a valid flag, the backend recalculates the leaderboard and broadcasts the new state to all connected clients instantly.
*   If a user is the first to solve a challenge, a `first-blood` event is broadcasted, triggering an animated toast notification on the frontend for all players.

### 3. "Hybrid" Admin & Event Management 📅
*   **Seed Scripts:** Challenges are loaded programmatically via a JSON seed script (`bun run seed`), allowing organizers to version-control challenges in Git and avoid tedious manual data entry.
*   **Event State:** The platform respects event timing parameters (`startTime`, `endTime`, `scoreboardFreezeTime`).

### 4. Bespoke UI / UX 🎨
*   A custom Vanilla CSS design system built from scratch, ensuring zero unused CSS and maximum flexibility.
*   Features glassmorphism cards, animated scan-lines, neon gradients, JetBrains Mono typography, and responsive grid layouts.

## 🏃‍♂️ How to Run

You can run the entire stack natively on your OS!

### 1. Initialize the Backend
Open a terminal in the `ctf-platform/backend` folder:
```bash
# Set Bun Path (only if Bun is not globally recognized by PowerShell)
$env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"

bun install
bun run db:push    # Pushes the schema to the local SQLite database
bun run seed       # Loads the sample challenges and creates the admin user
bun run dev        # Starts the Elysia server on port 3000
```
*(Admin credentials are `admin` / `admin123`)*

### 2. Start the Frontend
Open a new terminal in the `ctf-platform/frontend` folder:
```bash
# Set Bun Path (only if Bun is not globally recognized by PowerShell)
$env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"

bun install
bun run dev        # Starts the Vite dev server on port 5173
```

### 3. View the Database Visually
If you want to view or edit users/solves directly, open a new terminal in the `backend` folder:
```bash
bun run db:studio
```

## 🛡️ Security & Performance
*   **JWT Auth:** Stateless authentication using the Web Crypto API.
*   **Rate Limiting:** In-memory sliding-window rate limiting prevents brute-forcing of flags.
*   **Input Validation:** Strict TypeBox schemas on all Elysia routes prevent malformed payloads.
