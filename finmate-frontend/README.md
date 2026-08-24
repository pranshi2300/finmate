# FinMate AI — Frontend Shell (Step 2)

React + Vite app: login, register, protected dashboard shell, wired to the
Step 1 backend's auth flow (access token in memory, refresh via httpOnly cookie).

## Setup

Make sure the backend (Step 1) is already running on port 5000 first.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173 — you'll land on `/login` since there's no session yet.

## How it fits together

- `src/api/axios.js` — one shared axios instance. Attaches the access token to
  every request, and if a request comes back `401` (expired token), it
  automatically calls `/auth/refresh` once and retries — the user never
  notices their 15-minute token expired.
- `src/context/AuthContext.jsx` — holds `user` in React state. On app load,
  it tries a silent refresh (using the cookie) so a returning visitor with a
  valid session skips the login screen entirely.
- `src/components/ProtectedRoute.jsx` — wraps routes that require a logged-in
  user; redirects to `/login` otherwise.

## Phase 11: Smart Notifications

The protected `/notifications` page provides search, priority and unread filters,
read/delete controls, and notification preferences. The dashboard bell opens a
compact drawer with the current unread count and a link to the full page. Both
use the shared Axios client, so notification requests use the existing JWT and
refresh-token flow.

## What's NOT built yet (next steps)

- Real dashboard content (income/expense CRUD, charts) — Step 3–4
- Everything after that per the roadmap

## Note on CORS

The backend's `.env` needs `CORS_ORIGIN="http://localhost:5173"` (already the
default) for the cookie-based refresh flow to work — the browser blocks
cross-origin cookies unless the server explicitly allows this exact origin.
