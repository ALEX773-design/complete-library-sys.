# National Library

A library web app I built to actually learn how a real backend works, not just static pages. You can sign up, browse and search for books, borrow them with due dates, keep a favorites list, and there's a full admin side for managing the whole thing.

Started small and kept growing — ended up with an admin panel, a notification system, and a bunch of stuff I didn't originally plan for.

## What it does

- Sign up / log in, sessions, hashed passwords
- Borrow books, see what's due, return them, check your history
- Favorites, plus it remembers what you've recently looked at
- Edit your profile — bio, email, password, profile picture
- Admin side: see who's currently active, manage every account, add new books, send notifications (broadcast or to specific people), flip on maintenance mode, inject custom CSS, export all the data, wipe non-admin accounts
- Night mode

The first account anyone creates automatically becomes the admin — didn't bother building a separate setup flow for that.

## Built with

Flask + SQLite on the backend, plain HTML/CSS/JS on the frontend. No React or frontend framework — wanted to actually get the fundamentals down first.

## Database

Seven tables: `users`, `books` (+ a separate `book_genres` table since one book can have multiple genres), `favorites`, `loans`, `reading_history`, `site_settings` (a single row holding admin-configurable stuff like maintenance mode), and `notifications` + `notification_recipients`.

Migrations are hand-rolled — `init_db()` checks what columns already exist before adding new ones, so it's safe to run against a database that already has real data. Not using a tool like Alembic here; it's a solo project, not a team codebase.

## Running it

```bash
pip install -r requirements.txt
python app.py
```

Goes to `localhost:5000`. First run creates the database and seeds some starter books automatically.

## Note

Set your own `SECRET_KEY` environment variable before putting this anywhere public — there's a dev fallback in the code, but don't actually use it live.
