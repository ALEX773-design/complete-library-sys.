import os
import sqlite3
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-later")

DB_PATH = "library.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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
    conn.commit()
    conn.close()


PAGES = [
    "homepage", "search", "browse", "lists", "favorites",
    "account", "profile", "borrowed-books", "borrowing-history",
    "reading-history", "ecard", "users", "book",
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

    conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, generate_password_hash(password)),
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

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"message": "Logged in", "username": user["username"]}), 200


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"}), 200


@app.route("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False}), 200
    return jsonify({"logged_in": True, "username": session["username"]}), 200


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


if __name__ == "__main__":
    init_db()
    app.run(debug=True)