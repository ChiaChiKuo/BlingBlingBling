from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
import sqlite3
import uuid
import time
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'nsysu_learning_platform_secret_key_2026'

SCREEGO_URL = "https://app.screego.net"
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'materials')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db():
    conn = sqlite3.connect(os.path.join(BASE_DIR, 'project.db'))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Material(
            module_id CHAR(10) NOT NULL,
            material_id CHAR(10) NOT NULL PRIMARY KEY,
            course_id CHAR(10) NOT NULL,
            filename VARCHAR NOT NULL,
            stored_filename VARCHAR NOT NULL,
            uploaded_at TEXT NOT NULL,
            uploaded_by CHAR(10) NOT NULL,
            FOREIGN KEY (course_id) REFERENCES Course(course_id)
        )
    """)
    conn.commit()
    return conn

NOTIFICATION_CATEGORY_MAP = {
    "assignment": {
        "notification_types": ("assignment",),
        "setting_types": ("assignment",),
    },
    "exam": {
        "notification_types": ("exam",),
        "setting_types": ("exam",),
    },
    "discussion": {
        "notification_types": ("discussion",),
        "setting_types": ("discussion",),
    },
    "announcement": {
        "notification_types": ("announcement",),
        "setting_types": ("announcement",),
    },
    "courses_change": {
        "notification_types": ("courses_change",),
        "setting_types": ("courses_change",),
    },
    "scores": {
        "notification_types": ("scores",),
        "setting_types": ("scores",),
    },
}


def ensure_notification_read_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Notification_Read (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id CHAR(10) NOT NULL,
            notification_id CHAR(10) NOT NULL,
            course_id CHAR(10) NOT NULL,
            read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, notification_id, course_id),
            FOREIGN KEY (student_id) REFERENCES Student(student_id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (notification_id, course_id) REFERENCES Notification(notification_id, course_id)
                ON DELETE CASCADE ON UPDATE CASCADE
        )
    """)


def placeholders(values):
    return ",".join(["?"] * len(values))


def is_notification_type_enabled(cursor, student_id, setting_types):
    cursor.execute(f"""
        SELECT notification_switch
        FROM Setting
        WHERE student_id = ?
          AND type IN ({placeholders(setting_types)})
        LIMIT 1
    """, (student_id, *setting_types))
    setting = cursor.fetchone()
    return True if setting is None else bool(setting["notification_switch"])

# 首頁 - 導向登入頁
@app.route("/")
def courses():
    return render_template("login.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template('login.html')

    role = request.form.get("role", "").strip()
    user_id = request.form.get("user_id", "").strip()
    password = request.form.get("password", "")

    if role not in ("student", "teacher"):
        return render_template('login.html', error="帳號或密碼錯誤")

    conn = get_db()
    cursor = conn.cursor()

    if role == "student":
        cursor.execute(
            "SELECT student_name AS name FROM Student WHERE student_id = ? AND password = ?",
            (user_id, password)
        )
    else:
        cursor.execute(
            "SELECT teacher_name AS name FROM Teacher WHERE teacher_id = ? AND password = ?",
            (user_id, password)
        )

    row = cursor.fetchone()
    conn.close()

    if not row:
        return render_template('login.html', error="帳號或密碼錯誤")

    session["role"] = role
    session["user_id"] = user_id
    session["user_name"] = row["name"]

    if role == "student":
        return redirect(url_for('student_dashboard'))
    return redirect(url_for('teacher_dashboard'))

@app.route("/student")
def student_dashboard():
    if "user_id" not in session or session["role"] != "student":
        return redirect(url_for('login'))

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.* FROM Course c
        JOIN Enrolls e ON c.course_id = e.course_id
        WHERE e.student_id = ?
    """, (session["user_id"],))
    courses = cursor.fetchall()

    cursor.execute("""
        SELECT n.*, c.course_name
        FROM Notification n
        JOIN Course c ON n.course_id = c.course_id
        WHERE n.course_id IN (
            SELECT course_id FROM Enrolls WHERE student_id = ?
        )
        ORDER BY n.due_date DESC, n.notification_id DESC
    """, (session["user_id"],))
    notifications = cursor.fetchall()

    cursor.execute("SELECT email FROM Student WHERE student_id = ?", (session["user_id"],))
    student_row = cursor.fetchone()
    user_email = student_row["email"] if student_row else ""

    conn.close()

    return render_template('model.html',
                           user_name=session["user_name"],
                           user_id=session["user_id"],
                           user_email=user_email,
                           courses=courses,
                           notifications=notifications)

@app.route("/teacher")
def teacher_dashboard():
    if "user_id" not in session or session["role"] != "teacher":
        return redirect(url_for('login'))

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.*, COUNT(DISTINCT e.student_id) as student_count
        FROM Course c
        JOIN Teaches t ON c.course_id = t.course_id
        LEFT JOIN Enrolls e ON c.course_id = e.course_id
        WHERE t.teacher_id = ?
        GROUP BY c.course_id
    """, (session["user_id"],))
    courses = cursor.fetchall()

    cursor.execute("""
        SELECT n.*, c.course_name
        FROM Notification n
        JOIN Course c ON n.course_id = c.course_id
        WHERE n.teacher_id = ?
        ORDER BY n.due_date DESC LIMIT 10
    """, (session["user_id"],))
    notifications = cursor.fetchall()

    cursor.execute("SELECT email FROM Teacher WHERE teacher_id = ?", (session["user_id"],))
    teacher_row = cursor.fetchone()
    user_email = teacher_row["email"] if teacher_row else ""

    conn.close()

    return render_template('teacher.html',
                           user_name=session["user_name"],
                           user_id=session["user_id"],
                           user_email=user_email,
                           courses=courses,
                           notifications=notifications)

