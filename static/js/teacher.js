// ========== 初始化 ==========
function initializeApp() {
    if (isLoggedIn) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'block';

        goPage('courses'); // ⭐⭐⭐ 加這行

        setTimeout(() => {
            const activePage = document.querySelector('.page.active');
            if (activePage && activePage.id === 'page-courses') {
                loadCourses();
            }
            if (activePage && activePage.id === 'page-announcements') {
                loadAllAnnouncements();
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
        container.innerHTML = `<div class="empty-state"><span>📚</span><p>您目前沒有教授任何課程</p></div>`;
        return;
    }

    container.innerHTML = '';
    const colors = ['#e0f7fa', '#fff8e1', '#f3e5f5', '#e8f5e9', '#fce4ec', '#ede7f6'];
    courses.forEach((course, index) => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.onclick = () => viewCourseDetail(course.course_id);
        card.innerHTML = `
            <div class="course-banner" style="background:${colors[index % colors.length]}; padding: 20px; text-align: center; font-size: 40px;">📚</div>
            <div class="course-body">
                <div class="course-name">${escapeHtml(course.course_name)}</div>
                <div class="course-dept">課程代碼：${escapeHtml(course.course_id)}</div>
                <div class="course-stats"><span>📖 ${course.credits || 3} 學分</span><span>👥 ${course.student_count || 0} 人</span></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ========== 頁面切換 ==========
const pages = ['courses', 'announcements', 'grade-management', 'homework-management', 'students', 'settings', 'course-detail'];

function goPage(name) {
    pages.forEach(p => {
        const pg = document.getElementById('page-' + p);
        if (pg) pg.classList.remove('active');
    });
    
    const targetPage = document.getElementById('page-' + name);
    if (targetPage) targetPage.classList.add('active');
    
    const navItems = ['courses', 'announcements', 'grade-management', 'homework-management', 'students', 'settings'];
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

function goTeacherAnnouncementType(pageName, type, title) {
    goPage(pageName);
    loadTeacherAnnouncementType(pageName, type, title);
}

async function loadTeacherAnnouncementType(pageName, type, title) {
    const list = document.getElementById(`${pageName}-list`);
    const summary = document.getElementById(`${pageName}-summary`);

    if (!list) return;

    list.innerHTML = '<p style="color: #999;">載入公告中...</p>';
    if (summary) summary.textContent = `載入${type}中...`;

    try {
        const response = await fetch(`/api/teacher/announcements?type=${encodeURIComponent(type)}`);

        if (!response.ok) {
            throw new Error('公告載入失敗');
        }

        const data = await response.json();
        renderTeacherAnnouncementList(list, summary, data.announcements || [], type, title);
    } catch (error) {
        console.error('公告載入失敗:', error);
        list.innerHTML = '<p style="color: #999;">公告載入失敗</p>';
        if (summary) summary.textContent = '公告載入失敗';
    }
}

function renderTeacherAnnouncementList(list, summary, announcements, type, title) {
    if (!announcements.length) {
        list.innerHTML = '<p style="color: #999;">暫無公告</p>';
        if (summary) summary.textContent = `已發布0則${type}`;
        return;
    }

    if (summary) summary.textContent = `已發布${announcements.length}則${type}`;

    list.innerHTML = announcements.map(a => {
        const parsed = parseAnnouncementDisplay(a);
        return `
            <div class="announce-item"
                data-notification-id="${a.notification_id}"
                data-course-id="${a.course_id}">
                <div class="announce-dot"></div>
                <div class="announce-content">
                    <div class="announce-course">課程名稱：${escapeHtml(a.course_name || a.course_id || '未指定課程')}</div>
                    <div class="announce-title">公告標題：${escapeHtml(parsed.title)}</div>
                    <div class="announce-desc">公告內容：${escapeHtml(parsed.content)}</div>
                    <div class="announce-date">日期：${escapeHtml(a.due_date || '日期未定')}</div>
                </div>
            </div>
        `;
    }).join('');
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
    if (course && course.course_id) {
        currentCourseId = course.course_id;
        console.log('已設定 currentCourseId =', currentCourseId);
    
    }
    
    document.getElementById('course-detail-title').textContent = course.course_name;
    document.getElementById('course-detail-info').textContent = `課程代碼：${course.course_id}`;
    document.getElementById('course-description').textContent = course.description || '暫無課程簡介';
    document.getElementById('course-teachers').textContent = course.teachers || '未指定';
    document.getElementById('course-credits').textContent = course.credits || 3;
    document.getElementById('course-semester').textContent = course.semester || '114_2';
    document.getElementById('course-mode').textContent = course.is_online ? '線上課程' : '實體課程';

    // 根據資料庫的 is_online 欄位判斷是否可直播（主要判斷方式）
    // 如果 is_online 為 null/undefined，則回退到課程名稱檢查
    let canLive = false;
    
    if (course.is_online !== null && course.is_online !== undefined) {
        // 如果 is_online 有值，則直接使用
        canLive = !!course.is_online;
    } else {
        // 備用方案：檢查課程名稱（以防 is_online 未被正確傳送）
        const onlineCourseNames = ['資料庫管理', '管理資訊系統', '資料視覺化'];
        canLive = onlineCourseNames.some(name => course.course_name.includes(name));
    }
    
    // 顯示或隱藏課程名稱旁邊的按鈕
    const liveBtn = document.getElementById('online-live-btn');
    if (liveBtn) {
        liveBtn.style.display = canLive ? 'inline-flex' : 'none';
    }

    loadCategorizedAnnouncements(course.course_id);
}

// 載入分類公告（教師端）
async function loadCategorizedAnnouncements(courseId) {
    try {
        const response = await fetch(`/api/course/${courseId}`);
        const data = await response.json();
        const announcements = (data.announcements || []).slice().sort((a,b) => {
            const da = a.due_date ? new Date(a.due_date).getTime() : 0;
            const db = b.due_date ? new Date(b.due_date).getTime() : 0;
            if (db !== da) return db - da;
            if (a.notification_id && b.notification_id) return b.notification_id.localeCompare(a.notification_id);
            return 0;
        });
        
        const categories = {
            general: [],
            homework: [],
            exam: [],
            courseChange: [],
            discussion: [],
            grade: []
        };
        
        announcements.forEach(a => {
            const type = a.type || '公告';
            if (type === '公告' || type === '一般公告') {
                categories.general.push(a);
            } else if (type === '作業通知') {
                categories.homework.push(a);
            } else if (type === '考試通知') {
                categories.exam.push(a);
            } else if (type === '課程異動通知') {
                categories.courseChange.push(a);
            } else if (type === '討論區') {
                categories.discussion.push(a);
            } else if (type === '成績公告') {
                categories.grade.push(a);
            }
        });
        
        for (const [cat, list] of Object.entries(categories)) {
            const container = document.getElementById(`course-announcements-list-${cat}`);
            if (!container) continue;
            
            if (list.length === 0) {
                container.innerHTML = '<p style="color: #999;">暫無公告</p>';
            }else{
            container.innerHTML = list.map(a => {
                const parsed = parseAnnouncementDisplay(a);
                return `
                    <div class="announce-item" 
                        data-notification-id="${a.notification_id}" 
                        data-course-id="${courseId}">
                        <div class="announce-dot"></div>
                        <div class="announce-content">
                            <div class="announce-title">${escapeHtml(parsed.title)}</div>
                            <div class="announce-desc">${escapeHtml(parsed.content)}</div>
                            <div class="announce-date">${a.due_date || '日期未定'}</div>
                            <div class="announce-actions">
                                <button class="btn-edit-announcement">✏️ 編輯</button>
                                <button class="btn-delete-announcement">🗑️ 刪除</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            }
        }
    } catch (error) {
        console.error('載入公告失敗:', error);
    }
}

