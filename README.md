# National Library

A multi-page library web app — browse, search, and borrow books, track reading history and favorites, and manage your account. Built with Flask + SQLite on the backend and vanilla JS/CSS on the frontend.

## Features

- Account system: signup/login/logout, sessions, hashed passwords
- Borrowing system with due dates, return tracking, and history
- Favorites and per-user reading history
- Editable profile: bio, email, password, profile picture
- Admin panel: active-user tracking, full user directory with detail view, book management, site-wide notifications (broadcast or targeted), maintenance mode, custom CSS injection, data export, account deletion
- Night mode
- The first account ever created automatically becomes an admin — no separate setup step

## Tech stack

- **Backend:** Flask, SQLite (via Python's `sqlite3` module)
- **Frontend:** vanilla HTML/CSS/JS, no frontend framework

## Database schema

- `users` — id, username, password_hash, email, bio, profile_picture, created_at, last_seen, is_admin
- `books` + `book_genres` — books table plus a many-to-many genres table
- `favorites` — (user_id, book_id)
- `loans` — id, user_id, book_id, borrowed_at, due_at, returned_at
- `reading_history` — (user_id, book_id, viewed_at), last-viewed semantics
- `site_settings` — single row of sitewide admin-configurable settings
- `notifications` + `notification_recipients` — sitewide or targeted user notifications

Migrations are hand-rolled: `init_db()` checks `PRAGMA table_info()` before adding columns with `ALTER TABLE`, so it's safe to run against an existing database.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

The app runs at `http://localhost:5000`. The database (`library.db`) is created automatically on first run, seeded from `static/books.json`.

Sign up with any account first — it becomes the admin account automatically.

## Environment variables

- `SECRET_KEY` — Flask session secret. Falls back to a dev default if unset; set a real value before deploying anywhere public.
