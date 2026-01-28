# Monday Badminton Club

A Next.js web app for managing weekly badminton club signups with waitlist functionality and admin payment tracking.

## Features

- **Player Signup**: Simple password-protected signup for weekly sessions
- **Waitlist System**: Auto-promotion when players cancel
- **Admin Dashboard**: Manage sessions, track payments, adjust court counts
- **Auto-Archive**: Automatic session archiving at Tuesday 00:00

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your database connection string from Settings > Database > Connection string (URI)

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Your Supabase publishable key
- `SUPABASE_SECRET_KEY` - Your Supabase secret key
- `DATABASE_URL` - Your Supabase database connection string (for migrations)
- `USER_PASSWORD` - Shared password for player signup
- `ADMIN_PASSWORD` - Admin dashboard password
- `CRON_SECRET` - Secret for securing the cron endpoint (any random string)

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Database Migrations

```bash
npm run migrate
```

This will:
- Create a backup of existing data (saved to `/backups`)
- Create the required tables if they don't exist
- Run any pending migrations

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add all environment variables in Vercel project settings
4. Deploy

The cron job for auto-archiving is configured in `vercel.json` and runs automatically every Tuesday at 00:00 UTC.

## Usage

### For Players
1. Visit the site and enter the shared password
2. Enter your name to sign up for the next session
3. Cancel anytime by clicking the cancel button

### For Admins
1. Visit `/admin` and enter the admin password
2. View all sessions and their players
3. Adjust court count (2 or 3 courts)
4. Mark players as paid/unpaid
5. Remove players if needed
6. Archive/unarchive sessions manually

## Session Rules

- **2 courts**: Maximum 14 players
- **3 courts**: Maximum 20 players
- Sessions are automatically archived after the Monday session date passes
