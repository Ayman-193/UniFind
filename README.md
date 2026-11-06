# UniFind: Campus Lost & Found

A university lost-and-found system built for the Software Product Engineering course (three-sprint Scrum project).
Students report lost items and check what the Lost & Found Office has found; the office manages every case.
It is a prototype: there are no real users and everything runs on seeded, fictional demo data.

## Stack

| Layer | Technology |
|---|---|
| Front end | React 18 + Vite 6 + React Router 6 (`frontend/`), plain CSS, no UI framework |
| Fonts | Bricolage Grotesque and Public Sans, bundled with `@fontsource-variable` (no external requests, works offline) |
| Back end | Laravel 12 REST API, Sanctum personal access tokens (`backend/`) |
| Database | MySQL on **127.0.0.1:3306**, database **`unifind1`** (SQLite in memory for the tests) |
| Runtime | PHP 8.4, Node 22+ |

## Project structure

```
UniFind/
├── README.md
├── CLAUDE_CODE_PROMPT.md       build brief for Claude Code
├── prototype/                  original HTML/CSS/JS prototype (visual reference only)
├── backend/                    Laravel 12 API (created with composer create-project)
│   ├── app/Models/             User, Item, Category, Location, ActivityLog
│   ├── app/Http/Middleware/    EnsureRole (alias "role"), ForceJsonResponse
│   ├── app/Http/Controllers/   AuthController, MetaController, ItemController,
│   │                           Admin/{AdminItemController, DashboardController, DbEditorController}
│   ├── app/Http/Resources/     ItemResource (role-aware item JSON)
│   ├── app/Providers/          AppServiceProvider: login rate limit, disabled accounts lose their tokens
│   ├── app/Support/            DbEditorSchema (tables/columns the admin may edit)
│   ├── bootstrap/app.php       routes, middleware alias, JSON error rendering for /api/*
│   ├── config/unifind.php      demo mode, demo password, token lifetime
│   ├── config/cors.php         allows FRONTEND_URL on api/*
│   ├── database/migrations/    users, categories + locations, items, activity_logs (+ Laravel defaults)
│   ├── database/factories/     UserFactory (used by the tests)
│   ├── database/seeders/       DatabaseSeeder: demo users and sample data
│   ├── routes/api.php          all endpoints, grouped by role
│   └── tests/Feature/          AuthTest, StudentPermissionsTest, AdminItemsTest, DbEditorTest,
│                               Concerns/BuildsUniFindData (shared test data)
└── frontend/                   React SPA
    ├── index.html, vite.config.js, package.json, .env.example
    ├── public/favicon.svg
    └── src/
        ├── main.jsx            providers + router
        ├── App.jsx             routes
        ├── api.js              fetch wrapper (Bearer token, errors, global sign-out on 401)
        ├── auth.jsx            AuthContext: user, loading, login, logout
        ├── styles.css          design tokens and all styles
        ├── components/
        │   ├── Layouts.jsx     StudentLayout, AdminLayout, RequireRole guard, PageHeader
        │   ├── ItemViews.jsx   cards/table views, filter bar, item form, data hooks
        │   └── ui.jsx          toasts, modal, confirm dialog, badges, pagination, skeletons, empty state, field
        └── pages/
            ├── Auth.jsx        login (demo buttons), 403, 404
            ├── student/        Browse, MyRequests, NewRequest, ItemDetail
            └── admin/          Dashboard, Cases, CaseEdit, Database, Activity
```

## Roles

| Action | Student | Admin |
|---|---|---|
| Browse open found items | ✓ | ✓ |
| Create a lost request | ✓ (type is always `lost`) | ✓ (lost or found) |
| See own requests and their status | ✓ | all items |
| Edit own request while it is open | ✓ | any item |
| Register found items | | ✓ |
| Change status, add note, link a match | | ✓ |
| Remove (with reason) / restore items | | ✓ |
| See removed items and reporter details | | ✓ |
| Dashboard, activity log, database editor | | ✓ |

Every rule is enforced by the API. The React route guards only control what is shown.
A student asking for another student's request gets `404`; a student calling any `/api/admin/*` route gets `403` JSON.

Item status: `open` → `found` (matched, ready to collect) → `returned`, or `closed`. Only the admin changes status,
and the admin can also reopen a case. In the interface `found` is shown as **Matched**, and the student sees
**Ready to collect** with the office's note.
When a lost request is marked `found` and linked to a found item, that found item is reserved (it gets status `found`
and leaves the public list); marking the request `returned` also marks the found item `returned`, and reopening
or closing the request releases the found item back to `open`.