@app.route("/student/calendar")
def student_calendar():
    if "user_id" not in session or session["role"] != "student":
        return redirect(url_for("login"))

    return render_template(
        "calendar.html",
        user_name=session["user_name"],
        role="student"
    )

@app.route("/teacher/calendar")
def teacher_calendar():
    if "user_id" not in session or session["role"] != "teacher":
        return redirect(url_for("login"))

    return render_template(
        "calendar.html",
        user_name=session["user_name"],
        role="teacher"
    )

@app.route("/events")
def events():
    if "user_id" not in session:
        return redirect(url_for("login"))

    user_id = session["user_id"]
    role = session["role"]

    # 只顯示這三種類型
    allowed_types = ('assignment', 'exam', 'courses_change')

    conn = get_db()
    cursor = conn.cursor()

    if role == "student":
        cursor.execute("""
            SELECT information AS title, due_date AS start, type, information
            FROM Notification
            WHERE course_id IN (
                SELECT course_id FROM Enrolls WHERE student_id = ?
            )
            AND type IN ('assignment', 'exam', 'courses_change')
        """, (user_id,))
    else:
        cursor.execute("""
            SELECT information AS title, due_date AS start, type, information
            FROM Notification
            WHERE teacher_id = ?
            AND type IN ('assignment', 'exam', 'courses_change')
        """, (user_id,))

    events = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify(events)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for('courses'))

@app.route("/api/profile", methods=["PUT"])
def update_profile():
    if "user_id" not in session or "role" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()

    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    if session["role"] == "student":
        cursor.execute(
            "UPDATE Student SET student_name = ?, email = ? WHERE student_id = ?",
            (name, email, session["user_id"])
        )
    elif session["role"] == "teacher":
        cursor.execute(
            "UPDATE Teacher SET teacher_name = ?, email = ? WHERE teacher_id = ?",
            (name, email, session["user_id"])
        )
    else:
        conn.close()
        return jsonify({"error": "Invalid role"}), 403

    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    conn.commit()
    conn.close()

    session["user_name"] = name

    return jsonify({"success": True, "name": name, "email": email})

@app.route("/api/my_courses")
def get_my_courses():
    if "user_id" not in session or "role" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()

    if session["role"] == "student":
        cursor.execute("""
            SELECT c.*
            FROM Course c
            JOIN Enrolls e ON c.course_id = e.course_id
            WHERE e.student_id = ?
        """, (session["user_id"],))
    elif session["role"] == "teacher":
        cursor.execute("""
            SELECT c.*
            FROM Course c
            JOIN Teaches t ON c.course_id = t.course_id
            WHERE t.teacher_id = ?
        """, (session["user_id"],))
    else:
        conn.close()
        return jsonify({"error": "Invalid role"}), 403

    courses = cursor.fetchall()
    conn.close()

    return jsonify({"courses": [dict(course) for course in courses]})

