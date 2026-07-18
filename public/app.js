/**
 * REGIX GOD MODE — Web Dashboard Application
 */

const API_BASE = '/api';

// ─── API Client ───────────────────────────────────────────────────────
class API {
  constructor() {
    this.token = localStorage.getItem('regix_token');
  }
  
  setToken(token) {
    this.token = token;
    localStorage.setItem('regix_token', token);
  }
  
  clearToken() {
    this.token = null;
    localStorage.removeItem('regix_token');
  }
  
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    
    return response.json();
  }
  
  async login(username, password) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (data.success && data.accessToken) {
      this.setToken(data.accessToken);
    }
    
    return data;
  }
  
  async get(path) {
    return this.request(path);
  }
  
  async post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
  
  async put(path, body) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }
  
  async delete(path, body) {
    return this.request(path, {
      method: 'DELETE',
      body: JSON.stringify(body)
    });
  }
}

const api = new API();

// ─── Toast Notifications ───────────────────────────────────────────────
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, duration);
}

// ─── Authentication ───────────────────────────────────────────────────
async function checkAuth() {
  try {
    const data = await api.get('/me');
    if (data.user) {
      sessionStorage.setItem('regix_auth', 'true');
      return data.user;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
  return null;
}

// ─── Dashboard Navigation ───────────────────────────────────────────────
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .bnav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const page = item.dataset.page;
      if (page) {
        window.location.href = `/pages/${page}.html`;
      }
    });
  });
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api.post('/logout');
      api.clearToken();
      sessionStorage.removeItem('regix_auth');
      window.location.href = '/index.html';
    });
  }
  
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    });
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
  }
}

// ─── Initialize ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  
  if (user && window.location.pathname.includes('overview.html')) {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = user.username;
    if (userRole) userRole.textContent = user.role === 'owner' ? '👑 Owner' : '🛡️ Admin';
    if (userAvatar) userAvatar.textContent = user.avatar;
  }
  
  initNavigation();
});

// ─── Login Handler ───────────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const data = await api.login(username, password);
    
if (data.success) {
       sessionStorage.setItem('regix_auth', 'true');
       window.location.href = '/pages/overview.html';
     } else {
      showToast(data.error || 'Login failed', 'error');
    }
  });
}