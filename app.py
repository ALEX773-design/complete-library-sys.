import os
import json
import sqlite3
import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-later")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

DB_PATH = "library.db"
LOAN_PERIOD_DAYS = 14
ACTIVE_WINDOW_MINUTES = 10

UPLOAD_FOLDER = os.path.join("static", "uploads", "avatars")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAINTENANCE_ALLOWED_PATHS = {"/login.html", "/api/login", "/api/me", "/api/logout", "/custom.css"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_current_user_row(user_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row


def require_admin():
    if "user_id" not in session:
        return None
    user = get_current_user_row(session["user_id"])
    if not user or not user["is_admin"]:
        return None
    return user


def seed_books_if_empty():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) AS count FROM books").fetchone()["count"]
    if count > 0:
        conn.close()
        return

    books_json_path = os.path.join("static", "books.json")
    if not os.path.exists(books_json_path):
        conn.close()
        return

    with open(books_json_path) as f:
        books_data = json.load(f)

    for book in books_data:
        conn.execute(
            "INSERT INTO books (id, title, author, year, popularity, added_date, cover) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                book["id"], book.get("title"), book.get("author"),
                book.get("year"), book.get("popularity"),
                book.get("addedDate"), book.get("cover"),
            ),
        )
        for genre in book.get("genres", []):
            conn.execute(
                "INSERT OR IGNORE INTO book_genres (book_id, genre) VALUES (?, ?)",
                (book["id"], genre),
            )

    conn.commit()
    conn.close()
    print(f"Seeded {len(books_data)} books into the database.")


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            user_id INTEGER NOT NULL,
            book_id TEXT NOT NULL,
            PRIMARY KEY (user_id, book_id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            book_id TEXT NOT NULL,
            borrowed_at TEXT NOT NULL,
            due_at TEXT NOT NULL,
            returned_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reading_history (
            user_id INTEGER NOT NULL,
            book_id TEXT NOT NULL,
            viewed_at TEXT NOT NULL,
            PRIMARY KEY (user_id, book_id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS site_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            maintenance_mode INTEGER NOT NULL DEFAULT 0,
            custom_css TEXT NOT NULL DEFAULT '',
            footer_text TEXT NOT NULL DEFAULT 'National Library — a project by a student, for students.'
        )
    """)
    site_settings_columns = [row["name"] for row in conn.execute("PRAGMA table_info(site_settings)").fetchall()]
    if "footer_text" not in site_settings_columns:
        conn.execute("ALTER TABLE site_settings ADD COLUMN footer_text TEXT NOT NULL DEFAULT 'National Library — a project by a student, for students.'")

    conn.execute("INSERT OR IGNORE INTO site_settings (id, maintenance_mode, custom_css) VALUES (1, 0, '')")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT,
            year INTEGER,
            popularity INTEGER,
            added_date TEXT,
            cover TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS book_genres (
            book_id TEXT NOT NULL,
            genre TEXT NOT NULL,
            PRIMARY KEY (book_id, genre),
            FOREIGN KEY (book_id) REFERENCES books(id)
        )
    """)

    existing_columns = [row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()]

    if "profile_picture" not in existing_columns:
        conn.execute("ALTER TABLE users ADD COLUMN profile_picture TEXT")

    if "created_at" not in existing_columns:
        conn.execute("ALTER TABLE users ADD COLUMN created_at TEXT")
        conn.execute(
            "UPDATE users SET created_at = ? WHERE created_at IS NULL",
            (datetime.datetime.utcnow().isoformat(),),
        )

    if "is_admin" not in existing_columns:
        conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        first_user = conn.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1").fetchone()
        if first_user:
            conn.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (first_user["id"],))

    if "bio" not in existing_columns:
        conn.execute("ALTER TABLE users ADD COLUMN bio TEXT")

    if "email" not in existing_columns:
        conn.execute("ALTER TABLE users ADD COLUMN email TEXT")

    if "last_seen" not in existing_columns:
        conn.execute("ALTER TABLE users ADD COLUMN last_seen TEXT")

    conn.commit()
    conn.close()

    seed_books_if_empty()


PAGES = [
    "homepage", "search", "browse", "lists", "favorites",
    "account", "profile", "borrowed-books", "borrowing-history",
    "reading-history", "ecard", "book",
]

@app.route("/")
def index():
    return render_template("homepage.html")

for page in PAGES:
    app.add_url_rule(
        f"/{page}.html",
        endpoint=page,
        view_func=lambda page=page: render_template(f"{page}.html"),
    )

@app.route("/login.html")
def login_page():
    return render_template("login.html")


@app.route("/users.html")
def users_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    user = get_current_user_row(session["user_id"])
    if not user or not user["is_admin"]:
        return redirect(url_for("index"))
    return render_template("users.html")