function splitAnnouncementInfo(info) {
    return parseAnnouncementDisplay({ information: info });
}

function parseAnnouncementDisplay(announcement) {
    const information = announcement.information || '';
    if (!information) {
        return {
            title: '公告',
            content: ''
        };
    }

    const parts = information.split(/\n\s*\n/);

    return {
        title: (parts[0] || '').trim() || '公告',
        content: parts.slice(1).join('\n\n').trim()
    };
}


// 發布課程公告
async function publishCourseAnnouncement() {
    if (!currentCourseId) {
        showToast('請從「我的課程」點擊課程後再發布');
        return;
    }
    
    const title = document.getElementById('publish-title').value;
    const content = document.getElementById('publish-content').value;
    const date = document.getElementById('publish-date').value;
    const type = document.getElementById('publish-type')?.value || '公告';
    
    if (!content) {
        showToast('請填寫公告內容');
        return;
    }
    
    const information = title ? `${title}\n\n${content}` : content;
    
    try {
        const response = await fetch('/api/announcement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                course_id: currentCourseId,
                type: type,
                information: information,
                due_date: date || new Date().toISOString().split('T')[0]
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('公告發布成功！');
            document.getElementById('publish-title').value = '';
            document.getElementById('publish-content').value = '';
            document.getElementById('publish-date').value = '';
            await loadCategorizedAnnouncements(currentCourseId);
        } else {
            showToast('發布失敗');
        }
    } catch (error) {
        console.error(error);
        showToast('發布失敗');
    }
}

