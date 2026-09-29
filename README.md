# API Hub

A MERN app for adding, monitoring and browsing REST APIs. An admin adds any API from the website (URL, auth type, API key). Visitors can browse its data, and the server checks every API on a schedule and shows uptime and response times.

## Features
- **Admin panel:** JWT login, add, enable/disable and delete APIs from the UI
- **Data dashboard:** loads any JSON API through a server-side proxy and shows it as a table
- **Uptime monitor:** background checks every few minutes, 24-hour uptime, average latency and a response-time chart
- **Alerts:** optional Slack or Discord webhook message when an API goes down or recovers
- **Security:** API keys encrypted with AES-256-GCM, never sent to the browser, SSRF protection (private IPs blocked), Helmet, rate limiting, login throttling, field whitelisting
- **DevOps:** Docker Compose (Mongo + server + Nginx client), GitHub Actions CI, unit tests

## Tech stack
MongoDB, Express, React (Vite), Node.js, Mongoose, JWT, Docker, GitHub Actions

## Run locally
Needs Node 18+ and MongoDB.
```bash
cd server && cp .env.example .env   # edit the secrets
npm install && npm run dev
cd client && npm install && npm run dev   # http://localhost:5173
```

## Run with Docker
```bash
cp server/.env.example server/.env   # edit the secrets
docker compose up --build            # http://localhost:8080
```

## Try it
Log in under **Admin**, add `https://jsonplaceholder.typicode.com/users` (no key needed), then check **Dashboard** and **Status**.

## API routes
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/login` | public, rate limited |
| GET | `/api/sources` | public |
| GET | `/api/sources/:id/data` | public (proxied data) |
| GET | `/api/status` | public (uptime and latency) |
| GET, POST | `/api/admin/sources` | admin |
| PATCH, DELETE | `/api/admin/sources/:id` | admin |

## Tests
`cd server && npm test`

## Roadmap
User accounts with bcrypt, per-API check intervals, charts library, deployment (Render + Vercel + Atlas).
