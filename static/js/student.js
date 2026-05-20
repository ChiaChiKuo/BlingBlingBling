// ========== 初始化 ==========
function initializeApp() {
    if (isLoggedIn) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'block';
        
        // 如果當前顯示的是課程頁面，載入課程
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
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const err = document.getElementById('login-error');

    if (u === 'B134020005' && p === 'password123') {
        err.style.display = 'none';
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'block';
        
        // 登入後如果當前是課程頁面，載入課程
        setTimeout(() => {
            const activePage = document.querySelector('.page.active');
            if (activePage && activePage.id === 'page-courses') {
                loadCourses();
            }
        }, 100);
    } else {
        err.style.display = 'block';
    }
}

// ========== 載入課程（呼叫後端 API）==========
async function loadCourses() {
    const container = document.getElementById('courses-container');
    const countElem = document.getElementById('course-count');
    
    if (!container) {
        console.log('找不到課程容器');
        return;
    }
    
    // 顯示載入中
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>載入課程中...</p>
        </div>
    `;
    
    try {
        // 呼叫後端 API
        const response = await fetch('/api/my_courses');
        
        if (!response.ok) {
            throw new Error('載入課程失敗');
        }
        
        const data = await response.json();
        const courses = data.courses || [];
        
        // 更新課程數量
        if (countElem) {
            countElem.textContent = `共 ${courses.length} 門課程`;
        }
        
        // 顯示課程
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
        if (countElem) countElem.textContent = '載入失敗';
    }
}

// ========== 顯示課程卡片 ==========
function displayCourses(courses) {
    const container = document.getElementById('courses-container');
    
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📚</span>
                <p>您目前沒有選修任何課程</p>
                <button class="browse-btn" onclick="goPage('home')">瀏覽課程</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // 課程顏色
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
                    <span>📅 ${course.semester || '進行中'}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ========== 頁面切換 ==========
const pages = ['home', 'courses', 'announcements', 'settings', 'course-detail'];

function goPage(name) {
    // 隱藏所有頁面
    pages.forEach(p => {
        const pg = document.getElementById('page-' + p);
        if (pg) pg.classList.remove('active');
    });
    
    // 顯示目標頁面
    const targetPage = document.getElementById('page-' + name);
    if (targetPage) targetPage.classList.add('active');
    
    // 更新側邊欄選中狀態（課程詳情頁不影響側邊欄）
    const navItems = ['home', 'courses', 'announcements', 'settings'];
    navItems.forEach(p => {
        const nav = document.getElementById('nav-' + p);
        if (nav) nav.classList.remove('active');
    });
    
    if (name !== 'course-detail') {
        const activeNav = document.getElementById('nav-' + name);
        if (activeNav) activeNav.classList.add('active');
    }
    
    // 如果切換到課程頁面，載入課程
    if (name === 'courses') {
        setTimeout(() => {
            loadCourses();
        }, 50);
    }
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

// ========== 防 XSS ==========
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== 監聽 Enter 鍵 ==========
document.getElementById('login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('login-user').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});

// ========== 課程詳情功能 ==========

// 當前查看的課程 ID
let currentCourseId = null;

// 查看課程詳情
async function viewCourseDetail(courseId) {
    currentCourseId = courseId;
    
    // 切換到課程詳情頁面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const detailPage = document.getElementById('page-course-detail');
    if (detailPage) detailPage.classList.add('active');
    
    // 顯示載入狀態
    document.getElementById('course-detail-title').textContent = '載入中...';
    document.getElementById('course-detail-info').textContent = '讀取課程資料中';
    
    try {
        // 獲取課程詳細資料
        const response = await fetch(`/api/course/${courseId}`);
        
        if (!response.ok) {
            throw new Error('載入課程失敗');
        }
        
        const data = await response.json();
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
    const modules = data.modules || [];
    
    // 課程基本資訊
    document.getElementById('course-detail-title').textContent = course.course_name;
    document.getElementById('course-detail-info').textContent = `課程代碼：${course.course_id}`;
    document.getElementById('course-description').textContent = course.description || '暫無課程簡介';
    document.getElementById('course-teachers').textContent = course.teachers || '未指定';
    document.getElementById('course-credits').textContent = course.credits || 3;
    document.getElementById('course-semester').textContent = course.semester || '114_2';
    document.getElementById('course-mode').textContent = course.is_online ? '線上課程' : '實體課程';
    
    // 顯示公告
    displayAnnouncements(announcements);
    
    // 顯示單元
    displayModules(modules);
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

// 顯示單元列表
function displayModules(modules) {
    const container = document.getElementById('modules-list');
    
    if (!modules || modules.length === 0) {
        container.innerHTML = '<p style="color: #999;">暫無課程單元</p>';
        return;
    }
    
    container.innerHTML = modules.map(m => `
        <div class="module-item">
            <div class="module-title">📖 ${escapeHtml(m.title || '未命名單元')}</div>
            <div class="module-desc">${escapeHtml(m.description || '暫無說明')}</div>
        </div>
    `).join('');
}

// 切換課程標籤頁
function switchCourseTab(tabName, event) {
    // 更新標籤樣式
    const tabs = document.querySelectorAll('.course-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 如果有 event 參數，標記當前點擊的標籤
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // 根據 tabName 找到對應的標籤
        tabs.forEach(tab => {
            if ((tabName === 'overview' && tab.textContent === '課程概述') ||
                (tabName === 'modules' && tab.textContent === '單元內容') ||
                (tabName === 'announcements' && tab.textContent === '公告')) {
                tab.classList.add('active');
            }
        });
    }
    
    // 切換內容
    document.getElementById('course-overview').style.display = 'none';
    document.getElementById('course-modules').style.display = 'none';
    document.getElementById('course-announcements').style.display = 'none';
    
    if (tabName === 'overview') {
        document.getElementById('course-overview').style.display = 'block';
    } else if (tabName === 'modules') {
        document.getElementById('course-modules').style.display = 'block';
    } else if (tabName === 'announcements') {
        document.getElementById('course-announcements').style.display = 'block';
    }
}
function toggleAllNotifications(masterToggle) {
    masterToggle.classList.toggle('on');

    const isOn = masterToggle.classList.contains('on');
    const toggles = document.querySelectorAll('.notification-toggle');

    toggles.forEach(toggle => {
        if (isOn) {
            toggle.classList.add('on');
        } else {
            toggle.classList.remove('on');
        }
    });
}