# UniFind: Campus Lost & Found

A university lost-and-found system built for the Software Product Engineering course (three-sprint Scrum project).
Students report lost items and check what the Lost & Found Office has found; the office manages every case.

## Stack

| Layer | Technology |
|---|---|
| Front end | React + Vite (`frontend/`) |
| Back end | Laravel 12 REST API, Sanctum tokens (`backend/`) |
| Database | MySQL on **port 3309** |
| Runtime | PHP 8.4, Node 22+ |

## Project structure

```
unifind/
├── README.md
├── CLAUDE_CODE_PROMPT.md     build brief for Claude Code
├── prototype/                original HTML/CSS/JS prototype (visual reference only)
├── backend/                  Laravel 12 API (created with composer create-project)
│   ├── app/Models/           User, Item, Category, Location, ActivityLog
│   ├── app/Http/Middleware/  EnsureRole
│   ├── app/Http/Controllers/ Auth, Meta, Item, Admin/{AdminItem, Dashboard, DbEditor}
│   ├── app/Support/          DbEditorSchema (tables/columns the admin may edit)
│   ├── config/unifind.php    demo mode, demo password
│   ├── database/migrations/  users, categories, locations, items, activity_logs
│   ├── database/seeders/     demo users and sample data
│   ├── routes/api.php        all endpoints, grouped by role
│   └── tests/Feature/        permission and workflow tests
└── frontend/                 React SPA
    └── src/
        ├── main.jsx, App.jsx, api.js, auth.jsx, styles.css
        ├── components/       layouts + route guard, item views, UI kit
        └── pages/
            ├── Auth.jsx      login (demo buttons), 403, 404
            ├── student/      Browse, MyRequests, NewRequest, ItemDetail
            └── admin/        Dashboard, Cases, CaseEdit, Database, Activity
```

## Roles

| Action | Student | Admin |
|---|---|---|
| Browse open found items | ✓ | ✓ |
| Create a lost request | ✓ | ✓ |
| See own requests and their status | ✓ | all items |
| Edit own request while it is open | ✓ | any item |
| Register found items | | ✓ |
| Change status, add note, link a match | | ✓ |
| Remove (with reason) / restore items | | ✓ |
| Dashboard, activity log, database editor | | ✓ |

Every rule is enforced by the API. The React route guards only control what is shown.
Item status: `open` → `found` (matched, ready to collect) → `returned`, or `closed`.

## Setup (Windows)

Prerequisites: PHP 8.4, Composer, Node 22+, MySQL running on port 3309.

```bash
# 1. Database
mysql -u root -P 3309 -e "CREATE DATABASE unifind"

# 2. Back end
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve            # http://localhost:8000

# 3. Front end (new terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Run the API tests with `php artisan test` inside `backend/`.

## Demo accounts

Created by the seeder. They are fictional; no real people are needed.

| Role | Email | Password |
|---|---|---|
| Admin | admin@uqu.edu.sa | Demo@12345 |
| Student | student@uqu.edu.sa | Demo@12345 |

With `DEMO_MODE=true` in `backend/.env`, the login page shows one-click **Continue as Student / Admin** buttons.
Set `DEMO_MODE=false` to hide them.
