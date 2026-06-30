# TingTing Travel App

Korean travel MVP — explore 17 regions, record visits with photos, complete GPS quests, and spend stars on AI photo effects.

## Structure

- `apps/mobile` — Expo React Native app (expo-router)
- `packages/shared` — shared types, regions, constants
- `supabase/migrations` — Postgres schema + RLS + RPCs
- `seed/places.json` — sample places per region

## Quick Start (local mode — no Supabase required)

```bash
cd apps/mobile
npm install
npx expo start
```

Use **Demo Mode** on the login screen. Data persists in AsyncStorage via `lib/local-store.ts`.

## Supabase (optional)

1. Create a Supabase project
2. Run `supabase/migrations/001_initial.sql`
3. Seed `places` from `seed/places.json`
4. Copy `.env.example` to `.env` and set:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

When env vars are set, `lib/api.ts` uses Supabase; otherwise local-store is primary.

## Features

- Email login/signup + demo mode
- Premium indigo home dashboard with nation progress ring
- Map with 17 regions and places
- Visit recording with photo picker
- Photo editor (brightness, AI stubs: 뽀샵 / 하늘리터치, watermark)
- GPS quest verification
- Star shop
- Groups (1st free, 2nd+ costs 50 stars)
- UGC recommendations on place screens

## Scripts

```bash
npm run mobile          # from repo root
npm run typecheck       # TypeScript check
```
