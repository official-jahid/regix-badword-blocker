/**
 * 🔥 REGIX GOD MODE v3.0 — Dashboard Frontend App
 * ================================================
 * Client-side JavaScript for the dashboard
 */

(function () {
  "use strict";

  const API = {
    login: "/api/login",
    logout: "/api/logout",
    refresh: "/api/refresh",
    me: "/api/me",
    users: "/api/users",
    botData: "/api/bot/data",
    botConfig: "/api/bot/config",
    botWords: "/api/bot/words",
    botWordsBad: "/api/bot/words/bad",
    botWordsWhitelist: "/api/bot/words/whitelist",
    botPermissions: "/api/bot/permissions",
    botViolations: "/api/bot/violations",
    botStatus: "/api/bot/status",
    botCommand: "/api/bot/commands",
    logs: "/api/logs",
    logsExport: "/api/logs/export",
  };

  let currentUser = null;
  let botData = null;
  let accessToken = null;
  let refreshToken = null;

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  function showToast(msg, type = "info", duration = 3500) {
    const container = $("toastContainer");
    if (!container) return;
    const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ️"}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add("toast-in"));
    setTimeout(() => {
      t.classList.add("toast-out");
      setTimeout(() => t.remove(), 400);
    }, duration);
  }
  window.showToast = showToast;

  async function api(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    try {
      const res = await fetch(path, { headers, credentials: "same-origin", ...opts });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    } catch (e) {
      if (e.message !== "Failed to fetch") showToast(e.message, "error");
      throw e;
    }
  }

  function updateClock() {
    const now = new Date();
    const t = now.toLocaleTimeString("en-US", { hour12: false });
    const hTime = $("headerTime");
    const hTimeMobile = $("headerTimeMobile");
    if (hTime) hTime.innerHTML = `🕐 ${t}`;
    if (hTimeMobile) hTimeMobile.innerHTML = `🕐 ${t.slice(0, 5)}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  function openSidebar() {
    $("sidebar")?.classList.add("open");
    $("sidebarOverlay")?.classList.add("open");
  }
  function closeSidebar() {
    $("sidebar")?.classList.remove("open");
    $("sidebarOverlay")?.classList.remove("open");
  }

  $("hamburgerBtn")?.addEventListener("click", openSidebar);
  $("sidebarClose")?.addEventListener("click", closeSidebar);
  $("sidebarOverlay")?.addEventListener("click", closeSidebar);

  function navigate(page) {
    if (!currentUser && !accessToken) {
      window.location.href = "index.html";
      return;
    }
    window.location.href = page + ".html";
    closeSidebar();
  }

  $$(".nav-item[data-page]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.page));
  });
  $$(".bnav-item[data-page]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.page.replace("pages/", "")));
  });

  async function handleLogin(e) {
    e.preventDefault();
    const username = $("loginUser")?.value.trim();
    const password = $("loginPass")?.value.trim();
    try {
      const res = await api(API.login, { method: "POST", body: JSON.stringify({ username, password }) });
      currentUser = res.user;
      accessToken = res.accessToken;
      sessionStorage.setItem("regix_access", accessToken);
      sessionStorage.setItem("regix_auth", "true");
      showToast(`Welcome, ${currentUser.username}!`, "success");
      window.location.href = "pages/overview.html";
    } catch {
      $("loginError")?.classList.add("visible");
    }
  }
  $("loginForm")?.addEventListener("submit", handleLogin);

  async function checkSession() {
    accessToken = sessionStorage.getItem("regix_access");
    if (accessToken) {
      try {
        const res = await api(API.me);
        currentUser = res.user;
      } catch {
        sessionStorage.removeItem("regix_auth");
        sessionStorage.removeItem("regix_access");
      }
    }
  }

  async function loadAll() {
    try {
      const [data, status] = await Promise.all([api(API.botData), api(API.botStatus)]);
      botData = data;
      renderStats(data);
      renderStatus(status);
    } catch {}
  }

  function renderStats(data) {
    if (!data) return;
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set("statBadWords", data.words?.badWords?.length || 0);
    set("statViolations", Object.values(data.violations || {}).reduce((a, b) => a + b, 0));
    set("statFlaggedUsers", Object.keys(data.violations || {}).length);
    set("statIgnoredChannels", data.permissions?.ignoredChannels?.length || 0);
  }

  function renderStatus(status) {
    $("botStatus") && ( $("botStatus").textContent = status?.online !== false ? "🟢 Online" : "🔴 Offline");
    $("botUptime") && ( $("botUptime").textContent = status?.uptime ? `${Math.floor(status.uptime)}s` : "0s");
    $("botVersion") && ( $("botVersion").textContent = status?.version || "3.0.0");
  }

  $("logoutBtn")?.addEventListener("click", async () => {
    try { await api(API.logout, { method: "POST" }); } catch {}
    sessionStorage.clear();
    window.location.href = "index.html";
  });

  function escHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  window.closeModal = closeModal;
  window.closeSidebar = closeSidebar;
  window.navigate = navigate;

  async function init() {
    await checkSession();
    const isProtectedPage = !window.location.pathname.includes("index.html");
    if (!accessToken && isProtectedPage) {
      window.location.href = "index.html";
      return;
    }
    if (currentUser || accessToken) {
      loadAll();
    }
  }

  init();
})();