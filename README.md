# Harroz

A daily video journal for you and your friends. Each night, post a short video about your day, then watch and react to your friends' days.

Built as an installable web app (PWA) for a small private group of friends, and used daily.

## What it does

- **Daily reel:** record a few seconds of video from your day and add it to your journal.
- **Friends feed:** see friends' daily posts, react, and message them directly.
- **Journal and calendar:** look back through past days, with an "On this day" view, mood tags, and a PIN lock for private entries.
- **Streaks, badges, and weekly recap:** light gamification to keep the habit going.
- **Push notifications:** daily reminders and message alerts, sent from scheduled server functions.
- **Voice messages and music:** attach a voice note or song to a post.

## Tech

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Query, React Router
- **Backend:** Supabase (Postgres with row-level security, auth, storage, realtime, edge functions)
- **Notifications:** Web Push (VAPID) with scheduled reminders via cron
- **Platform:** installable PWA, with a Windows 98-inspired interface

## Run it locally

```sh
npm install
npm run dev
```

You'll need a Supabase project. Apply the migrations in `supabase/migrations`, then add your own project URL and keys to a `.env` file. See `PUSH_SETUP_SIMPLE.md` for push-notification setup.

## Status

Personal project, actively used by me and a few friends. Not a production service.