@app.route("/api/announcements")
def get_announcements():
    if "user_id" not in session or session["role"] != "student":
        return jsonify({"error": "Unauthorized"}), 401

    requested_type = request.args.get("type", "").strip()

    conn = get_db()
    cursor = conn.cursor()

    params = [session["user_id"]]
    type_filter = ""
    if requested_type:
        if requested_type in ("announcement"):
            type_filter = "AND n.type IN ('announcement')"
        else:
            type_filter = "AND n.type = ?"
            params.append(requested_type)

    cursor.execute(f"""
        SELECT n.notification_id, n.course_id, n.type, n.information, n.due_date,
               c.course_name
        FROM Notification n
        JOIN Course c ON n.course_id = c.course_id
        WHERE n.course_id IN (
            SELECT course_id FROM Enrolls WHERE student_id = ?
        )
        {type_filter}
        ORDER BY n.due_date DESC
    """, params)
    announcements = cursor.fetchall()
    conn.close()

    return jsonify({"announcements": [dict(a) for a in announcements]})

@app.route("/api/teacher/announcements")
def get_teacher_announcements():
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401

    requested_type = request.args.get("type", "").strip()

    conn = get_db()
    cursor = conn.cursor()

    params = [session["user_id"]]
    type_filter = ""
    if requested_type:
        if requested_type in ("announcement"):
            type_filter = "AND n.type IN ('announcement')"
        else:
            type_filter = "AND n.type = ?"
            params.append(requested_type)

    cursor.execute(f"""
        SELECT n.notification_id, n.course_id, n.type, n.information, n.due_date,
               c.course_name
        FROM Notification n
        JOIN Course c ON n.course_id = c.course_id
        WHERE n.teacher_id = ?
        {type_filter}
        ORDER BY n.due_date DESC
    """, params)
    announcements = cursor.fetchall()
    conn.close()

    return jsonify({"announcements": [dict(a) for a in announcements]})

@app.route("/api/course/<course_id>/students")
def get_course_students(course_id):
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.student_id, s.student_name, s.email, e.grade
        FROM Student s
        JOIN Enrolls e ON s.student_id = e.student_id
        WHERE e.course_id = ?
    """, (course_id,))
    students = cursor.fetchall()
    conn.close()

    return jsonify([dict(student) for student in students])

@app.route("/api/announcement", methods=["POST"])
def create_announcement():
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    conn = get_db()
    cursor = conn.cursor()

    notification_id = str(uuid.uuid4())[:8]
    announcement_type = data.get("type", "announcement")

    cursor.execute("""
        INSERT INTO Notification (teacher_id, notification_id, course_id, type, information, due_date)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (session["user_id"], notification_id, data["course_id"],
          announcement_type, data["information"], data.get("due_date")))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "notification_id": notification_id})

