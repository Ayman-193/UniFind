# UniFind — local login academic demo

A static website using HTML/CSS/JavaScript, with a simulated login and reports stored in **browser localStorage**. No Supabase, backend, API key, cloud database or real user authentication.

## Run
Open `index.html` directly in a modern browser or via VS Code Live Server. Click **Log in → Create a demo account**, enter a made-up username and password (8+ characters), then create reports. Only the local report creator can see edit/delete controls while signed in.

## IMPORTANT security limits
The login is **only a visual simulation**. Browser storage can be viewed and modified by anyone with access to the browser or developer tools; ownership checks are not secure. The passwords are salted and hashed with SHA-256 for demonstration, **not** using a password-hardening KDF, and must never be reused real passwords. Do not enter real personal information or use this for real students.

Accounts, reports, and optional small images remain on the current browser profile only. Other devices will not share them. Clearing browser data removes everything. Images are limited to 1 MB and browser storage capacity.

## GitHub Pages
Upload `index.html`, `style.css`, `script.js` to your GitHub repository root, then enable Pages in Settings → Pages. No config.js or database.sql is needed. Anyone visiting gets their own isolated browser-local demo.
