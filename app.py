from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import sqlite3
import uuid
import time

app = Flask(__name__)
app.secret_key = 'nsysu_learning_platform_secret_key_2026'

SCREEGO_URL = "https://app.screego.net"

def get_db():
    conn = sqlite3.connect('project.db')
    conn.row_factory = sqlite3.Row
    return conn

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
    allowed_types = ('作業', '考試', '課程異動')

    conn = get_db()
    cursor = conn.cursor()

    if role == "student":
        cursor.execute("""
            SELECT information AS title, due_date AS start, type, information
            FROM Notification
            WHERE course_id IN (
                SELECT course_id FROM Enrolls WHERE student_id = ?
            )
            AND type IN ('作業通知', '考試通知', '課程異動通知')
        """, (user_id,))
    else:
        cursor.execute("""
            SELECT information AS title, due_date AS start, type, information
            FROM Notification
            WHERE teacher_id = ?
            AND type IN ('作業通知', '考試通知', '課程異動通知')
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
        if requested_type in ("一般公告", "公告"):
            type_filter = "AND n.type IN ('公告', '一般公告')"
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
        if requested_type in ("一般公告", "公告"):
            type_filter = "AND n.type IN ('公告', '一般公告')"
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
    announcement_type = data.get("type", "一般公告")

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
        SELECT notification_id, information, due_date, type
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

    conn.close()

    return jsonify({
        "course": dict(course),
        "announcements": [dict(a) for a in announcements],
        "modules": [dict(m) for m in modules]
    })

@app.route("/api/course/<course_id>/materials")
def get_course_materials(course_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT m.module_id, m.title, mat.material
        FROM Module m
        LEFT JOIN Material mat ON m.module_id = mat.module_id
        WHERE m.course_id = ?
        ORDER BY m.module_id
    """, (course_id,))

    materials = cursor.fetchall()
    conn.close()

    return jsonify({"materials": [dict(m) for m in materials]})

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
        UPDATE Setting
        SET notification_switch = ?
        WHERE student_id = ? AND type = ?
    """, (switch, session["user_id"], notification_type))
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
    information = f"""【線上課程】老師已發起線上直播課程！

點擊下方連結加入課程，觀看老師螢幕畫面：

👉 {room_url} 👈

（此連結在本次課程結束後失效）"""

    cursor.execute("""
        INSERT INTO Notification (teacher_id, notification_id, course_id, type, information, due_date)
        VALUES (?, ?, ?, ?, ?, date('now', '+7 days'))
    """, (session["user_id"], notification_id, course_id, "公告", information))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "room_url": room_url,
        "course_id": course_id,
        "message": "房間已建立！公告已自動發布到學生公告區"
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


if __name__ == "__main__":
    app.run(debug=True)