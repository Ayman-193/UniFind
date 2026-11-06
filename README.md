# UniFind

UniFind is a campus lost-and-found website for Umm Al-Qura University. Students use it to report items they have lost and to check what has been found on campus. The Lost & Found Office admin uses it to register found items, match them to students' requests and update each case. Every case is tracked in one place instead of in scattered group chats.

## What each user can do

| Student | Admin (Lost & Found Office) |
|---|---|
| Browse found items | Everything the student can do |
| Report a lost item | Register found items |
| Follow my requests and their status | Mark requests found, returned or closed, with a note and a matched item |
| Edit my request while it is open | Remove and restore items |
| | Dashboard |
| | Database page |
| | Activity log |

## Requirements

- PHP 8.4 with the extensions pdo_mysql, mbstring, openssl, fileinfo, curl, zip and gd
- Composer
- Node.js 22 or newer
- MySQL on port 3306

## First-time setup

1. Create the database in MySQL:

   ```sql
   CREATE DATABASE unifind1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Install the backend and create its settings file:

   ```powershell
   cd backend
   composer install
   copy .env.example .env
   ```

3. Open `backend\.env` and set `DB_PASSWORD` (your MySQL root password), `ADMIN_PASSWORD` and `STUDENT_PASSWORD`, then save the file.

4. Prepare the backend:

   ```powershell
   php artisan key:generate
   php artisan migrate --seed
   php artisan storage:link
   ```

5. Install the frontend:

   ```powershell
   cd ..\frontend
   npm install
   ```

## Run the app

Open two terminals.

Terminal 1:

```powershell
cd backend
php artisan serve
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173 (use `localhost`, not `127.0.0.1`).

## Login accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@uqu.edu.sa | `asd` |
| Student | student@uqu.edu.sa | `asd` |

These are the passwords set in `backend\.env`. If you change them there, run `php artisan migrate:fresh --seed` to apply them (this resets all data).

To create more users, sign in as admin and use the Database page.

## Database

The database is `unifind1` on 127.0.0.1:3306, user `root`.

To look at it, open it in MySQL Workbench, or sign in as admin and use the Database page in the app.

`php artisan migrate:fresh --seed` resets everything to just the two accounts, the categories and the locations.
