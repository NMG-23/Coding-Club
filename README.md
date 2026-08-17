# 🚩 Comprehensive CTF Platform Backend Documentation

Welcome to the definitive, exhaustive guide for the **Coding Club CTF Platform**.

This document serves as the absolute source of truth for the platform. It explains **every single thing**—from how the code is structured, what every file does, how the database is designed, how the API works, and how to run it.

Whether you are an absolute beginner looking to understand the code, or an organizer trying to run an event, everything you need is documented here.

---

## 📖 Master Table of Contents

1. [Core Concepts: What is this Platform?](#1-core-concepts-what-is-this-platform)
2. [Tech Stack Breakdown](#2-tech-stack-breakdown)
3. [Step-by-Step Installation Guide](#3-step-by-step-installation-guide)
4. [Running the Server & Tools](#4-running-the-server--tools)
5. [Directory & File Structure (Explained)](#5-directory--file-structure-explained)
6. [Database Schema (Explained)](#6-database-schema-explained)
7. [System Workflows (How things actually work)](#7-system-workflows-how-things-actually-work)
8. [API Reference (All Endpoints)](#8-api-reference-all-endpoints)
9. [Organizer Guide (Admin features)](#9-organizer-guide-admin-features)

---

## 1. Core Concepts: What is this Platform?

A **Capture The Flag (CTF)** is a cybersecurity and programming competition. Teams compete to solve puzzles (Challenges). When they solve a puzzle, they find a secret text string called a "Flag". They submit this flag to the platform to earn points.

This specific platform was built to host these competitions for **500-600 concurrent users** reliably.

- It tracks teams, challenges, and scores.
- It prevents cheating by ensuring a team can only log in from **one device at a time**.
- It updates the scoreboard live on everyone's screen simultaneously using WebSockets.
- It supports hosting **multiple different events** over time without deleting old data.

---

## 2. Tech Stack Breakdown

This backend is built on ultra-fast, modern technologies:

- **[Bun](https://bun.sh/):** A modern JavaScript runtime. It replaces Node.js and `npm`. It is incredibly fast, runs TypeScript natively (no compilation needed), and has a built-in SQLite database engine.
- **[ElysiaJS](https://elysiajs.com/):** The web framework. Think of it like Express.js, but much faster. It handles our HTTP requests (API endpoints) and WebSockets.
- **[SQLite](https://sqlite.org/):** The database engine. Instead of a complex database server like PostgreSQL, the entire database is stored in a single local file called `sqlite.db`. It runs in WAL (Write-Ahead Logging) mode, making it safe for hundreds of concurrent users.
- **[Drizzle ORM](https://orm.drizzle.team/):** The tool we use to interact with the database using TypeScript instead of writing raw SQL strings.

---

## 3. Step-by-Step Installation Guide

If you are running this for the first time, follow these exact steps:

### Step 1: Install Bun

You **must** install Bun to run this project.

- **Mac/Linux:** Run `curl -fsSL https://bun.sh/install | bash` in your terminal.
- **Windows:** Run `powershell -c "irm bun.sh/install.ps1 | iex"` in PowerShell.

### Step 2: Install Project Packages

Open your terminal, navigate to the `ctf-platform` folder, and run:

```bash
bun install
```

_(This reads the `package.json` file and downloads all required code libraries into a `node_modules` folder)._

### Step 3: Initialize the Database

We need to create the `sqlite.db` file and build the tables. Run:

```bash
bun run db:push
```

_(This commands Drizzle to read our `schema.ts` file and generate the actual database)._

### Step 4: Seed the Database (Mock Data)

To test the platform, you need some fake challenges and teams. Run:

```bash
bun run seed
```

_(This runs the `src/scripts/seed.ts` file, creating a fake event, fake challenges, and teams like `sudoers`)._

---

## 4. Running the Server & Tools

### Starting the Main Backend Server

To start the API and WebSockets server, run:

```bash
bun run dev
```

- The server will start at `http://localhost:3000`.
- **Test Interfaces:** You can visit `http://localhost:3000/public/index.html` (Participant Arena) or `http://localhost:3000/public/admin.html` (Admin Dashboard) in your browser.

### Starting Drizzle Studio (Database GUI)

To view, edit, and manage your database data visually (like an Excel spreadsheet), open a **new** terminal window and run:

```bash
bunx drizzle-kit studio
```

- Open your browser to `https://local.drizzle.studio`.
- You can use this to manually change team passwords, verify accounts, or fix broken data without writing SQL.

---

## 5. Directory & File Structure (Explained)

Here is exactly what every folder and file in this project does:

- `public/` - Contains the vanilla HTML/JS files used to visually test the backend.
  - `admin.html` - The Organizer dashboard for creating events and verifying teams.
  - `index.html` - The Participant Arena for logging in and submitting flags.
  - `app.js` - The frontend logic connecting the HTML to our backend APIs.
- `src/` - The core backend source code.
  - `index.ts` - **The Entry Point**. This file initializes the ElysiaJS server, sets up CORS (so frontends can talk to it), mounts the API routes, and starts listening on port 3000.
  - `db/` - Database connection and definitions.
    - `index.ts` - Connects Bun to SQLite and enables WAL mode.
    - `schema.ts` - **The Blueprint**. Defines every single database table, column, and relationship using Drizzle ORM.
  - `routes/` - API Endpoints (The URLs the frontend talks to).
    - `admin.ts` - Endpoints for organizers (Creating events, wiping data, getting stats, CSV verification).
    - `arena.ts` - Endpoints for participants (Fetching challenges, submitting flags, getting the leaderboard).
    - `auth.ts` - Endpoints for logging in, verifying session tokens, and logging out.
  - `services/` - Core Business Logic.
    - `ctf.service.ts` - The "Brain" of the backend. Contains the complex logic for validating logins, checking if flags are correct, assigning points, and building the leaderboard.
  - `utils/`
    - `broadcast.ts` - Contains the function used to send live WebSocket messages to all connected players.
  - `scripts/`
    - `seed.ts` - A script that inserts mock data into the database for testing.
- `uploads/events/` - A folder generated dynamically by the backend to store files related to specific events (like images for challenges).
- `drizzle.config.ts` - Configuration file for Drizzle ORM (tells it where our schema and database are).
- `package.json` - Lists the project dependencies (like Elysia, Drizzle, xlsx).

---

## 6. Database Schema (Explained)

All data is stored in `sqlite.db`. Here are the tables defined in `src/db/schema.ts`:

1. **`events`**: Represents a CTF competition. Contains `id`, `name`, `startTime`, `endTime`, and `isActive`. (Only one event should be active at a time).
2. **`teams`**: Represents a registered team. Contains `teamName`, `leaderName`, `status` (active/banned), `activeSessionId` (tracks their login), and an `eventId` linking them to a specific event.
3. **`sessions`**: Tracks active logins. When a team logs in, a session ID is generated here. Contains `teamId`, `expiresAt`, `ipAddress`.
4. **`challenges`**: The puzzles. Contains `title`, `description`, `category`, `points`, `serverSideFlag` (the secret answer), and `eventId`.
5. **`submissions`**: An audit log of every single attempt a team makes (both right and wrong). Contains `teamId`, `challengeId`, `submittedFlag`, and `isCorrect`.
6. **`solves`**: A record of successful solves used to calculate the leaderboard. Contains `teamId`, `challengeId`, `points`, and `solvedAt` (used for tie-breakers).
7. **`event_config`**: Runtime toggles for the event. Contains `isPaused` (stops submissions) and `scoreboardFrozen` (hides the leaderboard updates from players).

---

## 7. System Workflows (How things actually work)

### The 1-Team-1-Device Login System

1. A team enters their Name and Leader Name.
2. The server (`auth.ts`) queries the database to find the currently active event.
3. It checks if the team exists in that event.
4. It checks the `teams.activeSessionId`. If it exists and hasn't expired, the server **rejects** the login (preventing account sharing).
5. If clear, it creates a new session in the `sessions` table, updates the `teams` table, and sends a session token cookie to the browser.

### The Flag Submission & Live Leaderboard System

1. A team submits a flag.
2. The server (`arena.ts` -> `ctf.service.ts`) validates the session.
3. It checks `event_config` to ensure the CTF isn't "paused" or "ended".
4. It compares the submitted flag to the `serverSideFlag` (ignoring case/spaces).
5. If correct, it logs it in the `solves` table.
6. If it's the **very first time** anyone solved it, the server broadcasts a `challenge:first_blood` WebSocket event.
7. The server recalculates the entire leaderboard and broadcasts a `leaderboard:update` WebSocket event. Every player's screen updates instantly.

### The Multi-Event & Deletion System

1. An admin creates a new event. The server creates a database row and creates a physical folder at `uploads/events/{id}`.
2. If an admin DELETES an event, Drizzle ORM executes a **Cascade Delete**—meaning it automatically deletes all teams, challenges, and solves attached to that `eventId` so no orphaned data is left behind.
3. The server then uses `fs.rmSync` to permanently delete the event's physical folder from the hard drive.

---

## 8. API Reference (All Endpoints)

### Participant Routes (`/api/auth` & `/api/arena`)

- **`POST /api/auth/login`**: Takes `{ teamName, leaderName }`. Returns a session cookie.
- **`POST /api/auth/logout`**: Clears the session cookie and nullifies `activeSessionId` in the database.
- **`GET /api/arena/challenges`**: Returns all challenges for the active event (requires session).
- **`POST /api/arena/submit`**: Takes `{ challengeId, flag }`. Checks if the flag is correct and updates scores (requires session).
- **`GET /api/arena/leaderboard`**: Returns the current sorted scoreboard.

### Admin Routes (`/api/admin`) _(Requires `Authorization: Bearer admin-secret-key`)_

- **`POST /events`**: Creates a new CTF event and its filesystem directory.
- **`DELETE /events/:eventId`**: Wipes an event, all its data, and its files.
- **`GET /stats`**: Returns metrics (total teams, active sessions, submission counts).
- **`POST /event-control`**: Takes an `action` (`start`, `pause`, `stop`, `freeze`, `unfreeze`) to manipulate the active event configuration.
- **`POST /reset-session`**: Takes a `teamId` and forces them to log out (useful if a team's computer crashes and they are locked out).
- **`POST /verify-teams/:eventId`**: Upload endpoint for `.xlsx` or `.csv` files. It bulk creates new teams or updates `isVerified` for existing ones.
- **`POST /import-challenges/:eventId`**: Upload endpoint for `.xlsx` or `.csv` files. It parses challenge data, handles flag normalization (`cc{...}`), appends hints, and bulk creates challenges.

---

## 9. Organizer Guide (Admin Features)

### How to Bulk Import Teams

If you used Google Forms or another service for registration:

1. Export your responses as a `.xlsx` or `.csv` file. Ensure it has columns named something close to "Team Name" and "Leader Name".
2. Open the Admin Console (`http://localhost:3000/public/admin.html`).
3. Under **Team Verification / Import**, select your file and click **Upload & Verify**.
4. The server will parse the file, register any missing teams, and mark them as verified.

### How to Bulk Import Challenges

1. Create an Excel (`.xlsx`) sheet. The platform automatically tries to map your columns based on variations of common names:
   - **Title**: `Title`, `Name`
   - **Description**: `Description`, `Statement`, `Question`
   - **Category**: `Category`, `Type`
   - **Difficulty**: `Difficulty`, `Level`
   - **Points**: `Points`, `Score`
   - **Hint**: `Hint`
   - **Flag**: `Flag`, `Answer`, `Answers`, `Capture`
2. Under **Challenge Import**, select your file and upload it.
3. The server will automatically format all your flags to `cc{answer}` if they aren't already, append hints to descriptions, and import everything instantly.

### Troubleshooting Common Issues

**1. "I logged in but the Challenge List is completely empty (0/0)!"**
This happens when your current active login session belongs to an older event, but new challenges were uploaded to a new Active Event. The platform strictly isolates challenges by event ID.
**Fix:** Click the **Exit** button in the top right to log out. Re-upload your teams list to ensure they are registered for the new event, then log back in.

**2. "The UI is frozen or components aren't showing up!"**
Ensure that `public/index.html` does not have duplicate versions of the `Lenis` smooth scroll library. Two instances running simultaneously will cause a global variable conflict and crash the UI rendering pipeline immediately after logging in.

### How to Free a Locked Team

If a team closes their browser abruptly, their session might remain active in the database, preventing them from logging back in.

1. Open the Admin Console.
2. Look at the **Teams / Session Reset** list.
3. Find the team and click **Reset Session**. They can now log in again.