@app.route("/api/announcement/<notification_id>/<course_id>", methods=["PUT"])
def update_announcement(notification_id, course_id):
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    information = data.get("information")
    due_date = data.get("due_date")

    if not information:
        return jsonify({"error": "Missing announcement content"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE Notification
        SET information = ?, due_date = ?
        WHERE notification_id = ?
          AND course_id = ?
          AND teacher_id = ?
    """, (information, due_date, notification_id, course_id, session["user_id"]))

    conn.commit()
    updated = cursor.rowcount
    conn.close()

    if updated == 0:
        return jsonify({"error": "Announcement not found or permission denied"}), 404

    return jsonify({"success": True})

@app.route("/api/announcement/<notification_id>/<course_id>", methods=["DELETE"])
def delete_announcement(notification_id, course_id):
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM Notification
        WHERE notification_id = ?
          AND course_id = ?
          AND teacher_id = ?
    """, (notification_id, course_id, session["user_id"]))

    conn.commit()
    deleted = cursor.rowcount
    conn.close()

    if deleted == 0:
        return jsonify({"error": "Announcement not found or permission denied"}), 404

    return jsonify({"success": True})

@app.route("/api/course/<course_id>")
def get_course_detail(course_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.*,
               GROUP_CONCAT(DISTINCT t.teacher_name) as teachers
        FROM Course c
        LEFT JOIN Teaches te ON c.course_id = te.course_id
        LEFT JOIN Teacher t ON te.teacher_id = t.teacher_id
        WHERE c.course_id = ?
        GROUP BY c.course_id
    """, (course_id,))

    course = cursor.fetchone()

    if not course:
        conn.close()
        return jsonify({"error": "Course not found"}), 404

    cursor.execute("""
        SELECT notification_id, course_id, information, due_date, type
        FROM Notification
        WHERE course_id = ?
        ORDER BY due_date DESC
    """, (course_id,))
    announcements = cursor.fetchall()

    cursor.execute("""
        SELECT module_id, title, description
        FROM Module
        WHERE course_id = ?
        ORDER BY module_id
    """, (course_id,))
    modules = cursor.fetchall()

    cursor.execute("""
    SELECT mat.material_id, mat.filename, mat.uploaded_at, mat.uploaded_by,
           m.module_id, m.title, m.description
    FROM Material mat
    LEFT JOIN Module m ON mat.module_id = m.module_id
    WHERE mat.course_id = ?
    ORDER BY mat.uploaded_at DESC

    """, (course_id,))
    materials = cursor.fetchall()

    conn.close()

    return jsonify({
        "course": dict(course),
        "announcements": [dict(a) for a in announcements],
        "modules": [dict(m) for m in modules],
        "materials": [dict(m) for m in materials]
    })

@app.route("/api/course/<course_id>/materials", methods=["GET", "POST"])
def get_course_materials(course_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "POST":
        if session["role"] != "teacher":
            return jsonify({"error": "Unauthorized"}), 401

        if "material" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["material"]
        if not file or file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()

        if not title:
            return jsonify({"error": "Title is required"}), 400

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM Teaches WHERE teacher_id = ? AND course_id = ?",
            (session["user_id"], course_id)
        )
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403

        # 建立 Module
        module_id = str(uuid.uuid4())[:8]
        cursor.execute(
            "INSERT INTO Module (module_id, course_id, title, description) VALUES (?, ?, ?, ?)",
            (module_id, course_id, title, description)
        )

        # 儲存檔案
        filename = secure_filename(file.filename)
        material_id = str(uuid.uuid4())[:8]
        stored_filename = f"{material_id}_{filename}"
        course_folder = os.path.join(UPLOAD_FOLDER, course_id)
        os.makedirs(course_folder, exist_ok=True)
        file.save(os.path.join(course_folder, stored_filename))

        uploaded_at = time.strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO Material (material_id, course_id, module_id, filename, stored_filename, uploaded_at, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (material_id, course_id, module_id, filename, stored_filename, uploaded_at, session["user_id"])
        )

        # 發公告
        notification_id = str(uuid.uuid4())[:8]
        cursor.execute(
            "INSERT INTO Notification (teacher_id, notification_id, course_id, type, information, due_date) VALUES (?, ?, ?, ?, ?, ?)",
            (
                session["user_id"],
                notification_id,
                course_id,
                'announcement',
                f'{title}\n\n{description}\n\n「{filename}」has been uploaded. Please go to the Course Materials section to download it.',
                time.strftime("%Y-%m-%d")
            )
        )

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "material_id": material_id,
            "module_id": module_id,
            "filename": filename
        })

    # GET
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT mat.material_id, mat.filename, mat.uploaded_at, mat.uploaded_by,
               m.module_id, m.title, m.description
        FROM Material mat
        LEFT JOIN Module m ON mat.module_id = m.module_id
        WHERE mat.course_id = ?
        ORDER BY mat.uploaded_at DESC
    """, (course_id,))
    materials = cursor.fetchall()
    conn.close()

    return jsonify({"materials": [dict(m) for m in materials]})



@app.route('/materials/<material_id>/download')
def download_material(material_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT course_id, filename, stored_filename FROM Material WHERE material_id = ?",
        (material_id,)
    )
    material = cursor.fetchone()
    if not material:
        conn.close()
        return jsonify({"error": "Material not found"}), 404

    course_id = material["course_id"]
    filename = material["filename"]
    stored_filename = material["stored_filename"]

    if session["role"] == "student":
        cursor.execute(
            "SELECT 1 FROM Enrolls WHERE student_id = ? AND course_id = ?",
            (session["user_id"], course_id)
        )
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403
    elif session["role"] == "teacher":
        cursor.execute(
            "SELECT 1 FROM Teaches WHERE teacher_id = ? AND course_id = ?",
            (session["user_id"], course_id)
        )
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403
    else:
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403

    conn.close()
    material_folder = os.path.join(UPLOAD_FOLDER, course_id)
    return send_from_directory(material_folder, stored_filename, as_attachment=True, download_name=filename)

@app.route('/materials/<material_id>/preview')
def preview_material(material_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT course_id, filename, stored_filename FROM Material WHERE material_id = ?",
        (material_id,)
    )
    material = cursor.fetchone()
    if not material:
        conn.close()
        return jsonify({"error": "Material not found"}), 404

    if not material["filename"].lower().endswith(".pdf"):
        conn.close()
        return jsonify({"error": "Only PDF files can be previewed"}), 400

    if session["role"] == "student":
        cursor.execute("SELECT 1 FROM Enrolls WHERE student_id = ? AND course_id = ?",
                       (session["user_id"], material["course_id"]))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403
    elif session["role"] == "teacher":
        cursor.execute("SELECT 1 FROM Teaches WHERE teacher_id = ? AND course_id = ?",
                       (session["user_id"], material["course_id"]))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403

    conn.close()
    material_folder = os.path.join(UPLOAD_FOLDER, material["course_id"])
    return send_from_directory(material_folder, material["stored_filename"],
                               as_attachment=False, mimetype="application/pdf")

@app.route("/api/notification_setting", methods=["GET"])
def get_notification_setting():
    if "user_id" not in session or session["role"] != "student":
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT type, notification_switch FROM Setting WHERE student_id = ?",
        (session["user_id"],)
    )
    settings = cursor.fetchall()
    conn.close()

    return jsonify({"settings": [dict(s) for s in settings]})