# ---------- Site-wide maintenance gate ----------

@app.before_request
def check_maintenance_mode():
    if request.path.startswith("/static/"):
        return None
    if request.path in MAINTENANCE_ALLOWED_PATHS:
        return None

    conn = get_db()
    row = conn.execute("SELECT maintenance_mode FROM site_settings WHERE id = 1").fetchone()
    conn.close()

    if not row or not row["maintenance_mode"]:
        return None
    if require_admin():
        return None

    if request.path.startswith("/api/"):
        return jsonify({"error": "Site is under maintenance"}), 503
    return render_template("maintenance.html"), 503


# ---------- Books ----------

@app.route("/api/books")
def get_books():
    conn = get_db()
    books = conn.execute("SELECT * FROM books ORDER BY id").fetchall()
    genre_rows = conn.execute("SELECT * FROM book_genres").fetchall()
    conn.close()

    genres_by_book = {}
    for row in genre_rows:
        genres_by_book.setdefault(row["book_id"], []).append(row["genre"])

    return jsonify([
        {
            "id": book["id"],
            "title": book["title"],
            "author": book["author"],
            "genres": genres_by_book.get(book["id"], []),
            "year": book["year"],
            "popularity": book["popularity"],
            "addedDate": book["added_date"],
            "cover": book["cover"],
        }
        for book in books
    ]), 200


# ---------- Auth ----------

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_db()
    if conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone():
        conn.close()
        return jsonify({"error": "Username already taken"}), 409

    existing_count = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
    is_admin_value = 1 if existing_count == 0 else 0

    conn.execute(
        "INSERT INTO users (username, password_hash, created_at, is_admin) VALUES (?, ?, ?, ?)",
        (username, generate_password_hash(password), datetime.datetime.utcnow().isoformat(), is_admin_value),
    )
    conn.commit()
    user_id = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()["id"]
    conn.close()

    session["user_id"] = user_id
    session["username"] = username
    return jsonify({"message": "Account created", "username": username}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    expected_role = data.get("role")

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    if expected_role == "admin" and not user["is_admin"]:
        return jsonify({"error": "This account doesn't have admin access"}), 403

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"message": "Logged in", "username": user["username"], "is_admin": bool(user["is_admin"])}), 200


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"}), 200


