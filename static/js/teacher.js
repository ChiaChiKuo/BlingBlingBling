// ========== 初始化 ==========
function initializeApp() {
    if (isLoggedIn) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'block';
        
        setTimeout(() => {
            const activePage = document.querySelector('.page.active');
            if (activePage && activePage.id === 'page-courses') {
                loadCourses();
            }
        }, 100);
    } else {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('app-page').style.display = 'none';
    }
}

// ========== 登入 ==========
function doLogin() {
    const role = document.getElementById('login-role').value;
    const user_id = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const err = document.getElementById('login-error');
    
    const formData = new URLSearchParams();
    formData.append('role', role);
    formData.append('user_id', user_id);
    formData.append('password', password);
    
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    })
    .then(response => response.text())
    .then(html => {
        if (html.includes('login-error') || html.includes('帳號或密碼錯誤')) {
            err.style.display = 'block';
        } else {
            err.style.display = 'none';
            location.reload();
        }
    })
    .catch(err => {
        console.error('登入錯誤:', err);
        document.getElementById('login-error').style.display = 'block';
    });
}

// ========== 載入課程 ==========
async function loadCourses() {
    const container = document.getElementById('courses-container');
    const countElem = document.getElementById('course-count');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>載入課程中...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/my_courses');
        
        if (!response.ok) {
            throw new Error('載入課程失敗');
        }
        
        const data = await response.json();
        const courses = data.courses || [];
        
        if (countElem) {
            countElem.textContent = `您目前教授 ${courses.length} 門課程`;
        }
        
        displayCourses(courses);
        
    } catch (error) {
        console.error('載入錯誤：', error);
        container.innerHTML = `
            <div class="error-state">
                <span class="error-icon">⚠️</span>
                <p>${error.message}</p>
                <button class="retry-btn" onclick="loadCourses()">重新載入</button>
            </div>
        `;
    }
}

