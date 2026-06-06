// ========== 初始化 ==========
function initializeApp() {
    if (isLoggedIn) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'block';
        loadUnreadNotificationDots();
        
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
        loadUnreadNotificationDots();
        
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
let currentAnnouncementType = '';

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
            <div class="announce-item"
                 data-notification-id="${escapeHtml(announcement.notification_id)}"
                 data-course-id="${escapeHtml(announcement.course_id)}"
                 data-notification-type="${escapeHtml(announcement.type || '')}"
                 onclick="markNotificationRead('${escapeHtml(announcement.notification_id)}', '${escapeHtml(announcement.course_id)}', this)">
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

async function loadUnreadNotificationDots() {
    try {
        const response = await fetch('/api/notifications/unread');
        if (!response.ok) return;
        const unread = await response.json();
        applyUnreadNotificationDots(unread);
    } catch (error) {
        console.error('載入未讀通知失敗:', error);
    }
}

function applyUnreadNotificationDots(unread) {
    document.querySelectorAll('[data-notification-dot]').forEach(dot => {
        const category = dot.dataset.notificationDot;
        dot.classList.toggle('show', Boolean(unread[category]));
    });
}

async function markNotificationRead(notificationId, courseId, item) {
    if (!notificationId) return;

    try {
        const response = await fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_id: notificationId, course_id: courseId })
        });

        if (!response.ok) {
            throw new Error('標記已讀失敗');
        }

        const dot = item?.querySelector('.announce-dot');
        if (dot) dot.classList.add('read');
        await loadUnreadNotificationDots();
    } catch (error) {
        console.error('標記通知已讀失敗:', error);
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
    displayAnnouncementsByType(announcements);
    
    // 顯示單元
    displayModules(modules);
}

// 依照類型顯示公告（分類到不同的分頁）
function displayAnnouncementsByType(announcements) {
    // 定義各類型的容器 ID 對應
    const typeMapping = {
        '公告': 'announcements-list-general',
        '一般公告': 'announcements-list-general',
        '作業通知': 'announcements-list-homework',
        '考試通知': 'announcements-list-exam',
        '課程異動通知': 'announcements-list-courseChange',
        '討論區': 'announcements-list-discussion',
        '成績公告': 'announcements-list-grade'
    };
    
    // 初始化所有容器為「暫無公告」
    for (const containerId of Object.values(typeMapping)) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<p style="color: #999;">暫無此類型公告</p>';
        }
    }
    
    if (!announcements || announcements.length === 0) {
        return;
    }
    
    // 將公告分類
    for (const announcement of announcements) {
        let type = announcement.type || '公告';
        
        // 處理可能的類型名稱差異
        if (type === '公告') type = '公告';
        if (type === '一般公告') type = '公告';
        
        const containerId = typeMapping[type];
        
        if (containerId) {
            const container = document.getElementById(containerId);
            if (container) {
                // 如果當前容器顯示的是「暫無公告」，清空它
                if (container.innerHTML.includes('暫無此類型公告')) {
                    container.innerHTML = '';
                }
                
                // 新增公告卡片
                const parsed = parseAnnouncementDisplay(announcement);
                const announcementHtml = `
                    <div class="announce-item"
                         data-notification-id="${escapeHtml(announcement.notification_id)}"
                         data-course-id="${escapeHtml(announcement.course_id)}"
                         data-notification-type="${escapeHtml(announcement.type || '')}"
                         onclick="markNotificationRead('${escapeHtml(announcement.notification_id)}', '${escapeHtml(announcement.course_id)}', this)">
                        <div class="announce-dot"></div>
                        <div class="announce-content">
                            <div class="announce-title">${escapeHtml(parsed.title)}</div>
                            <div class="announce-desc">${escapeHtml(parsed.content)}</div>
                            <div class="announce-date">${announcement.due_date || '日期未定'}</div>
                        </div>
                    </div>
                `;
                container.innerHTML += announcementHtml;
            }
        }
    }
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
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // 隱藏所有內容區塊
    const allContents = [
        'course-overview',
        'course-modules',
        'course-announcements',
        'course-homework',
        'course-exam',
        'course-courseChange',
        'course-discussion',
        'course-grade'
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
        case 'modules':
            document.getElementById('course-modules').style.display = 'block';
            break;
        case 'announcements':
            document.getElementById('course-announcements').style.display = 'block';
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
        default:
            document.getElementById('course-overview').style.display = 'block';
    }
}