@app.route("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False}), 200

    conn = get_db()
    conn.execute("UPDATE users SET last_seen = ? WHERE id = ?", (datetime.datetime.utcnow().isoformat(), session["user_id"]))
    conn.commit()
    conn.close()

    user = get_current_user_row(session["user_id"])
    avatar_url = f"/{user['profile_picture']}" if user and user["profile_picture"] else None

    return jsonify({
        "logged_in": True,
        "username": session["username"],
        "avatar_url": avatar_url,
        "is_admin": bool(user["is_admin"]) if user else False,
    }), 200


# ---------- Profile ----------

@app.route("/api/profile", methods=["GET"])
def get_profile():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    user = get_current_user_row(session["user_id"])
    conn = get_db()
    books_borrowed = conn.execute(
        "SELECT COUNT(*) AS count FROM loans WHERE user_id = ?", (session["user_id"],)
    ).fetchone()["count"]
    conn.close()

    avatar_url = f"/{user['profile_picture']}" if user["profile_picture"] else None

    return jsonify({
        "user_id": user["id"],
        "username": user["username"],
        "avatar_url": avatar_url,
        "member_since": user["created_at"],
        "books_borrowed": books_borrowed,
        "is_admin": bool(user["is_admin"]),
        "bio": user["bio"] or "",
        "email": user["email"] or "",
    }), 200


@app.route("/api/profile", methods=["PUT"])
def update_profile():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json(silent=True) or {}
    bio = (data.get("bio") or "").strip()[:500]
    email = (data.get("email") or "").strip()[:200]

    conn = get_db()
    conn.execute("UPDATE users SET bio = ?, email = ? WHERE id = ?", (bio, email, session["user_id"]))
    conn.commit()
    conn.close()
    return jsonify({"message": "Profile updated"}), 200


@app.route("/api/change-password", methods=["POST"])
def change_password():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    user = get_current_user_row(session["user_id"])
    if not check_password_hash(user["password_hash"], current_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    conn = get_db()
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (generate_password_hash(new_password), session["user_id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Password changed"}), 200


# ---------- Users (admin only) ----------

@app.route("/api/users")
def get_users():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(minutes=ACTIVE_WINDOW_MINUTES)).isoformat()
    conn = get_db()
    rows = conn.execute(
        "SELECT username, profile_picture FROM users WHERE last_seen IS NOT NULL AND last_seen >= ? ORDER BY username COLLATE NOCASE",
        (cutoff,),
    ).fetchall()
    conn.close()
    return jsonify([
        {"username": row["username"], "avatar_url": f"/{row['profile_picture']}" if row["profile_picture"] else None}
        for row in rows
    ]), 200


@app.route("/api/admin/user/<username>")
def get_admin_user_detail(username):
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
    books_borrowed = conn.execute("SELECT COUNT(*) AS count FROM loans WHERE user_id = ?", (user["id"],)).fetchone()["count"]
    favorites_count = conn.execute("SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?", (user["id"],)).fetchone()["count"]
    conn.close()
    return jsonify({
        "username": user["username"],
        "email": user["email"] or "",
        "bio": user["bio"] or "",
        "avatar_url": f"/{user['profile_picture']}" if user["profile_picture"] else None,
        "member_since": user["created_at"],
        "is_admin": bool(user["is_admin"]),
        "books_borrowed": books_borrowed,
        "favorites_count": favorites_count,
        "last_seen": user["last_seen"],
    }), 200


@app.route("/api/admin/profiles")
def get_admin_profiles():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    conn = get_db()
    rows = conn.execute("""
        SELECT u.username, u.profile_picture, u.created_at,
               (SELECT COUNT(*) FROM loans WHERE loans.user_id = u.id) AS books_borrowed
        FROM users u
        ORDER BY u.username COLLATE NOCASE
    """).fetchall()
    conn.close()

    return jsonify([
        {
            "username": row["username"],
            "avatar_url": f"/{row['profile_picture']}" if row["profile_picture"] else None,
            "member_since": row["created_at"],
            "books_borrowed": row["books_borrowed"],
        }
        for row in rows
    ]), 200


# ---------- Admin: site settings / Dev tools ----------

@app.route("/api/admin/settings")
def get_admin_settings():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403
    conn = get_db()
    row = conn.execute("SELECT maintenance_mode, custom_css, footer_text FROM site_settings WHERE id = 1").fetchone()
    conn.close()
    return jsonify({
        "maintenance_mode": bool(row["maintenance_mode"]),
        "custom_css": row["custom_css"] or "",
        "footer_text": row["footer_text"] or "",
    }), 200


@app.route("/api/admin/settings/maintenance", methods=["POST"])
def set_maintenance_mode():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403
    data = request.get_json(silent=True) or {}
    on = bool(data.get("on"))
    conn = get_db()
    conn.execute("UPDATE site_settings SET maintenance_mode = ? WHERE id = 1", (1 if on else 0,))
    conn.commit()
    conn.close()
    return jsonify({"maintenance_mode": on}), 200


@app.route("/api/admin/settings/css", methods=["POST"])
def set_custom_css():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403
    data = request.get_json(silent=True) or {}
    css = (data.get("css") or "")[:20000]
    conn = get_db()
    conn.execute("UPDATE site_settings SET custom_css = ? WHERE id = 1", (css,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Saved"}), 200


@app.route("/api/footer")
def get_footer():
    conn = get_db()
    row = conn.execute("SELECT footer_text FROM site_settings WHERE id = 1").fetchone()
    conn.close()
    return jsonify({"footer_text": row["footer_text"] if row else ""}), 200


@app.route("/api/admin/settings/footer", methods=["POST"])
def set_footer_text():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403
    data = request.get_json(silent=True) or {}
    text = (data.get("footer_text") or "")[:1000]
    conn = get_db()
    conn.execute("UPDATE site_settings SET footer_text = ? WHERE id = 1", (text,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Saved"}), 200


@app.route("/custom.css")
def serve_custom_css():
    conn = get_db()
    row = conn.execute("SELECT custom_css FROM site_settings WHERE id = 1").fetchone()
    conn.close()
    return app.response_class(row["custom_css"] if row else "", mimetype="text/css")


@app.route("/api/admin/export")
def export_data():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    conn = get_db()
    users = [dict(row) for row in conn.execute(
        "SELECT id, username, email, bio, created_at, is_admin FROM users"
    ).fetchall()]
    loans = [dict(row) for row in conn.execute("SELECT * FROM loans").fetchall()]
    favorites = [dict(row) for row in conn.execute("SELECT * FROM favorites").fetchall()]
    reading_history = [dict(row) for row in conn.execute("SELECT * FROM reading_history").fetchall()]
    books = [dict(row) for row in conn.execute("SELECT * FROM books").fetchall()]
    conn.close()

    export = {
        "exported_at": datetime.datetime.utcnow().isoformat(),
        "users": users,
        "loans": loans,
        "favorites": favorites,
        "reading_history": reading_history,
        "books": books,
    }

    response = jsonify(export)
    response.headers["Content-Disposition"] = "attachment; filename=national-library-export.json"
    return response


@app.route("/api/admin/delete-all", methods=["POST"])
def delete_all_data():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    if data.get("confirm") != "DELETE":
        return jsonify({"error": "Type DELETE exactly to confirm"}), 400

    conn = get_db()
    non_admin_ids = [row["id"] for row in conn.execute("SELECT id FROM users WHERE is_admin = 0").fetchall()]

    for uid in non_admin_ids:
        conn.execute("DELETE FROM loans WHERE user_id = ?", (uid,))
        conn.execute("DELETE FROM favorites WHERE user_id = ?", (uid,))
        conn.execute("DELETE FROM reading_history WHERE user_id = ?", (uid,))
    conn.execute("DELETE FROM users WHERE is_admin = 0")
    conn.commit()
    conn.close()

    return jsonify({"message": f"Deleted {len(non_admin_ids)} non-admin accounts and their data"}), 200


# ---------- Profile picture ----------

@app.route("/api/profile-picture", methods=["POST"])
def upload_profile_picture():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    file = request.files.get("avatar")
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Only png, jpg, jpeg, or webp images are allowed"}), 400

    extension = secure_filename(file.filename).rsplit(".", 1)[1].lower()
    user_id = session["user_id"]

    for existing_ext in ALLOWED_EXTENSIONS:
        old_path = os.path.join(UPLOAD_FOLDER, f"{user_id}.{existing_ext}")
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"{user_id}.{extension}"
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    relative_path = f"static/uploads/avatars/{filename}"
    conn = get_db()
    conn.execute("UPDATE users SET profile_picture = ? WHERE id = ?", (relative_path, user_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Uploaded", "avatar_url": f"/{relative_path}"}), 200


# ---------- Favorites ----------

@app.route("/api/favorites", methods=["GET"])
def get_favorites():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db()
    rows = conn.execute(
        "SELECT book_id FROM favorites WHERE user_id = ?", (session["user_id"],)
    ).fetchall()
    conn.close()
    return jsonify([row["book_id"] for row in rows]), 200


@app.route("/api/favorites/<book_id>", methods=["POST"])
def add_favorite(book_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db()
    conn.execute(
        "INSERT OR IGNORE INTO favorites (user_id, book_id) VALUES (?, ?)",
        (session["user_id"], book_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Added"}), 200


@app.route("/api/favorites/<book_id>", methods=["DELETE"])
def remove_favorite(book_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db()
    conn.execute(
        "DELETE FROM favorites WHERE user_id = ? AND book_id = ?",
        (session["user_id"], book_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Removed"}), 200


# ---------- Loans ----------

@app.route("/api/loans/active", methods=["GET"])
def active_loans():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db()
    rows = conn.execute(
        "SELECT id, book_id, borrowed_at, due_at FROM loans WHERE user_id = ? AND returned_at IS NULL",
        (session["user_id"],),
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows]), 200


@app.route("/api/loans/history", methods=["GET"])
def loan_history():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db()
    rows = conn.execute(
        "SELECT id, book_id, borrowed_at, due_at, returned_at FROM loans WHERE user_id = ? ORDER BY borrowed_at DESC",
        (session["user_id"],),
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows]), 200


@app.route("/api/loans/<book_id>", methods=["POST"])
def borrow_book(book_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND returned_at IS NULL",
        (session["user_id"], book_id),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Already borrowed"}), 409

    now = datetime.datetime.utcnow()
    due = now + datetime.timedelta(days=LOAN_PERIOD_DAYS)
    conn.execute(
        "INSERT INTO loans (user_id, book_id, borrowed_at, due_at) VALUES (?, ?, ?, ?)",
        (session["user_id"], book_id, now.isoformat(), due.isoformat()),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Borrowed", "due_at": due.isoformat()}), 201


@app.route("/api/loans/<int:loan_id>/return", methods=["POST"])
def return_book(loan_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db()
    loan = conn.execute(
        "SELECT id FROM loans WHERE id = ? AND user_id = ? AND returned_at IS NULL",
        (loan_id, session["user_id"]),
    ).fetchone()
    if not loan:
        conn.close()
        return jsonify({"error": "Loan not found"}), 404
    conn.execute(
        "UPDATE loans SET returned_at = ? WHERE id = ?",
        (datetime.datetime.utcnow().isoformat(), loan_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Returned"}), 200


# ---------- Reading history ----------

@app.route("/api/reading-history", methods=["GET"])
def get_reading_history():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db()
    rows = conn.execute(
        "SELECT book_id, viewed_at FROM reading_history WHERE user_id = ? ORDER BY viewed_at DESC",
        (session["user_id"],),
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows]), 200


@app.route("/api/reading-history/<book_id>", methods=["POST"])
def log_reading_history(book_id):
    if "user_id" not in session:
        return jsonify({"logged": False}), 200
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO reading_history (user_id, book_id, viewed_at) VALUES (?, ?, ?)",
        (session["user_id"], book_id, datetime.datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return jsonify({"logged": True}), 200


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
