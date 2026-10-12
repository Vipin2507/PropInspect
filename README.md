# SnagDesk (PropInspect)

**SnagDesk** is a snagging and de-snagging inspection platform for residential / commercial property handovers. Site engineers walk flats with a structured checklist, QA checkers review submissions, and admins manage projects, users, templates, and reports. The same web app runs in the browser and as an **Android APK** (Capacitor).

| | |
|---|---|
| **Product name** | SnagDesk |
| **Repo folder** | `PropInspect` |
| **Production URL** | https://snagdesk.cravingcodetech.in |
| **API health** | `GET /api/health` → `{"status":"ok","app":"SnagDesk API"}` |
| **Stack** | React + Vite + Tailwind · Express + Node SQLite · Capacitor Android · PM2 + nginx |

---

## Table of contents

1. [Why this product exists](#1-why-this-product-exists)
2. [Who uses it (roles)](#2-who-uses-it-roles)
3. [End-to-end business workflow](#3-end-to-end-business-workflow)
4. [Domain model](#4-domain-model)
5. [Status machines](#5-status-machines)
6. [Feature catalogue by role](#6-feature-catalogue-by-role)
7. [Repository structure](#7-repository-structure)
8. [Backend architecture](#8-backend-architecture)
9. [Frontend architecture](#9-frontend-architecture)
10. [Mobile (Android / Capacitor)](#10-mobile-android--capacitor)
11. [Default checklist](#11-default-checklist)
12. [API overview](#12-api-overview)
13. [Auth, security, and CORS](#13-auth-security-and-cors)
14. [Offline, sync, and media](#14-offline-sync-and-media)
15. [Notifications](#15-notifications)
16. [Local development](#16-local-development)
17. [Production deploy](#17-production-deploy)
18. [Environment variables](#18-environment-variables)
19. [Seed credentials](#19-seed-credentials)
20. [Scripts reference](#20-scripts-reference)

---

## 1. Why this product exists

Before handover, every flat must be inspected against a trade-wise checklist (electrical, plumbing, painting, fire, etc.). Defects (“snags”) must be recorded with photos, fixed (de-snagging), and verified.

SnagDesk replaces paper / WhatsApp / spreadsheets with:

- A **shared project tree**: Project → Tower → Floor → Flat
- A **repeatable checklist** per flat (template-driven)
- **Role-based apps** for engineers, QA checkers, admins, and read-only viewers
- **Photo evidence**, status tracking, review decisions, and an audit trail
- **Field-friendly Android** builds that talk to the same API as the web app

---

## 2. Who uses it (roles)

| Role | Purpose |
|------|---------|
| **admin** | Full control: projects, towers, flats, users, assignments, templates, reports, monitoring, notification settings, flat status / handover |
| **engineer** | Inspect assigned flats, fill checklist items (pass / fail / N.A.), upload photos, submit / resubmit, work snags, see QA feedback |
| **qa** | Review submitted inspections (per-task + overall decision), browse all flats, track engineer changes, review history |
| **viewer** | Read-only admin-style dashboards and reports (no destructive writes) |

After login, users are redirected to a role home:

- admin / viewer → `/admin`
- engineer → `/engineer/dashboard`
- qa → `/qa/dashboard`

---

## 3. End-to-end business workflow

```text
Admin creates Project
   └─ adds Towers (auto-generates Floors + Flats)
   └─ assigns Engineer + QA per flat (or bulk)
   └─ (optional) customises checklist templates / Excel bulk status upload

Engineer opens assigned flat
   └─ starts / continues inspection (draft)
   └─ per category → per item: Pass | Fail | N.A. | Pending
   └─ Fail items collect remarks + images → become Snags on submit
   └─ submits inspection → Flat = submitted

QA opens pending review
   └─ starts review; per-task QA decision (approved / rejected / revision)
   └─ overall: approved | rejected | revision_required
   └─ Engineer notified; may resubmit after revision

Snags (failed / rejected work)
   └─ De-snagging list → rectify with after photos
   └─ QA / process verifies & closes

Admin
   └─ monitors status, activity, reports
   └─ can mark flat handed_over when complete
```

### Typical day-in-the-life

| Actor | Day-to-day use |
|-------|----------------|
| Engineer on site | Open APK → My Flats → fill checklist category by category → camera photos → submit |
| QA in office / site | Pending Reviews → Review Detail → approve / reject / ask revision → Changes Log for mid-cycle edits |
| Admin / PM | Dashboard KPIs → Flat Monitoring → Reports CSV → User & assignment management |
| Viewer | Same reporting surfaces without edit rights |

---

## 4. Domain model

```text
User
Project
  └── Tower
        └── Floor
              └── Flat  ←── Assignment (engineerId, qaId)
                    └── Inspection (1 per flat, UNIQUE)
                          ├── Response[] (one per checklist item)
                          │     └── Image[]
                          ├── Snag[] (from failed items)
                          └── Review[] (QA decisions over time)
```

| Entity | Meaning |
|--------|---------|
| **Project** | Development site (`name`, `location`, `developerName`, status active / completed / on_hold) |
| **Tower** | Building wing; creating a tower generates floors + flats from `totalFloors`, `unitsPerFloor`, `unitPrefix`, `startNumber` |
| **Floor** | Level within a tower |
| **Flat** | Inspectable unit; carries lifecycle `status` |
| **Assignment** | Maps one flat → one engineer + one QA (unique per flat) |
| **Checklist template** | Named set of categories + items (JSON `sections`); one marked `is_default` |
| **Inspection** | Work-in-progress or submitted checklist for a flat |
| **Response** | Result for one template item (`pass` / `fail` / `na` / `pending`) + remarks + optional QA decision |
| **Snag** | Defect tied to a failed response; severity + rectification lifecycle |
| **Image** | Before / after / evidence photo (Sharp thumbnails on upload) |
| **Review** | QA verdict for an inspection |
| **Notification** | In-app (and local push on Android) event for a user |
| **Flat history** | Timeline of status / review / assignment events |
| **Task change log** | Engineer edits after QA visibility (QA Changes Log) |
| **Engineer feedback** | QA task-level feedback the engineer must see |
| **App settings** | Toggles for which notifications fire |

---

## 5. Status machines

### Flat status

`not_started` → `in_progress` → `submitted` → `approved` | `rejected` | `revision_required` → (loop) → `desnagging` → `handed_over`

| Status | Meaning |
|--------|---------|
| `not_started` | No meaningful inspection work yet |
| `in_progress` | Engineer actively filling checklist |
| `submitted` | Waiting for QA |
| `approved` | QA accepted inspection |
| `rejected` | QA rejected |
| `revision_required` | Engineer must fix & resubmit |
| `desnagging` | Defects being rectified |
| `handed_over` | Unit complete for handover (admin action) |

### Inspection status

`draft` → `submitted` → `approved` | `rejected` | `revision_required`

Editable only in `draft` or `revision_required`.

### Response (item) status

`pending` | `pass` | `fail` | `na`

Optional per-item QA: `approved` | `rejected` | `revision_required`.

### Snag status

`open` → `assigned` → `in_rectification` → `rectified` → `verified` / `closed` (or `rejected`)

Severity: `critical` | `major` | `minor`.

---

## 6. Feature catalogue by role

### Authentication & profile (all roles)

- Email + password login (JWT)
- OTP login via registered mobile (dev / seeded OTP flow)
- Profile page: name, email, mobile, password change
- Protected routes by role; idle session via stored token

### Admin

| Area | Capabilities |
|------|----------------|
| **Dashboard** | Project / flat KPIs, drill-downs |
| **Projects** | CRUD projects; add towers (auto floors/flats); project detail stats |
| **Tower / flat mgmt** | Browse floors & flats; assign engineer + QA (single / bulk); status control |
| **Users** | Create users (roles), edit, reset password, activate / deactivate, delete |
| **Templates** | Create / edit / delete checklist templates (sections & items) |
| **Bulk upload** | Download Excel checklist template for a project; upload filled sheet to set Pass / N.A. / blank statuses |
| **Reports** | Overview, flats report with filters, CSV export |
| **Flat monitoring** | Cross-project status monitoring |
| **Activity log** | Recent inspection / review activity |
| **Notification settings** | Enable/disable event types; resume idle hours; notify admins |

### Engineer

| Area | Capabilities |
|------|----------------|
| **Dashboard** | Assigned work summary |
| **My Flats** | List / filter assigned flats |
| **Flat detail** | Status, progress, history entry points |
| **Fill checklist** | Category navigation; item pass/fail/na; remarks; camera / gallery upload; mandatory-image rules |
| **Category / inspection summary** | Completion overview before submit |
| **Submit / resubmit** | Validation + snag generation on fail |
| **Flat snags** | Snags for that flat |
| **Changes / feedback** | Engineer-facing change & QA feedback logs |
| **Notifications** | In-app list; tap navigates to flat / review context |
| **De-snagging** | Shared snag list + detail (rectify with after images) |

### QA

| Area | Capabilities |
|------|----------------|
| **Dashboard** | Queue counts & overview |
| **Pending reviews** | Inspections awaiting decision |
| **Review detail** | Start / resume review; per-item QA decisions; overall approve / reject / revision |
| **Review history** | Past decisions |
| **All flats** | Checker flat list with filters |
| **Changes log** | Unreviewed engineer task updates; mark reviewed |
| **De-snagging** | Verify / close rectifications |

### Viewer

- Admin dashboard, projects, reports, monitoring, activity (read-oriented access via admin routes)

---

## 7. Repository structure

```text
PropInspect/
├── backend/                 # Express API (TypeScript)
│   ├── src/
│   │   ├── index.ts         # App bootstrap, CORS, rate limits, route mount
│   │   ├── constants/       # Default checklist definition
│   │   ├── db/              # SQLite schema, migrations, seed
│   │   ├── middleware/      # JWT auth, error handler
│   │   ├── routes/          # REST routers (one domain per file)
│   │   ├── services/        # e.g. sync helpers
│   │   └── utils/           # notifications, stats, history, settings, mappers
│   ├── data/                # snagdesk.db (runtime, gitignored)
│   ├── uploads/             # Image files (runtime)
│   ├── .env.example
│   └── package.json
│
├── frontend/                # React SPA + Capacitor shell
│   ├── src/
│   │   ├── App.tsx          # Routes
│   │   ├── pages/           # Screen-level UI by role
│   │   ├── components/      # UI, layout, inspection, review, desnagging
│   │   ├── hooks/           # Data-fetching hooks
│   │   ├── store/           # Zustand (auth, sync, notifications, …)
│   │   ├── utils/           # api, sync, IndexedDB, prefetch, media
│   │   ├── constants/       # Route path helpers
│   │   └── types/           # Shared TypeScript models
│   ├── android/             # Capacitor Android project
│   ├── .env.production      # Production / APK API URLs
│   ├── capacitor.config.ts
│   └── package.json
│
├── deploy/                  # nginx reference configs
├── scripts/
│   ├── deploy.sh            # VPS pull + build + PM2 + htdocs sync
│   ├── vps-bootstrap.sh     # First-time server setup
│   ├── setup-domain-ssl.sh  # Domain + certbot helper
│   └── install-github-runner.sh
├── ecosystem.config.cjs     # PM2 process definition
└── .github/workflows/deploy.yml
```

---

## 8. Backend architecture

- **Runtime:** Node.js **≥ 22.5** (uses built-in `node:sqlite` with `--experimental-sqlite`)
- **Framework:** Express 4
- **DB:** SQLite file (`DB_PATH`, default `./data/snagdesk.db`), WAL mode, foreign keys
- **Uploads:** Multer + Sharp (resize / thumbnails) under `UPLOADS_DIR`
- **Auth:** bcrypt passwords, JWT (`Authorization: Bearer …`)
- **Validation:** Zod on key payloads
- **Process manager (prod):** PM2 app name `propinspect-api` via `ecosystem.config.cjs`

On startup the API:

1. Opens / migrates the database  
2. Seeds users + sample project **only if the DB is empty**  
3. Refreshes the **default checklist template** from `DEFAULT_CHECKLIST_CATEGORIES`  

### Route modules (`/api/...`)

| Prefix | Responsibility |
|--------|----------------|
| `/auth` | Login, register, me, profile, OTP send/verify |
| `/projects` | Project CRUD + stats |
| `/towers` | Tower CRUD (generates floors/flats) |
| `/floors` | List floors |
| `/flats` | List / get / history / checker list / status / handover |
| `/assignments` | Assign engineer + QA (single & bulk) |
| `/templates` | Checklist template CRUD |
| `/inspections` | Get by flat, save, submit, resubmit |
| `/responses` | Engineer item status; QA per-task decision |
| `/snags` | List / get / rectify / verify-close |
| `/reviews` | Queue, start, submit, history |
| `/images` | Upload / delete |
| `/users` | Admin user management |
| `/notifications` | List, unread count, mark read |
| `/reports` | Overview, activity, flats, CSV export |
| `/sync` | Offline push / pull |
| `/bulk-upload` | Excel template download + checklist upload |
| `/qa/changes` | QA changes log |
| `/engineer/feedback` | Engineer feedback inbox |
| `/settings` | App / notification settings |
| `/health` | Liveness (no auth, not rate-limited like login) |

Static files: `/uploads/...`

---

## 9. Frontend architecture

- **React 18** + **Vite 5** + **TypeScript**
- **Tailwind CSS** + Radix primitives + Framer Motion
- **React Router** with nested `ProtectedRoute` by role
- **Zustand** for auth, sync status, notifications, project filters, prefetch
- **Axios** client in `src/utils/api.ts`
  - Web prod: relative `/api` (same-origin via nginx)
  - Native: absolute `VITE_NATIVE_API_BASE_URL` (HTTPS domain)
- **IndexedDB** (`idb`) for offline cache of flats / inspections / pending changes
- **PWA** (`vite-plugin-pwa`) for installable web (skipped on raw-IP hosts)
- **Recharts** for admin charts; **xlsx** for Excel bulk flows

### Key frontend folders

| Path | Role |
|------|------|
| `pages/auth` | Login, OTP |
| `pages/engineer` | Dashboard, flats, checklist, summaries, snags, notifications, changes |
| `pages/qa` | Dashboard, reviews, history, all flats, changes |
| `pages/admin` | Dashboard, projects, users, templates, reports, monitoring, activity, settings |
| `pages/desnagging` | Snag list + detail (shared) |
| `pages/profile` | Account settings |
| `components/inspection` | Checklist UI, image uploader, submit bar |
| `components/review` | Review rows / actions |
| `components/layout` | App shell, sidebar, navbar, offline banner |
| `hooks/*` | Thin API wrappers used by pages |
| `utils/prefetch.ts` | Post-login data warm-up |
| `utils/notificationNavigation.ts` | Deep-link from notification → screen |
| `utils/localPush.ts` | Capacitor local notifications while app is open |

---

## 10. Mobile (Android / Capacitor)

| Setting | Value |
|---------|--------|
| App ID | `com.propinspect.app` |
| App name | PropInspect |
| Web dir | `frontend/dist` |
| Scheme | HTTPS (`androidScheme: 'https'`) |
| CapacitorHttp | **Disabled** (avoids broken axios POST bodies) |

Production native API:

```env
VITE_NATIVE_API_BASE_URL=https://snagdesk.cravingcodetech.in/api
```

Network security trusts system CAs for `snagdesk.cravingcodetech.in` (Let’s Encrypt).

### Build APK

```bash
cd frontend
npm ci
npm run apk:debug      # or apk:release
```

Equivalent steps:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK output under `frontend/android/app/build/outputs/apk/`.

> Rebuild the APK whenever `.env.production` API URLs change — Vite bakes them at build time.

---

## 11. Default checklist

Defined in `backend/src/constants/checklist.ts` and synced into the default template on API start.

| # | Category | Example items |
|---|----------|----------------|
| 1 | Electrical Work | DP board, wiring, switch plates, gypsum, … |
| 2 | Plumbing Work | Sanitary, W/C, wash basin, CP fittings |
| 3 | Tiling Work | Tiling (mandatory image) |
| 4 | Internal Painting | Sanding, putty coats, primer, single/double coat |
| 5 | Deck / Kitchen Railing | Base/shoe, glass, hand rail |
| 6 | Aluminium Window | Living, bedrooms, toilets, kitchen, … |
| 7 | Modular Kitchen | Shutter fitting / alignment |
| 8 | Fire Fighting | Passage, piping, sprinkler, detectors, testing |
| 9 | Cabling Work | Doors, locks, VDP, indoor display, outdoor camera |
| 10 | Wooden Polishing | Main / internal door polish |

Items may set `isMandatoryImage: true` so submit / save validates photo presence.

Admins can also maintain **custom templates** in the UI (JSON sections stored on `checklist_templates`).

---

## 12. API overview

Base URL (local): `http://localhost:4000/api`  
Base URL (prod web): `https://snagdesk.cravingcodetech.in/api`

All authenticated routes expect:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Auth examples

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/profile` | Update profile / password |
| POST | `/auth/otp/send` | `{ mobile }` |
| POST | `/auth/otp/verify` | `{ mobile, otp }` |

### Inspection examples

| Method | Path | Notes |
|--------|------|-------|
| GET | `/inspections/flat/:flatId` | Get or create draft for engineer |
| PUT | `/inspections/:id` | Save response batch |
| POST | `/inspections/:id/submit` | Submit + create snags from fails |
| POST | `/inspections/:id/resubmit` | After revision_required |
| PATCH | `/responses/:id` | Single item status |
| PATCH | `/responses/:id/qa-decision` | QA per-task verdict |

### Health

```bash
curl -s https://snagdesk.cravingcodetech.in/api/health
```

---

## 13. Auth, security, and CORS

- Passwords hashed with **bcrypt**
- JWT secret / expiry from env (`JWT_SECRET`, `JWT_EXPIRES_IN`)
- **Helmet** + CORS allow-list (domain, localhost ports, Capacitor origins)
- Auth endpoints rate-limited; authenticated API traffic largely skipped from tight limits
- `/api/health` always open for uptime checks
- Role checks in route handlers / `ProtectedRoute`

---

## 14. Offline, sync, and media

Designed for site engineers with spotty connectivity:

1. **IndexedDB** caches flats, inspections, and images metadata  
2. Failed writes can queue as **pending changes**  
3. `/api/sync/push` and `/api/sync/pull` reconcile with the server  
4. **Offline banner** surfaces connectivity state  
5. Images: upload with compression limits (`VITE_MAX_IMAGE_SIZE_MB`, `VITE_MAX_IMAGES_PER_ITEM`); native uses Capacitor Camera / Filesystem  
6. `resolveMediaUrl()` turns `/uploads/...` into absolute HTTPS URLs inside the Android WebView  

---

## 15. Notifications

### Server-side events (examples)

- Inspection started / resumed / submitted  
- QA review started / resumed  
- Inspection approved / rejected / revision required  
- Per-task QA feedback (`qa_task_revision`, `qa_task_rejected`)  
- Flat completion  
- Snag assigned / rectified  
- Overdue-style reminders (where implemented)

Admin toggles live under **Notification settings** (`app_settings` keys like `notif.engineer_start_flat`, `notif.resume_idle_hours`, …).

### Client

- In-app notification list + unread badge  
- Deep navigation into the relevant flat / review  
- On Android: **local notifications** when the app is foregrounded and new items arrive  

---

## 16. Local development

### Prerequisites

- Node.js **≥ 22.5**
- npm

### Backend

```bash
cd backend
cp .env.example .env   # edit JWT_SECRET etc.
npm ci
npm run dev            # http://localhost:4000
```

Empty DB auto-seeds sample users + “Green Heights” project.

### Frontend

```bash
cd frontend
cp .env.example .env   # optional; defaults work with Vite proxy
npm ci
npm run dev            # http://localhost:5173  (proxies /api → :4000)
```

Vite proxy (`vite.config.ts`) forwards `/api` and `/uploads` to `http://localhost:4000`.

---

## 17. Production deploy

### Live topology (CloudPanel)

| Piece | Location / value |
|-------|------------------|
| App checkout | `/home/snagdesk/apps/PropInspect` |
| Web root (SPA) | `/home/snagdesk/htdocs/snagdesk.cravingcodetech.in` |
| API process | PM2 `propinspect-api` |
| API port | **4010** (4000 may be used by other apps on the same VPS) |
| Nginx | Proxies `/api/` and `/uploads/` → `127.0.0.1:4010` |
| TLS | Let’s Encrypt for `snagdesk.cravingcodetech.in` |

### GitHub Actions

Workflow: `.github/workflows/deploy.yml` (push to `main` or manual run).

SSHs to the VPS and runs `scripts/deploy.sh`, which:

1. `git fetch` + hard reset to `origin/main` (marks `safe.directory` for root→snagdesk ownership)
2. `npm ci` + build backend & frontend  
3. `rsync` `frontend/dist` → `WEB_ROOT` (keeps `.well-known`)  
4. `pm2 restart propinspect-api`

**Required GitHub secrets (typical):**

| Secret | Example |
|--------|---------|
| `VPS_SSH_PRIVATE_KEY` | Deploy private key |
| `VPS_HOST` | `69.62.84.237` |
| `VPS_USER` | `root` |
| `DEPLOY_PATH` | `/home/snagdesk/apps/PropInspect` |
| `WEB_ROOT` | `/home/snagdesk/htdocs/snagdesk.cravingcodetech.in` |
| `PM2_APP_NAME` | `propinspect-api` |
| `VPS_SSH_KNOWN_HOSTS` | Optional; workflow also `ssh-keyscan`s the host |

### Manual deploy on server

```bash
export DEPLOY_PATH=/home/snagdesk/apps/PropInspect
export WEB_ROOT=/home/snagdesk/htdocs/snagdesk.cravingcodetech.in
export PM2_APP_NAME=propinspect-api
bash scripts/deploy.sh
```

Reference nginx: `deploy/nginx.snagdesk.conf`.

---

## 18. Environment variables

### Backend (`backend/.env`)

| Variable | Purpose | Dev default |
|----------|---------|-------------|
| `PORT` | HTTP listen port | `4000` (prod often `4010`) |
| `NODE_ENV` | `development` / `production` | |
| `JWT_SECRET` | Sign tokens (≥ 32 chars in prod) | |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `DB_PATH` | SQLite file path | `./data/snagdesk.db` |
| `UPLOADS_DIR` | Upload directory | `./uploads` |
| `MAX_FILE_SIZE_MB` | Upload cap | `10` |
| `CORS_ORIGIN` | Primary allowed origin | `http://localhost:5173` |

### Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Web API base (`/api` in prod, `http://localhost:4000/api` in dev) |
| `VITE_NATIVE_API_BASE_URL` | Absolute API for Capacitor |
| `VITE_APP_NAME` | Display name |
| `VITE_MAX_IMAGE_SIZE_MB` | Client image size hint |
| `VITE_MAX_IMAGES_PER_ITEM` | Cap images per checklist item |

---

## 19. Seed credentials

Created **only when the users table is empty** (first boot):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@snagdesk.in` | `Admin@123` |
| Engineer | `engineer@snagdesk.in` | `Eng@1234` |
| QA | `qa@snagdesk.in` | `QA@12345` |
| Viewer | `viewer@snagdesk.in` | `View@123` |

Also seeds project **Green Heights** (Bhopal), Towers A/B, and assigns the first few Tower A flats to the engineer + QA.

> Change passwords immediately on any shared / production database. Production DBs copied from live servers will **not** re-seed.

---

## 20. Scripts reference

### Backend

```bash
npm run dev      # tsx watch + experimental sqlite
npm run build    # tsc → dist/
npm start        # node --experimental-sqlite dist/index.js
npm run seed     # run seed script explicitly
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run cap:sync
npm run apk:debug
npm run apk:release
```

### Ops

```bash
bash scripts/deploy.sh
bash scripts/vps-bootstrap.sh
sudo -E bash scripts/setup-domain-ssl.sh
```

---

## Glossary

| Term | Meaning |
|------|---------|
| **Snag** | A recorded defect against a checklist item |
| **De-snagging** | Rectifying snags and getting them verified/closed |
| **Checklist** | Template of trade categories and line items applied to a flat |
| **Inspection** | One flat’s filled checklist instance |
| **QA / Checker** | Quality reviewer who approves or sends work back |
| **Handover** | Final flat status when the unit is ready for the client |

---

## License / ownership

Private project for SnagDesk / Craving Code Tech. Not published as open source unless the owners state otherwise.
