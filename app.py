"""Todo List Web App — Flask + SQLite backend (Phase 4: Masquerade, Items, & Stats)."""

import sqlite3
import os
import random
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import config

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "todos.db")


# ── Database helpers ────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                permission TEXT NOT NULL DEFAULT 'own',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                deleted INTEGER NOT NULL DEFAULT 0,
                color_flag TEXT NOT NULL DEFAULT '',
                start_date TEXT,
                due_date TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS todo_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                hours REAL NOT NULL DEFAULT 0.0,
                sort_order INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS task_owners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(todo_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS user_task_access (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
                UNIQUE(user_id, todo_id)
            );
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS todo_labels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
                label TEXT NOT NULL
            );
            """
        )
        # Migrations
        try:
            conn.execute("ALTER TABLE todos ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError: pass

        # Seed initial admin account
        admin = conn.execute("SELECT id FROM users WHERE email = ?", (config.ADMIN_EMAIL,)).fetchone()
        if not admin:
            conn.execute(
                "INSERT INTO users (email, name, role, permission, created_at) VALUES (?, ?, 'admin', 'all', ?)",
                (config.ADMIN_EMAIL, "Admin", datetime.utcnow().isoformat())
            )
        conn.commit()


# ── Auth & Decorators ───────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        # Always check the REAL logged in user for admin status
        with get_db() as conn:
            user = conn.execute("SELECT role FROM users WHERE id = ?", (session['user_id'],)).fetchone()
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated_function

def get_current_user(conn):
    """Returns the effective user (masqueraded or real)."""
    uid = session.get('masquerade_user_id') or session.get('user_id')
    if not uid: return None
    return conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()

def get_real_user(conn):
    """Returns the actual logged-in user."""
    uid = session.get('user_id')
    if not uid: return None
    return conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()


def send_otp_email(to_email, code, subject="Your Code"):
    if not config.SMTP_HOST:
        print(f"\n[DEV MODE] {subject} for {to_email}: {code}\n")
        return
    msg = EmailMessage()
    msg.set_content(f"{subject}: {code}")
    msg['Subject'] = subject
    msg['From'] = config.MAIL_FROM
    msg['To'] = to_email
    try:
        with smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT) as s:
            s.login(config.SMTP_USER, config.SMTP_PASS)
            s.send_message(msg)
    except Exception as e:
        print(f"Error sending email: {e}")


@app.route('/api/auth/request-otp', methods=['POST'])
def request_otp():
    data = request.get_json(force=True)
    email = data.get('email', '').strip().lower()
    if not email: return jsonify({'error': 'Email required'}), 400

    code = f"{random.randint(0, 999999):06d}"
    expires_at = (datetime.utcnow() + timedelta(seconds=config.OTP_EXPIRY_SECONDS)).isoformat()
    
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            name = email.split('@')[0].capitalize()
            conn.execute(
                "INSERT INTO users (email, name, role, permission, created_at) VALUES (?, ?, 'user', 'own', ?)",
                (email, name, datetime.utcnow().isoformat())
            )
        conn.execute(
            "INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)",
            (email, code, expires_at)
        )
        conn.commit()

    send_otp_email(email, code, "Login Code")
    return jsonify({'message': 'Code sent'})


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json(force=True)
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()

    with get_db() as conn:
        now = datetime.utcnow().isoformat()
        row = conn.execute(
            "SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1",
            (email, code, now)
        ).fetchone()
        
        if not row:
            return jsonify({'error': 'Invalid or expired code'}), 401
        
        conn.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (row['id'],))
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        session['user_id'] = user['id']
        session.pop('masquerade_user_id', None) 
        conn.commit()
        return jsonify(dict(user))


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})


@app.route('/api/auth/me', methods=['GET'])
def get_me():
    if 'user_id' not in session:
        return jsonify(None)
    try:
        with get_db() as conn:
            real_user = get_real_user(conn)
            if not real_user:
                session.clear()
                return jsonify(None)
            
            eff_user = get_current_user(conn)
            # If masqueraded user doesn't exist, fallback
            if not eff_user:
                session.pop('masquerade_user_id', None)
                eff_user = real_user
            
            resp = dict(eff_user)
            resp['real_user'] = dict(real_user)
            resp['is_masquerading'] = 'masquerade_user_id' in session
            return jsonify(resp)
    except Exception as e:
        print(f"Error in get_me: {e}")
        return jsonify(None), 500


@app.route('/api/auth/request-email-change', methods=['POST'])
@login_required
def request_email_change():
    data = request.get_json(force=True)
    new_email = data.get('new_email', '').strip().lower()
    if not new_email: return jsonify({'error': 'New email required'}), 400

    with get_db() as conn:
        eff_user = get_current_user(conn)
        if not eff_user: return jsonify({'error': 'User not found'}), 404
        
        # Ensure email isn't taken
        existing = conn.execute("SELECT id FROM users WHERE email = ? AND id != ?", (new_email, eff_user['id'])).fetchone()
        if existing: return jsonify({'error': 'Email already in use'}), 409

    code = f"{random.randint(0, 999999):06d}"
    expires_at = (datetime.utcnow() + timedelta(seconds=config.OTP_EXPIRY_SECONDS)).isoformat()
    
    with get_db() as conn:
        conn.execute(
            "INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)",
            (new_email, code, expires_at)
        )
        conn.commit()

    send_otp_email(new_email, code, "Verify New Email")
    return jsonify({'message': 'Code sent to new email'})


@app.route('/api/auth/verify-email-change', methods=['POST'])
@login_required
def verify_email_change():
    data = request.get_json(force=True)
    new_email = data.get('new_email', '').strip().lower()
    code = data.get('code', '').strip()
    
    if not new_email or not code: return jsonify({'error': 'Email and code required'}), 400

    with get_db() as conn:
        eff_user = get_current_user(conn)
        if not eff_user: return jsonify({'error': 'User not found'}), 404

        now = datetime.utcnow().isoformat()
        row = conn.execute(
            "SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1",
            (new_email, code, now)
        ).fetchone()
        
        if not row:
            return jsonify({'error': 'Invalid or expired code'}), 401
        
        conn.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (row['id'],))
        conn.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, eff_user['id']))
        conn.commit()
        
    return jsonify({'message': 'Email updated successfully'})


@app.route("/api/users", methods=["GET"])
@login_required
def list_users():
    with get_db() as conn:
        users = conn.execute("SELECT id, name, email FROM users ORDER BY name").fetchall()
        return jsonify([dict(u) for u in users])


# ── Serialisation helpers ───────────────────────────────────────────

def _todo_dict(conn, row):
    d = dict(row)
    d["labels"] = [
        r["label"] for r in conn.execute(
            "SELECT label FROM todo_labels WHERE todo_id = ? ORDER BY id", (d["id"],)
        ).fetchall()
    ]
    d["owners"] = [
        dict(o) for o in conn.execute(
            """SELECT u.id, u.name, u.email 
               FROM users u 
               JOIN task_owners t ON u.id = t.user_id 
               WHERE t.todo_id = ? ORDER BY u.name""",
            (d["id"],)
        ).fetchall()
    ]
    d["comments"] = [
        dict(c) for c in conn.execute(
            """SELECT c.*, u.name as owner_name, u.email as owner_email 
               FROM comments c
               JOIN users u ON c.user_id = u.id
               WHERE c.todo_id = ? ORDER BY c.created_at ASC""",
            (d["id"],)
        ).fetchall()
    ]
    d["items"] = [
        dict(i) for i in conn.execute(
            "SELECT * FROM todo_items WHERE todo_id = ? ORDER BY sort_order ASC, id ASC",
            (d["id"],)
        ).fetchall()
    ]
    return d


# ── Todo Permissions Helper ─────────────────────────────────────────

def _can_edit(conn, user, todo_id):
    if not user: return False
    if user['role'] == 'admin' or user['permission'] == 'all':
        return True
    access = conn.execute("SELECT 1 FROM user_task_access WHERE user_id=? AND todo_id=?", (user['id'], todo_id)).fetchone()
    if access: return True
    owner = conn.execute("SELECT 1 FROM task_owners WHERE user_id=? AND todo_id=?", (user['id'], todo_id)).fetchone()
    if owner: return True
    return False


# ── Todo CRUD ───────────────────────────────────────────────────────

@app.route("/api/todos", methods=["GET"])
@login_required
def read_todos():
    with get_db() as conn:
        user = get_current_user(conn)
        if not user: return jsonify([])
        
        if user['role'] == 'admin' or user['permission'] == 'all':
            rows = conn.execute("SELECT * FROM todos ORDER BY created_at DESC").fetchall()
        else:
            rows = conn.execute(
                """SELECT DISTINCT t.* FROM todos t
                   LEFT JOIN task_owners tow ON tow.todo_id = t.id AND tow.user_id = ?
                   LEFT JOIN user_task_access uta ON uta.todo_id = t.id AND uta.user_id = ?
                   WHERE (tow.user_id IS NOT NULL OR uta.user_id IS NOT NULL)
                   ORDER BY t.created_at DESC""",
                (user['id'], user['id'])
            ).fetchall()
        return jsonify([_todo_dict(conn, r) for r in rows])


@app.route("/api/todos", methods=["POST"])
@login_required
def create_todo():
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    if not text: return jsonify({"error": "Text is required"}), 400

    owner_ids = data.get("owner_ids", [])
    color_flag = data.get("color_flag", "").strip()
    labels = data.get("labels", [])
    start_date = data.get("start_date")
    due_date = data.get("due_date")
    items = data.get("items", []) 
    now = datetime.utcnow().isoformat()

    with get_db() as conn:
        user = get_current_user(conn)
        cur = conn.execute(
            "INSERT INTO todos (text, completed, deleted, color_flag, start_date, due_date, created_at) VALUES (?, 0, 0, ?, ?, ?, ?)",
            (text, color_flag, start_date, due_date, now)
        )
        todo_id = cur.lastrowid
        
        if not owner_ids: owner_ids = [user['id']]
        for uid in owner_ids:
            try: conn.execute("INSERT INTO task_owners (todo_id, user_id) VALUES (?, ?)", (todo_id, uid))
            except sqlite3.IntegrityError: pass
            
        for lbl in labels:
            lbl = lbl.strip()
            if lbl: conn.execute("INSERT INTO todo_labels (todo_id, label) VALUES (?, ?)", (todo_id, lbl))
        
        for idx, item in enumerate(items):
            conn.execute(
                "INSERT INTO todo_items (todo_id, description, hours, sort_order) VALUES (?, ?, ?, ?)",
                (todo_id, item.get('description', ''), float(item.get('hours', 0)), idx)
            )
        conn.commit()
        row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
        return jsonify(_todo_dict(conn, row)), 201


@app.route("/api/todos/<int:todo_id>", methods=["PUT"])
@login_required
def update_todo(todo_id):
    data = request.get_json(force=True)
    with get_db() as conn:
        user = get_current_user(conn)
        row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
        if row is None: return jsonify({"error": "Not found"}), 404
        if not _can_edit(conn, user, todo_id): return jsonify({"error": "Forbidden"}), 403

        new_text = data.get("text", row["text"])
        new_completed = data.get("completed", row["completed"])
        new_color_flag = data.get("color_flag", row["color_flag"])
        new_start_date = data.get("start_date", row["start_date"])
        new_due_date = data.get("due_date", row["due_date"])
        new_deleted = data.get("deleted", row["deleted"])

        conn.execute(
            "UPDATE todos SET text=?, completed=?, deleted=?, color_flag=?, start_date=?, due_date=? WHERE id=?",
            (new_text, int(new_completed), int(new_deleted), new_color_flag, new_start_date, new_due_date, todo_id)
        )

        if "owner_ids" in data:
            conn.execute("DELETE FROM task_owners WHERE todo_id = ?", (todo_id,))
            for uid in data["owner_ids"]:
                try: conn.execute("INSERT INTO task_owners (todo_id, user_id) VALUES (?, ?)", (todo_id, uid))
                except sqlite3.IntegrityError: pass

        if "labels" in data:
            conn.execute("DELETE FROM todo_labels WHERE todo_id = ?", (todo_id,))
            for lbl in data["labels"]:
                lbl = lbl.strip()
                if lbl: conn.execute("INSERT INTO todo_labels (todo_id, label) VALUES (?, ?)", (todo_id, lbl))
        
        if "items" in data:
            conn.execute("DELETE FROM todo_items WHERE todo_id = ?", (todo_id,))
            for idx, item in enumerate(data["items"]):
                conn.execute(
                    "INSERT INTO todo_items (todo_id, description, hours, sort_order) VALUES (?, ?, ?, ?)",
                    (todo_id, item.get('description', ''), float(item.get('hours', 0)), idx)
                )
        conn.commit()
        updated = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
        return jsonify(_todo_dict(conn, updated))


@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
@login_required
def delete_todo(todo_id):
    with get_db() as conn:
        user = get_current_user(conn)
        if not _can_edit(conn, user, todo_id): return jsonify({"error": "Forbidden"}), 403
        conn.execute("UPDATE todos SET deleted = 1 WHERE id = ?", (todo_id,))
        conn.commit()
    return jsonify({"deleted": todo_id})


@app.route("/api/todos/<int:todo_id>/undelete", methods=["POST"])
@login_required
def undelete_todo(todo_id):
    with get_db() as conn:
        user = get_current_user(conn)
        if not _can_edit(conn, user, todo_id): return jsonify({"error": "Forbidden"}), 403
        conn.execute("UPDATE todos SET deleted = 0 WHERE id = ?", (todo_id,))
        conn.commit()
        updated = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
        return jsonify(_todo_dict(conn, updated))


@app.route("/api/todos/<int:todo_id>/permanent", methods=["DELETE"])
@login_required
def permanent_delete_todo(todo_id):
    with get_db() as conn:
        user = get_current_user(conn)
        if not _can_edit(conn, user, todo_id): return jsonify({"error": "Forbidden"}), 403
        conn.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        conn.commit()
    return jsonify({"permanently_deleted": todo_id})


@app.route("/api/todos/purge", methods=["DELETE"])
@login_required
def purge_deleted_todos():
    with get_db() as conn:
        user = get_current_user(conn)
        if user['role'] == 'admin' or user['permission'] == 'all':
            conn.execute("DELETE FROM todos WHERE deleted = 1")
        else:
            conn.execute("""
                DELETE FROM todos WHERE deleted = 1 AND id IN (
                    SELECT todo_id FROM task_owners WHERE user_id = ?
                    UNION
                    SELECT todo_id FROM user_task_access WHERE user_id = ?
                )
            """, (user['id'], user['id']))
        conn.commit()
    return jsonify({"purged": True})


# ── Comment CRUD ────────────────────────────────────────────────────

@app.route("/api/todos/<int:todo_id>/comments", methods=["POST"])
@login_required
def create_comment(todo_id):
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    if not text: return jsonify({"error": "Text is required"}), 400
    with get_db() as conn:
        user = get_current_user(conn)
        if not _can_edit(conn, user, todo_id): return jsonify({"error": "Forbidden"}), 403
        now = datetime.utcnow().isoformat()
        cur = conn.execute("INSERT INTO comments (todo_id, user_id, text, created_at) VALUES (?, ?, ?, ?)", (todo_id, user['id'], text, now))
        conn.commit()
        comment = conn.execute("SELECT c.*, u.name as owner_name, u.email as owner_email FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(comment)), 201


@app.route("/api/comments/<int:comment_id>", methods=["PUT"])
@login_required
def update_comment(comment_id):
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    if not text: return jsonify({"error": "Text is required"}), 400
    with get_db() as conn:
        user = get_current_user(conn)
        row = conn.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
        if row is None: return jsonify({"error": "Not found"}), 404
        if row['user_id'] != user['id'] and user['role'] != 'admin': return jsonify({"error": "Forbidden"}), 403
        conn.execute("UPDATE comments SET text = ? WHERE id = ?", (text, comment_id))
        conn.commit()
        updated = conn.execute("SELECT c.*, u.name as owner_name, u.email as owner_email FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?", (comment_id,)).fetchone()
    return jsonify(dict(updated))


@app.route("/api/comments/<int:comment_id>", methods=["DELETE"])
@login_required
def delete_comment(comment_id):
    with get_db() as conn:
        user = get_current_user(conn)
        row = conn.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
        if row is None: return jsonify({"error": "Not found"}), 404
        if row['user_id'] != user['id'] and user['role'] != 'admin': return jsonify({"error": "Forbidden"}), 403
        conn.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        conn.commit()
    return jsonify({"deleted": comment_id})


@app.route("/api/labels", methods=["GET"])
@login_required
def list_labels():
    with get_db() as conn:
        rows = conn.execute("SELECT DISTINCT label FROM todo_labels ORDER BY label").fetchall()
    return jsonify([r["label"] for r in rows])


# ── Admin Routes ────────────────────────────────────────────────────

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_list_users():
    with get_db() as conn:
        users = conn.execute("SELECT id, email, name, role, permission, created_at FROM users ORDER BY created_at DESC").fetchall()
        return jsonify([dict(u) for u in users])


@app.route("/api/admin/users", methods=["POST"])
@admin_required
def admin_create_user():
    data = request.get_json(force=True)
    email, name = data.get('email', '').strip().lower(), data.get('name', '').strip()
    if not email or not name: return jsonify({'error': 'Email and name required'}), 400
    try:
        with get_db() as conn:
            cur = conn.execute("INSERT INTO users (email, name, role, permission, created_at) VALUES (?, ?, ?, ?, ?)", (email, name, data.get('role', 'user'), data.get('permission', 'own'), datetime.utcnow().isoformat()))
            conn.commit()
            u = conn.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
            return jsonify(dict(u)), 201
    except sqlite3.IntegrityError: return jsonify({'error': 'User email exists'}), 409


@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
@admin_required
def admin_update_user(user_id):
    data = request.get_json(force=True)
    with get_db() as conn:
        conn.execute("UPDATE users SET role = ?, permission = ? WHERE id = ?", (data.get('role', 'user'), data.get('permission', 'own'), user_id))
        conn.commit()
        u = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        return jsonify(dict(u))


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def admin_delete_user(user_id):
    with get_db() as conn:
        user = conn.execute("SELECT email FROM users WHERE id=?", (user_id,)).fetchone()
        if user and user['email'] == config.ADMIN_EMAIL: return jsonify({'error': 'Cannot delete root admin'}), 403
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    return jsonify({'deleted': user_id})


@app.route("/api/admin/masquerade/<int:user_id>", methods=["POST"])
@admin_required
def admin_masquerade(user_id):
    with get_db() as conn:
        target = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not target: return jsonify({'error': 'User not found'}), 404
        session['masquerade_user_id'] = user_id
        session.modified = True
    return jsonify({'masquerading': True})


@app.route("/api/admin/masquerade/quit", methods=["POST"])
@login_required
def admin_masquerade_quit():
    session.pop('masquerade_user_id', None)
    return jsonify({'masquerading': False})


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, port=port)
