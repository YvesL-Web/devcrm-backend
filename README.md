# DevCRM Backend (Node.js + Express + TypeORM + Postgres)

Minimal, dev-first backend starter for the **DevCRM Portal**: client-facing changelog + time→invoice.
Everything is kept **simple** for a solo dev.

## Quickstart

```bash
# 1) Copy env
cp .env.example .env

# 2) Install deps
npm install

# 3) Make sure Postgres is running and DB exists
# createdb devcrm   # on mac/linux
# or create manually

# 4) Run in dev
npm run dev
```

The server listens on `http://localhost:4000` by default.

## Tech

- Node.js 20+, Express.js
- TypeORM (Data Mapper) + Postgres
- JWT auth (access + refresh)
- Zod validation
- Helmet, CORS, Rate limiting
- Morgan logging

## Structure

```
src/
  app.ts            # express app setup
  server.ts         # bootstrap
  config/
    data-source.ts  # TypeORM DataSource
    env.ts          # env parsing
  entities/         # TypeORM entities
  middleware/
    auth.ts         # JWT + currentOrg guard
  routes/
    auth.ts
    orgs.ts
    projects.ts
    clients.ts
    releases.ts
    time.ts
    invoices.ts
    portal.ts
    integrations.ts # GitHub stub
  utils/
    jwt.ts
    password.ts
```

## API (MVP)

- `POST /auth/register` → create user + default organization
- `POST /auth/login` → JWT access & refresh
- `POST /auth/refresh`
- `POST /orgs` (auth) → create organization
- `POST /clients` (auth) → create client for current org
- `POST /projects` (auth) → create project (with portal slug)
- `POST /projects/:id/releases` (auth) → create release (manual)
- `GET  /projects/:id/releases` (auth) → list releases
- `POST /projects/:id/time` (auth) → create time entry
- `POST /invoices` (auth) → create invoice + items
- `GET  /p/:slug` → public project portal (read-only)

> For multi-tenant scoping, send header `X-Org-Id: <organizationId>` on authed routes.