// ========== 顯示課程卡片 ==========
function displayCourses(courses) {
    const container = document.getElementById('courses-container');
    
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📖</span>
                <p>您目前沒有教授任何課程</p>
                <button class="browse-btn" onclick="showToast('開課功能開發中')">開設新課程</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    const colors = ['#e0f7fa', '#fff8e1', '#f3e5f5', '#e8f5e9', '#fce4ec', '#ede7f6'];
    
    courses.forEach((course, index) => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.onclick = () => viewCourseDetail(course.course_id);
        
        card.innerHTML = `
            <div class="course-banner" style="background:${colors[index % colors.length]}; padding: 20px; text-align: center; font-size: 40px;">
                📚
            </div>
            <div class="course-body">
                <div class="course-name">${escapeHtml(course.course_name)}</div>
                <div class="course-dept">課程代碼：${escapeHtml(course.course_id)}</div>
                <div class="course-stats">
                    <span>📖 ${course.credits || 3} 學分</span>
                    <span>👥 管理</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ========== 頁面切換 ==========
const pages = ['home', 'courses', 'announcements', 'students', 'settings', 'course-detail'];

function goPage(name) {
    pages.forEach(p => {
        const pg = document.getElementById('page-' + p);
        if (pg) pg.classList.remove('active');
    });
    
    const targetPage = document.getElementById('page-' + name);
    if (targetPage) targetPage.classList.add('active');
    
    const navItems = ['home', 'courses', 'announcements', 'students', 'settings'];
    navItems.forEach(p => {
        const nav = document.getElementById('nav-' + p);
        if (nav) nav.classList.remove('active');
    });
    
    if (name !== 'course-detail') {
        const activeNav = document.getElementById('nav-' + name);
        if (activeNav) activeNav.classList.add('active');
    }
    
    if (name === 'courses') {
        setTimeout(() => loadCourses(), 50);
    }
}

// ========== 課程詳情功能 ==========

let currentCourseId = null;
let currentCourseData = null;

// 查看課程詳情
async function viewCourseDetail(courseId) {
    currentCourseId = courseId;
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const detailPage = document.getElementById('page-course-detail');
    if (detailPage) detailPage.classList.add('active');
    
    document.getElementById('course-detail-title').textContent = '載入中...';
    document.getElementById('course-detail-info').textContent = '讀取課程資料中';
    
    try {
        const response = await fetch(`/api/course/${courseId}`);
        
        if (!response.ok) {
            throw new Error('載入課程失敗');
        }
        
        const data = await response.json();
        currentCourseData = data;
        displayCourseDetail(data);
        
    } catch (error) {
        console.error('載入課程詳情錯誤:', error);
        document.getElementById('course-description').innerHTML = `
            <div class="error-state">
                <span class="error-icon">⚠️</span>
                <p>載入失敗：${error.message}</p>
                <button class="retry-btn" onclick="viewCourseDetail('${courseId}')">重新載入</button>
            </div>
        `;
    }
}

// 顯示課程詳情
function displayCourseDetail(data) {
    const course = data.course;
    const announcements = data.announcements || [];
    
    document.getElementById('course-detail-title').textContent = course.course_name;
    document.getElementById('course-detail-info').textContent = `課程代碼：${course.course_id}`;
    document.getElementById('course-description').textContent = course.description || '暫無課程簡介';
    document.getElementById('course-teachers').textContent = course.teachers || '未指定';
    document.getElementById('course-credits').textContent = course.credits || 3;
    document.getElementById('course-semester').textContent = course.semester || '114_2';
    document.getElementById('course-mode').textContent = course.is_online ? '線上課程' : '實體課程';
    
    displayAnnouncements(announcements);
}

// 顯示公告列表
function displayAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    
    if (!announcements || announcements.length === 0) {
        container.innerHTML = '<p style="color: #999;">暫無公告</p>';
        return;
    }
    
    container.innerHTML = announcements.map(a => `
        <div class="announce-item">
            <div class="announce-dot"></div>
            <div class="announce-content">
                <div class="announce-title">${escapeHtml(a.type || '公告')}</div>
                <div class="announce-desc">${escapeHtml(a.information || '')}</div>
                <div class="announce-date">${a.due_date || '日期未定'}</div>
            </div>
        </div>
    `).join('');
}

// 發布課程公告
async function publishCourseAnnouncement() {
    if (!currentCourseId) {
        showToast('請先選擇課程');
        return;
    }
    
    const title = document.getElementById('publish-title').value;
    const content = document.getElementById('publish-content').value;
    const date = document.getElementById('publish-date').value;
    
    if (!content) {
        showToast('請填寫公告內容');
        return;
    }
    
    const information = title ? `${title}\n\n${content}` : content;
    
    try {
        const response = await fetch('/api/announcement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                course_id: currentCourseId,
                information: information,
                due_date: date || new Date().toISOString().split('T')[0]
            })
        });
        
        if (!response.ok) {
            throw new Error('發布失敗');
        }
        
        const result = await response.json();
        if (result.success) {
            showToast('公告發布成功！');
            // 清空表單
            document.getElementById('publish-title').value = '';
            document.getElementById('publish-content').value = '';
            document.getElementById('publish-date').value = '';
            
            // 重新載入公告列表（不重新載入整個頁面）
            await refreshAnnouncements();
        }
        
    } catch (error) {
        console.error(error);
        showToast('發布失敗，請稍後再試');
    }
}

// 新增：刷新公告列表
async function refreshAnnouncements() {
    if (!currentCourseId) return;
    
    try {
        const response = await fetch(`/api/course/${currentCourseId}`);
        if (response.ok) {
            const data = await response.json();
            const announcements = data.announcements || [];
            displayAnnouncements(announcements);
        }
    } catch (error) {
        console.error('刷新公告失敗:', error);
    }
}

// 切換課程標籤頁
function switchCourseTab(tabName, event) {
    const tabs = document.querySelectorAll('.course-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    document.getElementById('course-overview').style.display = 'none';
    document.getElementById('course-announcements').style.display = 'none';
    document.getElementById('course-publish').style.display = 'none';
    
    if (tabName === 'overview') {
        document.getElementById('course-overview').style.display = 'block';
    } else if (tabName === 'announcements') {
        document.getElementById('course-announcements').style.display = 'block';
    } else if (tabName === 'publish') {
        document.getElementById('course-publish').style.display = 'block';
    }
}

// 載入學生列表（原有功能）
function loadStudents() {
    const course_id = document.getElementById('student_course').value;
    if (!course_id) return;
    
    fetch(`/api/course/${course_id}/students`)
        .then(res => res.json())
        .then(students => {
            const container = document.getElementById('student_list');
            if (!container) return;
            if (students.length === 0) {
                container.innerHTML = '<p style="color:#999;">尚無學生修課</p>';
                return;
            }
            let html = '<table style="width:100%; border-collapse: collapse; margin-top: 16px;"><thead><tr style="background: #e0f7fa;"><th style="padding: 12px; text-align: left;">學號</th><th style="padding: 12px; text-align: left;">姓名</th><th style="padding: 12px; text-align: left;">Email</th><th style="padding: 12px; text-align: left;">成績</th></tr></thead><tbody>';
            students.forEach(s => {
                html += `<tr><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(s.student_id)}</td><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(s.student_name)}</td><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(s.email)}</td><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${s.grade || '未評分'}</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        });
}