@app.route("/api/notification_setting", methods=["POST"])
def update_notification_setting():
    if "user_id" not in session or session["role"] != "student":
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    notification_type = data.get("type")
    switch = data.get("notification_switch")

    if notification_type is None or switch is None:
        return jsonify({"error": "Missing fields"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Setting (student_id, notification_switch, type)
        VALUES (?, ?, ?)
        ON CONFLICT(type, student_id)
        DO UPDATE SET notification_switch = excluded.notification_switch
    """, (session["user_id"], switch, notification_type))
    conn.commit()
    conn.close()

    return jsonify({"success": True})

@app.route("/api/notifications/unread", methods=["GET"])
def get_unread_notifications():
    if "user_id" not in session or session["role"] != "student":
        return jsonify({"error": "Unauthorized"}), 401

    student_id = session["user_id"]
    unread = {category: False for category in NOTIFICATION_CATEGORY_MAP}

    conn = get_db()
    ensure_notification_read_table(conn)
    cursor = conn.cursor()

    for category, config in NOTIFICATION_CATEGORY_MAP.items():
        if not is_notification_type_enabled(cursor, student_id, config["setting_types"]):
            continue

        notification_types = config["notification_types"]
        cursor.execute(f"""
            SELECT 1
            FROM Notification n
            JOIN Enrolls e
              ON e.course_id = n.course_id
             AND e.student_id = ?
            LEFT JOIN Notification_Read nr
              ON nr.student_id = ?
             AND nr.notification_id = n.notification_id
             AND nr.course_id = n.course_id
            WHERE n.type IN ({placeholders(notification_types)})
              AND nr.id IS NULL
            LIMIT 1
        """, (student_id, student_id, *notification_types))
        unread[category] = cursor.fetchone() is not None

    conn.commit()
    conn.close()
    return jsonify(unread)


@app.route("/api/notifications/read", methods=["POST"])
def mark_notification_read():
    if "user_id" not in session or session["role"] != "student":
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    notification_id = data.get("notification_id")
    course_id = data.get("course_id")

    if not notification_id:
        return jsonify({"error": "Missing notification_id"}), 400

    student_id = session["user_id"]
    conn = get_db()
    ensure_notification_read_table(conn)
    cursor = conn.cursor()

    params = [student_id, notification_id]
    course_filter = ""
    if course_id:
        course_filter = "AND n.course_id = ?"
        params.append(course_id)

    cursor.execute(f"""
        SELECT n.notification_id, n.course_id
        FROM Notification n
        JOIN Enrolls e
          ON e.course_id = n.course_id
         AND e.student_id = ?
        WHERE n.notification_id = ?
        {course_filter}
    """, params)
    notifications = cursor.fetchall()

    if not notifications:
        conn.close()
        return jsonify({"error": "Notification not found or permission denied"}), 404

    for notification in notifications:
        cursor.execute("""
            INSERT INTO Notification_Read (student_id, notification_id, course_id, read_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(student_id, notification_id, course_id)
            DO UPDATE SET read_at = excluded.read_at
        """, (student_id, notification["notification_id"], notification["course_id"]))

    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/check_setting")
def check_setting():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Setting WHERE student_id = ?", (session["user_id"],))
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/create_live_room", methods=["POST"])
def create_live_room():
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "未登入或無權限"}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.course_id, c.course_name FROM Course c
        JOIN Teaches t ON c.course_id = t.course_id
        WHERE t.teacher_id = ?
    """, (session["user_id"],))
    courses = cursor.fetchall()

    if not courses:
        conn.close()
        return jsonify({"error": "您目前沒有教授的課程"}), 400

    course_id = request.json.get("course_id") if request.json else None

    if not course_id:
        conn.close()
        return jsonify({
            "need_course": True,
            "courses": [{"course_id": c["course_id"], "course_name": c["course_name"]} for c in courses]
        }), 200

    room_name = str(uuid.uuid4())[:8]
    room_url = f"{SCREEGO_URL}/?room={room_name}"

    notification_id = str(uuid.uuid4())[:8]
    information = f"""[Live Class] The instructor has started a live session!

Click the link below to join the class and view the instructor's screen:

👉 {room_url} 👈

(This link will expire after the session ends.)"""

    cursor.execute("""
        INSERT INTO Notification (teacher_id, notification_id, course_id, type, information, due_date)
        VALUES (?, ?, ?, ?, ?, date('now', '+7 days'))
    """, (session["user_id"], notification_id, course_id, "announcement", information))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "room_url": room_url,
        "course_id": course_id,
        "message": "Session created! Notification automatically posted to the Student Announcements."
    })

