# :school: NSYSU Cyber University

A redesigned student learning portal for **National Sun Yat-sen University (中山網路大學)**,
built as the final project for **MIS205 — Database Management** (Group 5).

One login gives a student everything that matters — their courses, every announcement, all
their deadlines, and even a button to join a live class — all in one place, powered by a single
relational database. Teachers get their own dashboard to manage courses, announcements,
materials, grades, and live sessions.

---

## ✨ Features

### 👨‍🎓 Student Dashboard
- **Login / authentication** against the database.
- **My Courses** — see *only* the courses you are enrolled in.
- **Announcements by category** — general, homework, exam, course-change, discussion, and grade.
- **Unread "red-dot" alerts** — per-category unread indicators; opening a notification marks it read so the dot clears.
- **Notification settings** — switch each category on/off (this also controls which red dots appear).
- **Unified calendar** — every homework, exam, and course-change deadline from all your courses in one view.
- **Course materials** — download files or **preview PDFs right inside the app**.
- **Profile editing** — update your display name and email.

### 👩‍🏫 Teacher Dashboard
- **My Courses** — each course shown with its **live enrolled-student count**.
- **Announcements** — create, edit, and delete announcements per course (owner-only).
- **Student roster + grades** — view every enrolled student and their grade.
- **Grade & homework management** views.
- **Course materials** — upload teaching files (an announcement is auto-posted to students) and delete them.
- **Live online class** — start a screen-share session (via Screego); the join link is auto-posted to enrolled students.
- **In-app PDF preview** and **profile editing**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, [Flask](https://flask.palletsprojects.com/) |
| **Database** | SQLite (Python `sqlite3`) |
| **Frontend** | HTML, CSS, vanilla JavaScript, Jinja2 templates |
| **Libraries** | Werkzeug (`secure_filename`), [FullCalendar](https://fullcalendar.io/) (CDN), Google Fonts (Noto Sans TC) |
| **External service** | [Screego](https://app.screego.net) — live screen-sharing for online classes |

---

## 🏗️ System Architecture

A simple **3-tier web application**: the browser talks to a Flask app, which reads and writes a
SQLite database. The whole thing is one loop — the browser calls a route, Flask runs an SQL
query, and the result comes back as a rendered HTML page or as JSON.

```
┌────────────────────────────┐     HTTP request      ┌──────────────────────────┐     SQL      ┌─────────────────┐
│   CLIENT (Web Browser)     │  ───────────────────▶ │   FLASK APP (app.py)     │  ─────────▶  │  SQLite          │
│   HTML · CSS · JavaScript  │ ◀───────────────────  │   routing · sessions     │  ◀─────────  │  project.db      │
│   (student & teacher UI)   │   HTML page / JSON     │   JSON APIs · file I/O   │    rows      │  (relational)    │
└────────────────────────────┘                       └──────────────────────────┘              └─────────────────┘
```

**Frontend** (`templates/` + `static/`) — server-rendered Jinja2 pages plus JavaScript that
calls the JSON APIs with `fetch()`.
**Backend** (`app.py`) — a single Flask module that handles login/sessions, page routes, the
JSON API, file uploads, and all database access.
**Database** (`project.db`) — a SQLite database built from `group5_Database.sql`.

### Project structure

```
NSYSU-Cyber-University/
├── app.py                      # Flask application — all routes + database access (backend)
├── db_init.py                  # Builds project.db by running the SQL script
├── group5_Database.sql         # Database schema (DDL) + seed data (INSERT)
├── requirements.txt            # Python dependencies
│
├── templates/                  # Jinja2 HTML pages (frontend)
│   ├── login.html              #   Login page
│   ├── model.html              #   Student dashboard
│   ├── teacher.html            #   Teacher dashboard
│   └── calendar.html           #   Shared calendar (FullCalendar)
│
├── static/                     # Frontend assets
│   ├── css/                    #   login.css · students.css · teacher.css
│   └── js/                     #   student.js · teacher.js
│
├── uploads/materials/          # Uploaded course files (stored on disk)
│
└── images/                     # Database design diagrams
    ├── ERD REVISED.png                 # Entity-Relationship diagram
    ├── RELATIONAL SCHEMA REVISED.png   # Relational schema (tables, PK/FK)
    └── NORMALIZATION REVISED.png       # Functional dependencies / normalization
```

### Database design

The schema covers students, teachers, courses, enrolments, announcements (with read-tracking),
notification settings, modules, and course materials. See the diagrams in [`images/`](images/):

- **ER diagram:** [`images/ERD REVISED.png`](images/ERD%20REVISED.png)
- **Relational schema:** [`images/RELATIONAL SCHEMA REVISED.png`](images/RELATIONAL%20SCHEMA%20REVISED.png)
- **Normalization (functional dependencies):** [`images/NORMALIZATION REVISED.png`](images/NORMALIZATION%20REVISED.png)

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.x** (developed and tested on Python 3.12)

### Run it locally

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd NSYSU-Cyber-University

# 2. (Recommended) create and activate a virtual environment
python -m venv venv
# Windows:        venv\Scripts\activate
# macOS / Linux:  source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
#   (or simply:  pip install flask)

# 4. Build the database from the SQL script (creates project.db with seed data)
python db_init.py

# 5. Start the development server
python app.py

# 6. Open the app in your browser
#    http://127.0.0.1:5000
```

> ⚠️ Re-running `python db_init.py` **deletes and rebuilds** `project.db`, so any data created
> while using the app (new announcements, uploaded materials, read receipts) will be reset.

### How to use it
1. Open `http://127.0.0.1:5000`.
2. On the login page, choose **Student** or **Teacher**.
3. Enter one of the default accounts below and log in.
4. Explore the dashboard — courses, announcements, calendar, materials, settings, and (for teachers) live classes.

---

## 🔑 Default Accounts

These accounts are seeded automatically by `group5_Database.sql` (they are also listed on the
login page).

### Students
| Student ID | Password | Name | Enrolled courses |
|------------|----------|------|------------------|
| `B0111111111` | `Amy111` | Amy | 資料庫管理 (MIS205), 管理資訊系統 (MIS304), 資料視覺化 (CSS137) |
| `B0111111112` | `Andy112` | Andy | 商事法 (MIS206), 管理資訊系統 (MIS304) |

### Teachers
| Teacher ID | Password | Name | Courses taught |
|------------|----------|------|----------------|
| `T123456789` | `T12345pclo` | pclo | 資料庫管理 (MIS205), 商事法 (MIS206) |
| `T192837465` | `T19283Har` | Harry | 管理資訊系統 (MIS304), 資料視覺化 (CSS137 — online) |

> 💡 To demo the **live online class** feature, log in as **Harry** and open **資料視覺化
> (CSS137)** — it is the course flagged as online, so the "Start Live Class" button appears.

---

## 👥 Team — Group 5

| Name | Role |
|------|------|
| 郭家綺 (Leader) | Backend |
| Kyle Robin ANDAYA | Backend |
| 黃冠熙 | Frontend |
| 陳粢渝 | Frontend |
| 許萱文 | Support |
| 蕭雅心 | Support |

**Course:** MIS205 — Database Management · Instructor: Pei-Chi Lo · National Sun Yat-sen University

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
