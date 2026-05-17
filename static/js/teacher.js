
  
  function initializeApp() {
    if (isLoggedIn) {
      // 如果已登入，隱藏登入頁面，顯示應用
      document.getElementById('login-page').style.display = 'none';
      document.getElementById('app-page').style.display = 'block';
    } else {
      // 如果未登入，顯示登入頁面
      document.getElementById('login-page').style.display = 'flex';
      document.getElementById('app-page').style.display = 'none';
    }
  }

  function doLogin() {
    const role = document.getElementById('login-role').value;
    const user_id = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const err = document.getElementById('login-error');
    
    // 建立表單資料
    const formData = new URLSearchParams();
    formData.append('role', role);
    formData.append('user_id', user_id);
    formData.append('password', password);
    
    // 發送到後端
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    })
    .then(response => response.text())
    .then(html => {
        // 檢查是否登入失敗（包含登入錯誤）
        if (html.includes('login-error') || html.includes('帳號或密碼錯誤')) {
            err.style.display = 'block';
        } else {
            // 登入成功，重新載入頁面以更新會話
            err.style.display = 'none';
            location.reload();
        }
    })
    .catch(err => {
        console.error('登入錯誤:', err);
        document.getElementById('login-error').style.display = 'block';
    });
}

  // allow Enter key on login
  document.getElementById('login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('login-user').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  function doLogout() {
    window.location.href = '/logout';
}

  const pages = ['home', 'courses', 'announcements', 'students', 'settings'];

  function goPage(name) {
    pages.forEach(p => {
      const pg  = document.getElementById('page-' + p);
      const nav = document.getElementById('nav-' + p);
      if (pg)  pg.classList.toggle('active', p === name);
      if (nav) nav.classList.toggle('active', p === name);
    });
  }
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
                html += `<tr><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${s.student_id}</td><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${s.student_name}</td><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${s.email}</td><td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${s.grade || '未評分'}</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        });
  }
  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