// 新增：刷新公告列表
async function refreshAnnouncements() {
    console.log('refreshAnnouncements 被呼叫了');
    if (!currentCourseId) return;
    
    try {
        const response = await fetch(`/api/course/${currentCourseId}`);
        if (response.ok) {
            await loadCategorizedAnnouncements(currentCourseId);
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

    // 隱藏所有內容區塊
    const allContents = [
        'course-overview',
        'course-general',
        'course-homework',
        'course-exam',
        'course-courseChange',
        'course-discussion',
        'course-grade',
        'course-publish'
    ];
    
    allContents.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // 根據 tabName 顯示對應區塊
    switch(tabName) {
        case 'overview':
            document.getElementById('course-overview').style.display = 'block';
            break;
        case 'general':
            document.getElementById('course-general').style.display = 'block';
            break;
        case 'homework':
            document.getElementById('course-homework').style.display = 'block';
            break;
        case 'exam':
            document.getElementById('course-exam').style.display = 'block';
            break;
        case 'courseChange':
            document.getElementById('course-courseChange').style.display = 'block';
            break;
        case 'discussion':
            document.getElementById('course-discussion').style.display = 'block';
            break;
        case 'grade':
            document.getElementById('course-grade').style.display = 'block';
            break;
        case 'publish':
            document.getElementById('course-publish').style.display = 'block';
            break;
        default:
            document.getElementById('course-overview').style.display = 'block';
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
     const type = document.getElementById('announce_type').value;
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
    
        let fullContent = content;
    if (title) {
        fullContent = title + '\n\n' + content;
    }
    fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            course_id: course_id,
            type: type,
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

// ========== 更新個人資料 ==========
async function updateProfile() {
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');

    if (!nameInput || !emailInput) {
        return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !email) {
        showToast('Name and email are required.');
        return;
    }

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Save failed.');
        }

        updateProfileDisplay(data.name || name);
        showToast('Changes saved.');
    } catch (error) {
        showToast(error.message || 'Save failed.');
    }
}

function updateProfileDisplay(name) {
    const avatarName = document.querySelector('.avatar-name');
    if (avatarName) {
        avatarName.textContent = `${name} ▾`;
    }

    const profileName = document.querySelector('.profile-name');
    if (profileName) {
        profileName.textContent = name;
    }

    const avatarCircle = document.querySelector('.avatar-circle');
    if (avatarCircle) {
        avatarCircle.textContent = name ? name[0] : 'U';
    }
}

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
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('btn-edit-announcement')) {
        const item = e.target.closest('.announce-item');
        enterEditMode(item);
    }

    if (e.target.classList.contains('btn-delete-announcement')) {
        const item = e.target.closest('.announce-item');
        deleteAnnouncement(item);
    }

    if (e.target.classList.contains('btn-save-announcement')) {
        const item = e.target.closest('.announce-item');
        saveAnnouncement(item);
    }

    if (e.target.classList.contains('btn-cancel-announcement')) {
        const item = e.target.closest('.announce-item');
        cancelEditMode(item);
    }
});

