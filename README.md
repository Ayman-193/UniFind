# UniFind — Simple Version

A beginner-friendly university lost-and-found website built with **HTML, CSS and JavaScript**.

## Run it (no XAMPP required)

1. Extract the ZIP file.
2. Open the `UniFind_Simple` folder in Visual Studio Code (File > Open Folder).
3. Double-click `index.html` in File Explorer to open it in Edge or Chrome.
4. Add a report, search for it, filter by Lost/Found, or delete it.

You can edit the HTML, CSS, and JavaScript in VS Code and refresh the browser to see changes. No Live Server extension is required.

## Files

- `index.html`: page layout and form
- `style.css`: website appearance
- `script.js`: add/search/filter/delete and browser storage

## Important limitations

- Reports are stored in `localStorage` in **the current browser on the current device only**.
- Other students cannot see the reports on their own devices.
- Clearing browser site data may delete reports.
- No login, accounts, shared database, claim workflow, or admin permissions are implemented.
- The Delete button is available to anyone using that browser; it is not secure for real deployment.
- Do not enter sensitive personal details. This is a classroom prototype, not a production service.

## Suggested sprint plan

- Sprint 1: requirements, product vision, UI design, user stories.
- Sprint 2: build HTML/CSS and add local report storage.
- Sprint 3: search, filter, testing, bug fixes and prototype demonstration.

Update your report to match the actual features and work completed. Do not claim features have been tested until your team tests them.
