from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import sqlite3

app = Flask(__name__)
app.secret_key = 'nsysu_learning_platform_secret_key_2026'

# 資料庫連線輔助函數
def get_db():
    conn = sqlite3.connect('project.db')
    conn.row_factory = sqlite3.Row
    return conn

# 首頁 - 導向登入頁
@app.route("/")
def home():
    return render_template("login.html")


# 登入
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

# 學生儀表板
@app.route("/student")
def student_dashboard():
    if "user_id" not in session or session["role"] != "student":
        return redirect(url_for('login_page'))
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 獲取學生的課程
    cursor.execute("""
        SELECT c.* FROM Course c
        JOIN Enrolls e ON c.course_id = e.course_id
        WHERE e.student_id = ?
    """, (session["user_id"],))
    courses = cursor.fetchall()
    
    conn.close()
    
    return render_template('model.html', 
                         user_name=session["user_name"],
                         user_id=session["user_id"],
                         courses=courses)

# 教師儀表板
@app.route("/teacher")
def teacher_dashboard():
    if "user_id" not in session or session["role"] != "teacher":
        return redirect(url_for('login_page'))
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 獲取教師教授的課程
    cursor.execute("""
        SELECT c.*, COUNT(DISTINCT e.student_id) as student_count
        FROM Course c
        JOIN Teaches t ON c.course_id = t.course_id
        LEFT JOIN Enrolls e ON c.course_id = e.course_id
        WHERE t.teacher_id = ?
        GROUP BY c.course_id
    """, (session["user_id"],))
    courses = cursor.fetchall()
    
    # 獲取教師發布的公告
    cursor.execute("""
        SELECT n.*, c.course_name 
        FROM Notification n
        JOIN Course c ON n.course_id = c.course_id
        WHERE n.teacher_id = ?
        ORDER BY n.due_date DESC LIMIT 10
    """, (session["user_id"],))
    notifications = cursor.fetchall()
    
    conn.close()
    
    return render_template('teacher.html',
                         user_name=session["user_name"],
                         user_id=session["user_id"],
                         courses=courses,
                         notifications=notifications)

# 登出
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for('home'))

# API: 取得當前使用者的課程（學生/教師）
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

# API: 獲取課程學生列表（教師用）
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

# API: 發布公告（教師用）
@app.route("/api/announcement", methods=["POST"])
def create_announcement():
    if "user_id" not in session or session["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    
    import uuid
    notification_id = str(uuid.uuid4())[:8]
    
    cursor.execute("""
        INSERT INTO Notification (teacher_id, notification_id, course_id, type, information, due_date)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (session["user_id"], notification_id, data["course_id"], 
          "公告", data["information"], data.get("due_date")))
    
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "notification_id": notification_id})

# API: 編輯公告（教師用）
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


# API: 刪除公告（教師用）
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
# API: 獲取單一課程詳細資訊
@app.route("/api/course/<course_id>")
def get_course_detail(course_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 獲取課程基本資訊
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
    
    # 獲取課程公告
    cursor.execute("""
        SELECT notification_id, information, due_date, type
        FROM Notification
        WHERE course_id = ?
        ORDER BY due_date DESC LIMIT 5
    """, (course_id,))
    announcements = cursor.fetchall()
    
    # 獲取課程單元
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


# API: 獲取課程教材
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

# API: 取得學生通知設定
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




# API: 更新單一通知設定
@app.route("/api/notification_setting", methods=["POST"])
def update_notification_setting():
    if "user_id" not in session or session["role"] != "student":
        return jsonify({"error": "Unauthorized"}), 401


    data = request.json
    notification_type = data.get("type")
    switch = data.get("notification_switch")  # True / False


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



if __name__ == "__main__":
    app.run(debug=True)