# Prompt for Claude Code

Open the `unifind/` folder in Claude Code and paste everything below the line.

---

Build **UniFind**, a university lost-and-found system, in this folder. Read `README.md` first: it defines the stack, the folder structure, the roles table and the demo accounts, and the finished project must match it. `prototype/` holds the old HTML/CSS/JS version; use it only as a visual reference. It is a classroom prototype: no real users, everything runs on seeded demo data.

## Environment (fixed)
- Windows, PHP **8.4.27**, Composer, Node 22+.
- **Laravel 12** API in `backend/` (create it with `composer create-project laravel/laravel backend`; the folder is intentionally empty). Install Sanctum with `php artisan install:api`.
- **React + Vite** (JavaScript) in `frontend/`, using `react-router-dom`. Follow the `src/` folders that already exist.
- **MySQL on 127.0.0.1 port 3309**, database `unifind`, user `root`, empty password. Put `DB_PORT=3309` in `.env` and `.env.example`. Laravel stays on 8000 and Vite on 5173.
- Vite dev server proxies `/api` and `/storage` to `http://127.0.0.1:8000`; `VITE_API_URL` overrides it for deployment.
- Everything (code, comments, UI text) in English.

## Architecture
React SPA → Laravel REST API (`/api`) → MySQL. Sanctum **personal access tokens** sent as a Bearer header, expiring after 12 hours, revoked on logout, login rate limited. No self-registration: accounts come from the seeder or the admin Database page. Uploaded photos go to `storage/app/public/items` (max 3 MB, jpg/png/webp).

## Roles (enforce on the server; React guards are UX only)
- **Student:** browse the open found-items catalog; create **lost** requests only (any `type` sent is ignored); read his own requests; edit his own request only while it is `open`. Never sees other students' requests (return 404), reporter details, deleted items or anything admin.
- **Admin:** everything. Register found items; edit any item; change status with a note and link the matching found item; soft delete with a mandatory reason and restore; dashboard; activity log; database editor.
- A student calling any `/api/admin/*` endpoint gets 403 JSON. In the UI, a student opening `/admin/*` lands on a 403 page; signed-out visitors go to `/login` and come back to the page they wanted; unknown URLs show a 404 page.
- Status flow: `open` → `found` (matched, ready to collect) → `returned`, or `closed`. Only the admin changes status.

## Data
Tables: `users` (+ `role` student|admin, `student_id`, `phone`, `is_active`), `categories`, `locations`, `items` (user_id, category_id, location_id, type lost|found, title, description, date_reported, contact_info, image_path, status, admin_note, matched_item_id self-FK, delete_reason, timestamps, soft deletes), `activity_logs` (user_id, action, subject_type, subject_id, details json, ip, created_at), plus Sanctum's tokens table. Real foreign keys; indexes on `(type, status)` and `date_reported`. Log every login, failed login, item create/update, status change, removal/restore and database-editor write.

## Demo data
`php artisan migrate:fresh --seed` creates the accounts in the README (password from `DEMO_PASSWORD`, default `Demo@12345`) plus three more fictional students, 8 categories, about 9 campus locations, ~6 found items and ~8 lost requests in mixed statuses (one found with a match and note, one returned, one closed, one soft deleted), with dates spread over two weeks. `DEMO_MODE=true` makes `GET /api/demo-accounts` return the two demo logins so the login page can show **Continue as Student / Continue as Admin**; with `false` it returns an empty list.

## Admin database editor
Whitelist only, never raw SQL: users, categories, locations, items (editable) and activity_logs (read-only). Tokens, sessions, migrations and password hashes never reach the browser. The server sends each table's column schema (type, enum options, required, foreign key) and React builds the forms from it: search, sort, pagination, add, edit, delete with confirmation. Passwords are write-only and hashed (blank on edit keeps the old one). An admin cannot delete, disable or demote their own account. A delete blocked by a foreign key returns a clear 409, not a 500.

## Pages
- Public: `/login`, `/403`, 404.
- Student (`/app`): **Found items** (hero, search, filters for category/location/dates, Cards | Table toggle, pagination, skeletons, empty state; keep the prototype's smooth scroll to the results), **My requests** (status chips, admin note and "collect it from…" when found), **New request** (validated form with photo preview), **Item detail**.
- Admin (`/admin`, sidebar layout): **Dashboard** (counters, 14-day bar chart in plain SVG, items per category, recent activity), **Cases** (data table of all items, filters for type/status/category/location/deleted, row actions: mark found with note + match, mark returned, close, edit, remove with reason, restore), **Add found item**, **Case edit**, **Database**, **Activity log**.

## UI / UX
Upgrade the prototype a lot but keep its identity: navy `#123d50` and teal `#087d8d`, the "Find what matters." hero, the LOST/FOUND badges, the card grid and the table views. It should feel like a polished campus product, not a template: deliberate typography with a clear scale, proper status colours, consistent spacing, visible keyboard focus, responsive to phone width, `prefers-reduced-motion` respected, toasts for every result, confirm dialogs for destructive actions. Avoid generic AI-looking defaults (identical rounded cards with the same shadow everywhere, gradient washes, all-caps labels above every heading). UI copy in plain active English ("Save request", not "Submit").

## Done means
1. Feature tests (`php artisan test`, in-memory SQLite) covering login, token required, **student blocked from every admin route**, student visibility rules, student can only create `lost`, student edits only his open request, admin status change with match, removal needs a reason + restore, database editor whitelist, password hashing, self-protection, read-only activity log, FK 409. All passing.
2. `npm run build` passes with no errors.
3. You ran both apps and checked them in a browser as each demo user, including that a student cannot reach `/admin/*` in the UI or the API.
4. `README.md` still accurate; add the API endpoint list (method, path, role).
5. Tell me what you tested and what you could not.

Work step by step (backend first, then frontend), and ask me before deviating from anything above.