//通知按鈕狀態變化
// ── 通知設定 ──
const ALL_NOTIFICATION_TYPE = '全部通知';

function getNotificationToggles() {
  return Array.from(document.querySelectorAll('.notification-toggle'));
}

function getAllNotificationToggle() {
  return document.querySelector('.toggle-all-notifications');
}

function getNotificationLabel(toggle) {
  return toggle.closest('.settings-row')
               .querySelector('.settings-label')
               .childNodes[0].textContent.trim();
}

function setToggleState(toggle, isOn) {
  toggle.classList.toggle('on', Boolean(isOn));
}

function saveNotificationSetting(type, isOn) {
  return fetch('/api/notification_setting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, notification_switch: Boolean(isOn) })
  });
}

function toggleAllNotifications(el) {
  const isOn = !el.classList.contains('on');
  setToggleState(el, isOn);

  const childToggles = getNotificationToggles();
  childToggles.forEach(toggle => setToggleState(toggle, isOn));

  const requests = [
    saveNotificationSetting(ALL_NOTIFICATION_TYPE, isOn),
    ...childToggles.map(toggle => saveNotificationSetting(getNotificationLabel(toggle), isOn))
  ];

  Promise.all(requests)
    .then(() => loadUnreadNotificationDots())
    .catch(err => console.error('儲存失敗', err));
}


function syncAllToggle(options = {}) {
  const childToggles = getNotificationToggles();
  const allToggle = getAllNotificationToggle();

  if (!allToggle || childToggles.length === 0) return Promise.resolve(false);

  const shouldBeOn = childToggles.every(toggle => toggle.classList.contains('on'));
  const wasOn = allToggle.classList.contains('on');

  setToggleState(allToggle, shouldBeOn);

  if (options.persist && wasOn !== shouldBeOn) {
    return saveNotificationSetting(ALL_NOTIFICATION_TYPE, shouldBeOn)
      .then(() => true);
  }

  return Promise.resolve(wasOn !== shouldBeOn);
}


// 設定頁面顯示時載入通知設定
function initNotificationSettings() {
  fetch('/api/notification_setting')
    .then(res => res.json())
    .then(data => {
      data.settings.forEach(setting => {
        getNotificationToggles().forEach(toggle => {
          const label = getNotificationLabel(toggle);
          if (label === setting.type) {
            setToggleState(toggle, setting.notification_switch);
          }
        });
      });


      syncAllToggle();


      getNotificationToggles().forEach(toggle => {
        if (toggle.dataset.notificationBound === 'true') return;
        toggle.dataset.notificationBound = 'true';
        toggle.addEventListener('click', function () {
          const isOn = !toggle.classList.contains('on');
          setToggleState(toggle, isOn);

          saveNotificationSetting(getNotificationLabel(toggle), isOn)
            .then(() => {
              return syncAllToggle({ persist: true });
            })
            .then(() => {
              return loadUnreadNotificationDots();
            })
            .catch(err => console.error('儲存失敗', err));
        });
      });
    })
    .catch(err => console.error('載入通知設定失敗', err));
}


// 在原本的 goPage 裡加入設定頁初始化，不覆蓋整個函式
const _origGoPage = goPage;
goPage = function(page) {
  _origGoPage(page);
  if (page === 'settings') {
    setTimeout(initNotificationSettings, 100);
  }
};

