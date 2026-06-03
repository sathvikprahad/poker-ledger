# Poker Tracker

A web app for tracking poker session results with your friend group over the summer.

## Features

- **Leaderboard** — all players ranked by total profit/loss, with trophy and skull highlights for biggest winner and loser
- **Player Stats** — per-player breakdown including total P/L, sessions played, average profit, best/worst session, and current win/loss streak
- **Session History** — full log of every session with each player's buy-in, cash-out, and result
- **Profit Chart** — cumulative profit/loss line chart across all sessions
- **Admin Panel** — password-protected panel to add/remove players, log new sessions, and edit or delete past sessions

## Tech Stack

- React + Vite
- Tailwind CSS
- Supabase (PostgreSQL)
- Deployed on Vercel

## Setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL Editor
2. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key
3. Install dependencies and run locally:

```bash
npm install
npm run dev
```

4. Deploy:

```bash
npx vercel --prod
```

## Admin Access

Click **Admin** in the top right corner. Default password: `poker2024` (change it in `src/components/AdminLogin.jsx`).
