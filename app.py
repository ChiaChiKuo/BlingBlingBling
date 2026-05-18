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


@app.route("/login", methods=["POST"])
def login():

    role = request.form["role"]
    user_id = request.form["user_id"]
    password = request.form["password"]

    # 假設驗證成功
    session['user_id'] = user_id
    session['role'] = role
    session['user_name'] = user_id   # 新增這行

    if role == 'student':
        return redirect(url_for('student_dashboard'))
    else:
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
    print("=" * 40)
    print("登出前 session:", dict(session))
    session.clear()
    print("登出後 session:", dict(session))
    print("跳轉到 home()")
    print("=" * 40)
    return redirect(url_for('home'))

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

if __name__ == "__main__":
    app.run(debug=True)