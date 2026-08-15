# 🚩 CTF Platform Backend (Coding Club)

Welcome to the **High-Performance CTF (Capture The Flag) Platform**! This backend system is engineered to handle 500-600 concurrent participants reliably. It is built from the ground up for speed, simplicity, and strict session integrity.

Whether you are a developer extending the codebase or a first-time organizer looking to run a competition, this guide will explain **everything** you need to know.

---

## 📖 Table of Contents
1. [What is a CTF?](#-what-is-a-ctf)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Prerequisites & Installation](#-prerequisites--installation)
4. [Running the Platform](#-running-the-platform)
5. [Organizer Guide (Admin Console)](#-organizer-guide-admin-console)
6. [Participant Guide (Arena)](#-participant-guide-arena)
7. [Database Management (Drizzle Studio)](#-database-management-drizzle-studio)
8. [Real-time Events (WebSockets)](#-real-time-events-websockets)

---

## 🎮 What is a CTF?
A **Capture The Flag (CTF)** is a cybersecurity and programming competition. Participants (Teams) are given a set of challenges (e.g., finding hidden text on a website, decrypting a secret message, or exploiting a mock vulnerability). 

When a team solves a challenge, they discover a secret "Flag" (usually formatted like `flag{this_is_the_secret}`). They submit this flag to the platform to earn points and climb the real-time leaderboard!

---

## 🚀 Tech Stack & Architecture

This backend is built on modern, ultra-fast technologies:
* **Runtime:** [Bun](https://bun.sh/) - A blazing fast JavaScript runtime that replaces Node.js.
* **Framework:** [ElysiaJS](https://elysiajs.com/) - A high-performance web framework for handling REST APIs and WebSockets.
* **Database & ORM:** SQLite + [Drizzle ORM](https://orm.drizzle.team/). We use SQLite in **WAL (Write-Ahead Logging)** mode, meaning it is incredibly fast and requires absolutely zero complex database installation (no need to install PostgreSQL or MySQL).
* **Testing Client:** Zero-build vanilla HTML/CSS/JS files are provided in the `/public` folder to immediately test the APIs without needing a React frontend.

---

## 🛠️ Prerequisites & Installation

### 1. Install Prerequisites
If you are running this for the first time, you **must** install Bun.
- **Mac/Linux:** Run `curl -fsSL https://bun.sh/install | bash` in your terminal.
- **Windows:** Run `powershell -c "irm bun.sh/install.ps1 | iex"` in PowerShell.

### 2. Download and Install Dependencies
Open your terminal, navigate to the folder containing this code, and run:
```bash
bun install
```
*(This command downloads all the required libraries needed to run the server).*

### 3. Initialize the Database
Before you can run the server, you need to create the database structure (tables, columns, etc). Run:
```bash
bun run db:push
```
*(This command reads our schema file and automatically generates a local `sqlite.db` file).*

### 4. Seed the Database (Optional but Recommended)
To test the platform, you'll want some mock data (fake teams, fake challenges, and a mock event). Run:
```bash
bun run seed
```
*(This populates the database with an event named `Main CTF 2026`, 3 mock challenges, and 3 test teams).*

---

## 🏃 Running the Platform

To start the CTF server, simply run:
```bash
bun run dev
```
The server is now live at `http://localhost:3000`. Leave this terminal window open while you are using the platform!

---

## 👑 Organizer Guide (Admin Console)

Once the server is running, organizers can manage the entire event via the built-in Admin Console.
**Access it here:** [http://localhost:3000/public/admin.html](http://localhost:3000/public/admin.html)

### Key Admin Features:
1. **Multi-Event Architecture:** You can host multiple distinct CTF events over time. Creating a new event automatically allocates a secure folder for challenge files. **WARNING:** Deleting an event is a destructive action that wipes all teams, submissions, and files associated with it.
2. **Event Controls:** You can **Start**, **Pause**, and **Stop** the active event. If paused, no one can submit flags. You can also **Freeze the Scoreboard** in the final hour to build suspense!
3. **CSV Team Verification:** If teams registered via Google Forms, export their responses as a `.csv` file. You can upload this directly to the Admin Console to instantly cross-verify their accounts in the database!
4. **Session Management:** The platform enforces strict **1-Team-1-Device** locking to prevent cheating. If a team's browser crashes and they are locked out, you can click "Reset Session" to free up their account.

---

## 🧑‍💻 Participant Guide (Arena)

Participants interact with the Arena.
**Access it here:** [http://localhost:3000/public/index.html](http://localhost:3000/public/index.html)

### How to test it as a participant:
If you ran `bun run seed`, use these credentials to log in:
- **Team Name:** `sudoers`
- **Leader Name:** `alice`

*(Try logging in with these credentials on a normal browser tab, and then try logging in again on an Incognito tab. The server will reject the second login to protect session integrity!)*

Once logged in, participants can view the active challenges, submit flags, and watch the real-time leaderboard update instantly.

---

## 🗄️ Database Management (Drizzle Studio)

Drizzle Studio is an incredible built-in tool that gives you a beautiful web interface to view and edit your SQLite database without writing a single line of SQL code.

**How to open Drizzle Studio:**
1. Open a **new, separate terminal window** (keep your `bun run dev` server running in the first one).
2. Ensure you are in the `ctf-platform` folder.
3. Run this command:
```bash
bunx drizzle-kit studio
```
4. Open your browser to the link provided in the terminal (usually `https://local.drizzle.studio`).

**What can you do here?**
- View all registered teams and their passwords.
- Manually change a challenge's point value.
- View the exact timestamp of every flag submission.
- Manually ban a team by editing their status column.

---

## 📡 Real-time Events (WebSockets)

To make the CTF feel alive, the backend uses WebSockets to instantly push updates to all connected players without them needing to refresh the page.

If you are building a custom frontend (like React or Vue), connect to `ws://localhost:3000/ws`. The server broadcasts these JSON payloads automatically:

- **Leaderboard Changes:** `{"type": "leaderboard:update", "payload": { ... } }`
- **First Blood (First team to solve a challenge):** `{"type": "challenge:first_blood", "payload": { "challengeName": "...", "teamName": "...", "eventId": 1 } }`
- **Event State:** `{"type": "event:state_change", "payload": { "action": "pause|start|stop", "timestamp": 123456789, "eventId": 1 } }`
