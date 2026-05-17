

  
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
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const err = document.getElementById('login-error');

    if (u === 'B134020005' && p === 'password123') {
      err.style.display = 'none';
      document.getElementById('login-page').style.display = 'none';
      document.getElementById('app-page').style.display = 'block';
    } else {
      err.style.display = 'block';
    }
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

  const pages = ['home', 'courses', 'announcements', 'settings'];

  function goPage(name) {
    pages.forEach(p => {
      const pg  = document.getElementById('page-' + p);
      const nav = document.getElementById('nav-' + p);
      if (pg)  pg.classList.toggle('active', p === name);
      if (nav) nav.classList.toggle('active', p === name);
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