function enterEditMode(item) {
    const titleElem = item.querySelector('.announce-title');
    const descElem = item.querySelector('.announce-desc');
    const dateElem = item.querySelector('.announce-date');
    const actions = item.querySelector('.announce-actions');

    const oldTitle = titleElem.textContent.trim();
    const oldDesc = descElem ? descElem.textContent.trim() : '';
    const oldDate = dateElem.textContent.trim();

    item.dataset.oldTitle = oldTitle;
    item.dataset.oldDesc = oldDesc;
    item.dataset.oldDate = oldDate;

    titleElem.innerHTML = `
        <input type="text"
               class="edit-announcement-title"
               value="${oldTitle}">
    `;

    if (descElem) {
        descElem.innerHTML = `
            <textarea class="edit-announcement-desc">${oldDesc}</textarea>
        `;
        descElem.style.display = 'block';
    }

    dateElem.innerHTML = `
        <input type="date"
               class="edit-announcement-date"
               value="${oldDate !== '日期未定' ? oldDate : ''}">
    `;

    actions.innerHTML = `
        <button class="btn-save-announcement">💾 儲存</button>
        <button class="btn-cancel-announcement">取消</button>
    `;
}

async function saveAnnouncement(item) {
    const notificationId = item.dataset.notificationId;
    const courseId = item.dataset.courseId;

    const newTitle = item.querySelector('.edit-announcement-title').value.trim();
    const newDesc = item.querySelector('.edit-announcement-desc')?.value.trim() || '';
    const newDate = item.querySelector('.edit-announcement-date').value;

    if (!newTitle) {
        showToast('公告標題不能空白');
        return;
    }

    const newInformation = newDesc
        ? `${newTitle}\n\n${newDesc}`
        : newTitle;

    const response = await fetch(`/api/announcement/${notificationId}/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            information: newInformation,
            due_date: newDate
        })
    });

    const result = await response.json();

    if (result.success) {
        const titleElem = item.querySelector('.announce-title');
        const descElem = item.querySelector('.announce-desc');

        titleElem.textContent = newTitle;

        if (descElem) {
            descElem.textContent = newDesc;
            descElem.style.display = newDesc ? 'block' : 'none';
        }

        item.querySelector('.announce-date').textContent = newDate || '日期未定';

        item.querySelector('.announce-actions').innerHTML = `
            <button class="btn-edit-announcement">✏️ 編輯</button>
            <button class="btn-delete-announcement">🗑️ 刪除</button>
        `;

        showToast('公告已更新！');
    } else {
        showToast('更新失敗');
    }
}

function cancelEditMode(item) {
    const titleElem = item.querySelector('.announce-title');
    const descElem = item.querySelector('.announce-desc');

    titleElem.textContent = item.dataset.oldTitle;

    if (descElem) {
        descElem.textContent = item.dataset.oldDesc;
        descElem.style.display = 'block';
    }

    item.querySelector('.announce-date').textContent = item.dataset.oldDate;

    item.querySelector('.announce-actions').innerHTML = `
        <button class="btn-edit-announcement">✏️ 編輯</button>
        <button class="btn-delete-announcement">🗑️ 刪除</button>
    `;
}

async function deleteAnnouncement(item) {
    const confirmed = confirm('確定要刪除這則公告嗎？');
    if (!confirmed) return;

    const notificationId = item.dataset.notificationId;
    const courseId = item.dataset.courseId;

    const response = await fetch(`/api/announcement/${notificationId}/${courseId}`, {
        method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
        item.remove();
        showToast('公告已刪除！');
    } else {
        showToast('刪除失敗');
    }

}

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



// 從課程詳情頁發起線上課程（不需要選擇課程，直接用 currentCourseId）
function createLiveRoomFromCourse() {
    if (!currentCourseId) {
        showToast('無法取得課程資訊');
        return;
    }
    
    showToast('正在建立線上課程房間...');
    
    fetch('/api/create_live_room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ course_id: currentCourseId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.open(data.room_url, '_blank');
            showToast('房間已建立！公告已發布，學生可從公告區加入');
            // 刷新公告列表，讓學生立即看到
            setTimeout(() => refreshAnnouncements(), 1000);
        } else {
            showToast('建立失敗：' + (data.error || '未知錯誤'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('建立失敗，請稍後再試');
    });
}