## Pages

| Route | Who | What it is for |
|---|---|---|
| `/login` | everyone | Sign in; demo buttons when `DEMO_MODE=true` |
| `/app` | student | "Find what matters." Browse open found items: search, category, location, dates, Cards or Table |
| `/app/requests` | student | My lost requests with status chips; the office note and "Ready to collect" when matched |
| `/app/requests/new` | student | Report a lost item, with an optional photo |
| `/app/items/:id` | student | Item details; **Edit request** while the request is still open |
| `/admin` | admin | Dashboard: counters, items per day (14 days), items per category, recent activity |
| `/admin/cases` | admin | All items with filters (type, status, category, location, dates, removed); mark found with a note and match, mark returned, close, reopen, edit, remove with a reason, restore |
| `/admin/cases/new` | admin | Register a found item (or a lost request) |
| `/admin/cases/:id` | admin | One case: reporter details, status actions, edit form |
| `/admin/database` | admin | Database editor for the whitelisted tables |
| `/admin/activity` | admin | Activity log with an action filter |
| `/403`, anything else | everyone | No-access page and not-found page |

Signed-out visitors are sent to `/login` and returned to the page they wanted after signing in; a student who opens
an `/admin` page sees the 403 page (and the API refuses the call with `403` as well).

## Prerequisites

- PHP 8.4 with these extensions enabled in `php.ini`:
  `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `curl`, `zip`, and `pdo_sqlite` (used by the tests).
  Check with `php -m`. To enable one, remove the leading `;` from its line, for example `;extension=pdo_sqlite` → `extension=pdo_sqlite`.
- Composer 2
- Node 22 or newer, npm
- MySQL (or MariaDB) listening on **127.0.0.1:3306**, user `root`. If your root user has a password,
  put it in `DB_PASSWORD` in `backend/.env` (it stays empty in `.env.example`; never commit `.env`).

## Setup (Windows)

```bat
:: 1. Database (MySQL on port 3306)
::    -p prompts for the root password; press Enter if it has none
mysql -u root -p -h 127.0.0.1 -P 3306 -e "CREATE DATABASE IF NOT EXISTS unifind1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

:: No mysql client on PATH? The same thing with PHP (put your root password between the last quotes):
php -r "(new PDO('mysql:host=127.0.0.1;port=3306','root',''))->exec('CREATE DATABASE IF NOT EXISTS unifind1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');"

:: 2. Back end
cd backend
composer install
copy .env.example .env
::    edit .env: set DB_PASSWORD if your MySQL root user has one
php artisan key:generate
php artisan db:show               :: should say MySQL, port 3306, database unifind1
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve                 :: http://localhost:8000

:: 3. Front end (new terminal)
cd frontend
npm install
npm run dev                       :: http://localhost:5173
```

Open http://localhost:5173 (use `localhost`: Vite listens on it, not on `127.0.0.1`).
In development the browser only talks to Vite; Vite proxies `/api` and `/storage`
to Laravel on `http://127.0.0.1:8000`. For a deployment, set `VITE_API_URL` in `frontend/.env`
(see `frontend/.env.example`) and run `npm run build`; the output is in `frontend/dist/`.

Important `backend/.env` values (already in `.env.example`):

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=unifind1
DB_USERNAME=root
DB_PASSWORD=
DEMO_MODE=true
DEMO_PASSWORD=Demo@12345
FRONTEND_URL=http://localhost:5173
SANCTUM_EXPIRATION=720         # token lifetime in minutes (12 hours)
```

The front end has no required settings in development. `npm run build` checks that it compiles.

## Tests

```bat
cd backend
php artisan test
```


## Demo accounts

Created by the seeder. They are fictional; no real people are needed.

| Role | Email | Password |
|---|---|---|
| Admin | admin@uqu.edu.sa | Demo@12345 |
| Student | student@uqu.edu.sa | Demo@12345 |
| Student | sara.alharbi@uqu.edu.sa, omar.alzahrani@uqu.edu.sa, lina.alghamdi@uqu.edu.sa | Demo@12345 |

With `DEMO_MODE=true` in `backend/.env`, `GET /api/demo-accounts` returns the two main logins and the login page shows
one-click **Continue as Student / Continue as Admin** buttons. Set `DEMO_MODE=false` (then `php artisan config:clear`)
to hide them; the endpoint then returns an empty list. The password comes from `DEMO_PASSWORD`.