@app.route("/api/all_announcements")
def get_all_announcements():
    if "user_id" not in session or session["role"] != "student":
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT n.*, c.course_name
        FROM Notification n
        JOIN Course c ON n.course_id = c.course_id
        WHERE n.course_id IN (
            SELECT course_id FROM Enrolls WHERE student_id = ?
        )
        ORDER BY n.due_date DESC, n.rowid DESC
    """, (session["user_id"],))

    announcements = cursor.fetchall()
    conn.close()

    return jsonify({"announcements": [dict(a) for a in announcements]})

@app.route("/api/course/<course_id>/materials/<material_id>", methods=["DELETE"])
def delete_material(course_id, material_id):
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT 1 FROM Teaches WHERE teacher_id = ? AND course_id = ?",
                   (session["user_id"], course_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403

    cursor.execute("SELECT stored_filename, module_id FROM Material WHERE material_id = ? AND course_id = ?",
                   (material_id, course_id))
    mat = cursor.fetchone()
    if not mat:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    file_path = os.path.join(UPLOAD_FOLDER, course_id, mat["stored_filename"])
    if os.path.exists(file_path):
        os.remove(file_path)

    cursor.execute("DELETE FROM Material WHERE material_id = ?", (material_id,))

    if mat["module_id"]:
        cursor.execute("SELECT COUNT(*) as cnt FROM Material WHERE module_id = ?", (mat["module_id"],))
        row = cursor.fetchone()
        if row["cnt"] == 0:
            cursor.execute("DELETE FROM Module WHERE module_id = ?", (mat["module_id"],))

    # 刪除對應的通知
    filename = mat["stored_filename"].split("_", 1)[-1]
    cursor.execute("""
        DELETE FROM Notification
        WHERE course_id = ? AND type = 'announcement'
        AND information LIKE ?
    """, (course_id, f'%{filename}%'))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/course/<course_id>/materials/<material_id>/module", methods=["PUT"])
def update_material_module(course_id, material_id):
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()

    if not title:
        return jsonify({"error": "Title is required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT 1 FROM Teaches WHERE teacher_id = ? AND course_id = ?",
                   (session["user_id"], course_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403

    cursor.execute("SELECT module_id FROM Material WHERE material_id = ? AND course_id = ?",
                   (material_id, course_id))
    row = cursor.fetchone()
    if not row or not row["module_id"]:
        conn.close()
        return jsonify({"error": "Material or module not found"}), 404

    cursor.execute("""
        UPDATE Module SET title = ?, description = ?
        WHERE module_id = ? AND course_id = ?
    """, (title, description, row["module_id"], course_id))

    cursor.execute(
        "SELECT filename FROM Material WHERE material_id = ? AND course_id = ?",
        (material_id, course_id)
    )
    mat_row = cursor.fetchone()
    if mat_row:
        filename = mat_row["filename"]
        info_parts = [title]
        if description:
            info_parts.append(description)
        info_parts.append(f'「{filename}」has been uploaded. Please go to the Course Materials section to download it.')
        new_information = '\n\n'.join(info_parts)
        cursor.execute("""
            UPDATE Notification
            SET information = ?
            WHERE course_id = ?
              AND teacher_id = ?
              AND type = 'announcement'
              AND information LIKE ?
        """, (new_information, course_id, session["user_id"], f'%{filename}%'))
        print(f"[DEBUG] updated rows: {cursor.rowcount}, filename: {filename}")
    conn.commit()
    conn.close()
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True)
