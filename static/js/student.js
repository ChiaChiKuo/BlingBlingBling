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
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const err = document.getElementById('login-error');

    if (u === 'B134020005' && p === 'password123') {
        err.style.display = 'none';
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'block';
        
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
        err.style.display = 'block';
    }
}

// ========== 載入課程 ==========
async function loadCourses() {
    const container = document.getElementById('courses-container');
    const countElem = document.getElementById('course-count');
    
    if (!container) return;
    
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>載入課程中...</p></div>`;
    
    try {
        const response = await fetch('/api/my_courses');
        if (!response.ok) throw new Error('載入課程失敗');
        
        const data = await response.json();
        const courses = data.courses || [];
        
        if (countElem) countElem.textContent = `共 ${courses.length} 門課程`;
        displayCourses(courses);
    } catch (error) {
        console.error('載入錯誤：', error);
        container.innerHTML = `<div class="error-state"><span>⚠️</span><p>${error.message}</p><button onclick="loadCourses()">重新載入</button></div>`;
        if (countElem) countElem.textContent = '載入失敗';
    }
}

function displayCourses(courses) {
    const container = document.getElementById('courses-container');
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>📚</span><p>您目前沒有選修任何課程</p><button onclick="goPage('home')">瀏覽課程</button></div>`;
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
                <div class="course-stats"><span>📖 ${course.credits || 3} 學分</span><span>📅 ${course.semester || '進行中'}</span></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ========== 側邊欄公告頁面 - 載入所有課程的公告 ==========
async function loadAllAnnouncements() {
    const container = document.getElementById('announcements-list-general');
    const countElem = document.getElementById('announcement-count');
    
    if (!container) {
        console.log('找不到公告容器');
        return;
    }
    
    container.innerHTML = '<div class="loading-state">載入公告中...</div>';
    
    try {
        const response = await fetch('/api/all_announcements');
        
        if (!response.ok) {
            throw new Error('載入公告失敗');
        }
        
        const data = await response.json();
        let announcements = data.announcements || [];
        
        // 依照日期排序，最新的在前
        announcements.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
        
        if (countElem) {
            countElem.textContent = `共 ${announcements.length} 則公告`;
        }
        
        if (announcements.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">暫無公告</p>';
            return;
        }
        
        container.innerHTML = '';
        
        for (const n of announcements) {
            const title = n.information ? n.information.split('\n')[0] : '公告';
            let content = n.information ? n.information.split('\n\n').slice(1).join('\n\n') : '';
            
            // 檢查是否包含 Screego 直播連結
            const screegoMatch = content.match(/(https?:\/\/app\.screego\.net\/\?room=[a-zA-Z0-9]+)/);
            let displayContent = escapeHtml(content);
            if (screegoMatch) {
                displayContent = displayContent.replace(
                    screegoMatch[0],
                    `<a href="${screegoMatch[0]}" target="_blank" style="color: #00bcd4; text-decoration: underline;">🔗 點此加入線上課程</a>`
                );
            }
            
            container.innerHTML += `
                <div class="announce-item">
                    <div class="announce-dot"></div>
                    <div class="announce-content">
                        <div class="announce-course">${escapeHtml(n.course_name)}</div>
                        <div class="announce-title">${escapeHtml(title)}</div>
                        <div class="announce-desc">${displayContent}</div>
                        <div class="announce-date">${n.due_date || '日期未定'}</div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('載入公告錯誤:', error);
        container.innerHTML = `<div class="error-state">載入失敗：${error.message}</div>`;
        if (countElem) countElem.textContent = '載入失敗';
    }
}

// ========== 頁面切換 ==========
const pages = ['home', 'courses', 'announcements', 'settings', 'course-detail'];
let currentAnnouncementType = '';

function goPage(name) {
    pages.forEach(p => {
        const pg = document.getElementById('page-' + p);
        if (pg) pg.classList.remove('active');
    });
    
    const targetPage = document.getElementById('page-' + name);
    if (targetPage) targetPage.classList.add('active');
    
    const navItems = ['home', 'courses', 'announcements', 'settings'];
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
    
    if (name === 'announcements') {
        setTimeout(() => loadAllAnnouncements(), 50);
    }

    if (name === 'announcements') {
        setTimeout(() => {
            loadAnnouncements(currentAnnouncementType);
        }, 50);
    }
}

function toggleAnnouncementMenu() {
    const submenu = document.getElementById('announcement-submenu');
    const arrow = document.getElementById('announcement-arrow');

    if (submenu) submenu.classList.toggle('open');
    if (arrow) arrow.classList.toggle('open');

    goAnnouncementCategory('');
}

function goAnnouncementCategory(type) {
    currentAnnouncementType = type || '';
    goPage('announcements');
}

function updateAnnouncementSubnav(type) {
    const subItems = {
        '一般公告': document.getElementById('nav-announcements-general'),
        '作業通知': document.getElementById('nav-announcements-homework'),
        '考試通知': document.getElementById('nav-announcements-exam'),
        '課程異動通知': document.getElementById('nav-announcements-course-change'),
        '討論區': document.getElementById('nav-announcements-discussion'),
        '成績公告': document.getElementById('nav-announcements-grade')
    };

    Object.values(subItems).forEach(item => {
        if (item) item.classList.remove('active');
    });

    if (subItems[type]) {
        subItems[type].classList.add('active');
    }
}

async function loadAnnouncements(type = '') {
    const container = document.getElementById('announcement-list');
    const summary = document.getElementById('announcement-page-summary');

    if (!container) return;

    updateAnnouncementSubnav(type);
    container.innerHTML = '<p style="color: #999;">載入公告中...</p>';
    if (summary) {
        summary.textContent = type || '全部公告';
    }

    try {
        const query = type ? `?type=${encodeURIComponent(type)}` : '';
        const response = await fetch(`/api/announcements${query}`);

        if (!response.ok) {
            throw new Error('公告載入失敗');
        }

        const data = await response.json();
        renderAnnouncementList(data.announcements || [], type);
    } catch (error) {
        console.error('公告載入失敗:', error);
        container.innerHTML = '<p style="color: #999;">公告載入失敗，請稍後再試</p>';
        if (summary) summary.textContent = '';
    }
}

function parseAnnouncementDisplay(announcement) {
    const information = announcement.information || '';
    const parts = information.split(/\n\s*\n/);
    const title = (parts[0] || '').trim() || '無標題';
    const content = parts.slice(1).join('\n\n').trim();

    return { title, content };
}

function renderAnnouncementList(announcements, type = '') {
    const container = document.getElementById('announcement-list');
    const summary = document.getElementById('announcement-page-summary');

    if (!container) return;

    if (!announcements.length) {
        container.innerHTML = '<p style="color: #999;">暫無公告</p>';
        if (summary) summary.textContent = type ? `${type}：0 則` : '全部公告：0 則';
        return;
    }

    if (summary) {
        summary.textContent = type ? `${type}：${announcements.length} 則` : `全部公告：${announcements.length} 則`;
    }

    container.innerHTML = announcements.map(announcement => {
        const parsed = parseAnnouncementDisplay(announcement);
        const courseName = announcement.course_name || announcement.course_id || '未指定課程';

        return `
            <div class="announce-item">
                <div class="announce-dot"></div>
                <div class="announce-content">
                    <div class="announce-course">${escapeHtml(courseName)}</div>
                    <div class="announce-title">${escapeHtml(parsed.title)}</div>
                    <div class="announce-desc">${escapeHtml(parsed.content)}</div>
                    <div class="announce-date">${escapeHtml(announcement.due_date || '無截止日期')}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== 登出 ==========
function doLogout() {
    window.location.href = '/logout';
}

// ========== 顯示提示 ==========
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

// ========== 課程詳情功能 ==========
let currentCourseId = null;

async function viewCourseDetail(courseId) {
    currentCourseId = courseId;
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const detailPage = document.getElementById('page-course-detail');
    if (detailPage) detailPage.classList.add('active');
    
    document.getElementById('course-detail-title').textContent = '載入中...';
    document.getElementById('course-detail-info').textContent = '讀取課程資料中';
    
    try {
        const response = await fetch(`/api/course/${courseId}`);
        if (!response.ok) throw new Error('載入課程失敗');
        const data = await response.json();
        displayCourseDetail(data);
    } catch (error) {
        console.error('載入課程詳情錯誤:', error);
        document.getElementById('course-description').innerHTML = `<div class="error-state">載入失敗：${error.message}<button onclick="viewCourseDetail('${courseId}')">重新載入</button></div>`;
    }
}

function displayCourseDetail(data) {
    const course = data.course;
    const announcements = data.announcements || [];
    const modules = data.modules || [];
    
    document.getElementById('course-detail-title').textContent = course.course_name;
    document.getElementById('course-detail-info').textContent = `課程代碼：${course.course_id}`;
    document.getElementById('course-description').textContent = course.description || '暫無課程簡介';
    document.getElementById('course-teachers').textContent = course.teachers || '未指定';
    document.getElementById('course-credits').textContent = course.credits || 3;
    document.getElementById('course-semester').textContent = course.semester || '114_2';
    document.getElementById('course-mode').textContent = course.is_online ? '線上課程' : '實體課程';
    
    displayAnnouncementsByType(announcements);
    displayModules(modules);
}

function displayAnnouncementsByType(announcements) {
    const sortedAnnouncements = [...announcements].sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
    
    const typeMapping = {
        '公告': 'announcements-list-general',
        '一般公告': 'announcements-list-general',
        '線上課程': 'announcements-list-general',
        '作業通知': 'announcements-list-homework',
        '考試通知': 'announcements-list-exam',
        '課程異動通知': 'announcements-list-courseChange',
        '討論區': 'announcements-list-discussion',
        '成績公告': 'announcements-list-grade'
    };
    
    for (const containerId of Object.values(typeMapping)) {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '<p style="color: #999;">暫無此類型公告</p>';
    }
    
    if (!sortedAnnouncements || sortedAnnouncements.length === 0) return;
    
    for (const announcement of sortedAnnouncements) {
        let type = announcement.type || '公告';
        let containerId = typeMapping[type];
        
        if (!containerId && announcement.information && announcement.information.includes('screego')) {
            containerId = 'announcements-list-general';
        }
        if (!containerId) continue;
        
        const container = document.getElementById(containerId);
        if (!container) continue;
        
        if (container.innerHTML.includes('暫無此類型公告')) container.innerHTML = '';
        
        const info = announcement.information || '';
        const lines = info.split('\n\n');
        const title = lines[0] || '公告';
        let content = lines.slice(1).join('\n\n') || '';
        
        const screegoMatch = content.match(/(https?:\/\/app\.screego\.net\/\?room=[a-zA-Z0-9]+)/);
        let displayContent = escapeHtml(content);
        if (screegoMatch) {
            displayContent = displayContent.replace(screegoMatch[0], `<a href="${screegoMatch[0]}" target="_blank" style="color: #00bcd4; text-decoration: underline;">🔗 點此加入線上課程</a>`);
        }
        
        container.innerHTML += `
            <div class="announce-item">
                <div class="announce-dot"></div>
                <div class="announce-content">
                    <div class="announce-title">${escapeHtml(title)}</div>
                    <div class="announce-desc">${displayContent}</div>
                    <div class="announce-date">${announcement.due_date || '日期未定'}</div>
                </div>
            </div>
        `;
    }
}

function displayModules(modules) {
    const container = document.getElementById('modules-list');
    if (!container) return;
    
    if (!modules || modules.length === 0) {
        container.innerHTML = '<p style="color: #999;">暫無課程單元</p>';
        return;
    }
    
    container.innerHTML = modules.map(m => `<div class="module-item"><div class="module-title">📖 ${escapeHtml(m.title || '未命名單元')}</div><div class="module-desc">${escapeHtml(m.description || '暫無說明')}</div></div>`).join('');
}

function switchCourseTab(tabName, event) {
    const tabs = document.querySelectorAll('.course-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    
    const allContents = ['course-overview', 'course-modules', 'course-announcements', 'course-homework', 'course-exam', 'course-courseChange', 'course-discussion', 'course-grade'];
    allContents.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    
    switch(tabName) {
        case 'overview': document.getElementById('course-overview').style.display = 'block'; break;
        case 'modules': document.getElementById('course-modules').style.display = 'block'; break;
        case 'announcements': document.getElementById('course-announcements').style.display = 'block'; break;
        case 'homework': document.getElementById('course-homework').style.display = 'block'; break;
        case 'exam': document.getElementById('course-exam').style.display = 'block'; break;
        case 'courseChange': document.getElementById('course-courseChange').style.display = 'block'; break;
        case 'discussion': document.getElementById('course-discussion').style.display = 'block'; break;
        case 'grade': document.getElementById('course-grade').style.display = 'block'; break;
        default: document.getElementById('course-overview').style.display = 'block';
    }
}

// 通知設定
function toggleAllNotifications(el) {
    el.classList.toggle('on');
    const isOn = el.classList.contains('on');
    
    fetch('/api/notification_setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: '全部通知', notification_switch: isOn })
    }).catch(err => console.error('儲存失敗', err));
    
    document.querySelectorAll('.notification-toggle').forEach(toggle => {
        if (isOn) toggle.classList.add('on');
        else toggle.classList.remove('on');
        const label = toggle.closest('.settings-row').querySelector('.settings-label').childNodes[0].textContent.trim();
        fetch('/api/notification_setting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: label, notification_switch: isOn })
        }).catch(err => console.error('儲存失敗', err));
    });
}

function syncAllToggle() {
    const allToggles = document.querySelectorAll('.notification-toggle');
    const hasAnyOn = Array.from(allToggles).some(t => t.classList.contains('on'));
    const allToggleBtn = document.querySelector('[onclick="toggleAllNotifications(this)"]');
    if (allToggleBtn) {
        const wasOn = allToggleBtn.classList.contains('on');
        const shouldBeOn = hasAnyOn;
        if (wasOn !== shouldBeOn) {
            if (shouldBeOn) allToggleBtn.classList.add('on');
            else allToggleBtn.classList.remove('on');
            fetch('/api/notification_setting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: '全部通知', notification_switch: shouldBeOn })
            }).catch(err => console.error('同步更新全部通知資料庫失敗', err));
        }
    }
}

function initNotificationSettings() {
    fetch('/api/notification_setting')
        .then(res => res.json())
        .then(data => {
            data.settings.forEach(setting => {
                document.querySelectorAll('.notification-toggle').forEach(toggle => {
                    const label = toggle.closest('.settings-row').querySelector('.settings-label').childNodes[0].textContent.trim();
                    if (label === setting.type) {
                        if (setting.notification_switch) toggle.classList.add('on');
                        else toggle.classList.remove('on');
                    }
                });
            });
            syncAllToggle();
            document.querySelectorAll('.notification-toggle').forEach(toggle => {
                toggle.addEventListener('click', function() {
                    toggle.classList.toggle('on');
                    const label = toggle.closest('.settings-row').querySelector('.settings-label').childNodes[0].textContent.trim();
                    const isOn = toggle.classList.contains('on');
                    fetch('/api/notification_setting', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: label, notification_switch: isOn })
                    }).then(() => syncAllToggle()).catch(err => console.error('儲存失敗', err));
                });
            });
        }).catch(err => console.error('載入通知設定失敗', err));
}

const _origGoPage = goPage;
goPage = function(page) {
    _origGoPage(page);
    if (page === 'settings') {
        setTimeout(initNotificationSettings, 100);
    }
};