// 原有發布公告功能（保留）
function publishAnnouncement() {
    const course_id = document.getElementById('announce_course').value;
    const title = document.getElementById('announce_title').value;
    const content = document.getElementById('announce_content').value;
    const date = document.getElementById('announce_date').value;
    
    if (!course_id) {
        showToast('請選擇課程');
        return;
    }
    if (!content) {
        showToast('請輸入公告內容');
        return;
    }
    
    fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            course_id: course_id,
            information: title ? title + '\n\n' + content : content,
            due_date: date
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('公告發布成功！');
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast('發布失敗');
        }
    })
    .catch(err => {
        showToast('發布失敗：' + err);
    });
}

// ========== 通用功能 ==========

function doLogout() {
    window.location.href = '/logout';
}

let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 監聽 Enter 鍵
document.getElementById('login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('login-user').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});



// 儲存老師的課程列表（用於選擇課程）
let teacherCourses = [];

// 發起線上課程
function createLiveRoom() {
    showToast('正在建立線上課程房間...');
    
    fetch('/api/create_live_room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        if (data.need_course) {
            // 需要選擇課程
            teacherCourses = data.courses;
            showCourseSelectionDialog();
        } else if (data.success) {
            // 房間建立成功，自動開啟 Screego 畫面
            window.open(data.room_url, '_blank');
            showToast('房間已建立！公告已發布，學生可從公告區加入');
        } else {
            showToast('建立失敗：' + (data.error || '未知錯誤'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('建立失敗，請稍後再試');
    });
}

// 顯示課程選擇對話框
function showCourseSelectionDialog() {
    let courseOptions = '';
    teacherCourses.forEach(course => {
        courseOptions += `<option value="${course.course_id}">${course.course_name}</option>`;
    });
    
    const dialogHtml = `
        <div id="courseDialog" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; border-radius: 16px; padding: 24px; width: 350px;">
                <h3 style="margin-bottom: 16px;">選擇課程</h3>
                <p style="margin-bottom: 12px; color: #666;">請選擇要開直播的課程：</p>
                <select id="courseSelect" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
                    ${courseOptions}
                </select>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="closeDialog()" style="padding: 8px 16px; background: #ccc; border: none; border-radius: 6px; cursor: pointer;">取消</button>
                    <button onclick="confirmCreateRoom()" style="padding: 8px 16px; background: #00bcd4; color: white; border: none; border-radius: 6px; cursor: pointer;">確定開課</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHtml);
}

// 關閉對話框
function closeDialog() {
    const dialog = document.getElementById('courseDialog');
    if (dialog) dialog.remove();
}

// 確認建立房間
function confirmCreateRoom() {
    const courseSelect = document.getElementById('courseSelect');
    const course_id = courseSelect.value;
    
    closeDialog();
    showToast('正在建立房間並發布公告...');
    
    fetch('/api/create_live_room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ course_id: course_id })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.open(data.room_url, '_blank');
            showToast('房間已建立！公告已發布，學生可從公告區加入');
        } else {
            showToast('建立失敗：' + (data.error || '未知錯誤'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('建立失敗，請稍後再試');
    });
}