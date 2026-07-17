/**
 * 🔥 REGIX GOD MODE v3.0 — Full-Stack Dashboard App
 * ===================================================
 * Complete SPA with:
 * - JWT + Session authentication
 * - Sidebar + Bottom Nav navigation
 * - All bot features via REST API
 * - Activity logs with filtering & export
 * - User management (owner only)
 * - Web-controlled bot commands
 * - KeyAuth-style smooth hover animations
 * - Real-time clock & data refresh
 */

(function () {
  "use strict";

  // ─── API Configuration ─────────────────────────────────────────
  const API = {
    login: "/api/login",
    logout: "/api/logout",
    refresh: "/api/refresh",
    me: "/api/me",
    mePassword: "/api/me/password",
    users: "/api/users",
    botData: "/api/bot/data",
    botConfig: "/api/bot/config",
    botWords: "/api/bot/words",
    botWordsBad: "/api/bot/words/bad",
    botWordsWhitelist: "/api/bot/words/whitelist",
    botPermissions: "/api/bot/permissions",
    botPermissionsIgnore: "/api/bot/permissions/ignore-channel",
    botViolations: "/api/bot/violations",
    botStatus: "/api/bot/status",
    botCommand: "/api/bot/commands",
    logs: "/api/logs",
    logsStats: "/api/logs/stats",
    logsExport: "/api/logs/export",
    health: "/api/health",
  };

  // ─── State ─────────────────────────────────────────────────────
  let currentUser = null;
  let botData = null;
  let accessToken = null;
  let refreshToken = null;

  // ─── DOM Shortcuts ─────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── Toast System ──────────────────────────────────────────────
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

  // ─── API Helper ────────────────────────────────────────────────
  async function api(path, opts = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    try {
      const res = await fetch(path, {
        headers,
        credentials: "same-origin",
        ...opts,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 && refreshToken) {
          const refreshed = await tryRefresh();
          if (refreshed) {
            headers["Authorization"] = `Bearer ${accessToken}`;
            const retry = await fetch(path, {
              headers,
              credentials: "same-origin",
              ...opts,
            });
            const retryData = await retry.json();
            if (!retry.ok) throw new Error(retryData.error || "Request failed");
            return retryData;
          }
        }
        throw new Error(data.error || "Request failed");
      }
      return data;
    } catch (e) {
      if (e.message !== "Failed to fetch") {
        showToast(e.message, "error");
      }
      throw e;
    }
  }

  async function tryRefresh() {
    if (!refreshToken) return false;
    try {
      const res = await fetch(API.refresh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        credentials: "same-origin",
      });
      if (!res.ok) return false;
      const data = await res.json();
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      sessionStorage.setItem("regix_access", accessToken);
      sessionStorage.setItem("regix_refresh", refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Clock ─────────────────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const t = now.toLocaleTimeString("en-US", { hour12: false });
    const d = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const hTime = $("headerTime");
    const hTimeMobile = $("headerTimeMobile");
    if (hTime) hTime.innerHTML = `🕐 ${t} &nbsp;📅 ${d}`;
    if (hTimeMobile) hTimeMobile.innerHTML = `🕐 ${t.slice(0, 5)}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ─── Sidebar Toggle ────────────────────────────────────────────
  function openSidebar() {
    const sidebar = $("sidebar");
    const overlay = $("sidebarOverlay");
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    const sidebar = $("sidebar");
    const overlay = $("sidebarOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  const hamburger = $("hamburgerBtn");
  const sidebarClose = $("sidebarClose");
  const sidebarOverlay = $("sidebarOverlay");
  hamburger?.addEventListener("click", openSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  sidebarOverlay?.addEventListener("click", closeSidebar);

  // Close sidebar on window resize to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeSidebar();
  });

  // ─── Navigation ────────────────────────────────────────────────
  function navigate(page) {
    if (!currentUser && !accessToken) {
      window.location.href = "../index.html";
      return;
    }
    const pageMap = {
      overview: "overview.html",
      words: "words.html",
      violations: "violations.html",
      commands: "commands.html",
      logs: "logs.html",
      users: "users.html",
      settings: "settings.html",
    };
    if (pageMap[page]) {
      window.location.href = pageMap[page];
    }
    closeSidebar();
  }

  $$(".nav-item[data-page]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.page));
  });
  $$(".bnav-item[data-page]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.page));
  });

  // ─── Tab Handling ──────────────────────────────────────────────
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const tabGroup = this.closest(".tabs");
      if (tabGroup) {
        tabGroup
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
      }
      this.classList.add("active");
      const tabId = this.dataset.tab;
      const tabContainer = this.closest(".page-content") || document;
      tabContainer
        .querySelectorAll(".tab-content")
        .forEach((tc) => tc.classList.remove("active"));
      const target = document.getElementById(`tab-${tabId}`);
      if (target) target.classList.add("active");
    });
  });

  // ─── Login ─────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    const loginError = $("loginError");
    const loginUser = $("loginUser");
    const loginPass = $("loginPass");
    if (loginError) loginError.classList.remove("visible");

    const username = loginUser?.value.trim();
    const password = loginPass?.value.trim();
    if (!username || !password) {
      if (loginError) {
        loginError.textContent = "❌ Please enter both fields 🚨";
        loginError.classList.add("visible");
      }
      return;
    }

    try {
      const res = await api(API.login, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      currentUser = res.user;
      accessToken = res.accessToken;
      refreshToken = res.refreshToken;
      sessionStorage.setItem("regix_access", accessToken);
      sessionStorage.setItem("regix_refresh", refreshToken);
      sessionStorage.setItem("regix_auth", "true");
      showToast(`✅ Welcome back, ${currentUser.username}! 👑`, "success");
      enterDashboard();
    } catch {
      if (loginError) {
        loginError.textContent = "❌ Invalid username or password 🔐";
        loginError.classList.add("visible");
      }
      if (loginPass) {
        loginPass.value = "";
        loginPass.focus();
      }
    }
  }

  $("loginForm")?.addEventListener("submit", handleLogin);

  // ─── Enter Dashboard (after login) ──────────────────────────────────
  function enterDashboard() {
    window.location.href = "pages/overview.html";
  }

  // ─── Logout ────────────────────────────────────────────────────
  async function handleLogout() {
    try {
      await api(API.logout, { method: "POST" });
    } catch {
      /* ignore */
    }
    sessionStorage.removeItem("regix_auth");
    sessionStorage.removeItem("regix_access");
    sessionStorage.removeItem("regix_refresh");
    accessToken = null;
    refreshToken = null;
    currentUser = null;
    showToast("🚪 Logged out successfully! 👋", "info");
    window.location.href = "index.html";
  }

  // ─── Check Session ─────────────────────────────────────────────
  async function checkSession() {
    accessToken = sessionStorage.getItem("regix_access");
    refreshToken = sessionStorage.getItem("regix_refresh");
    const isProtectedPage = !window.location.pathname.includes("index.html");

    // Only validate if we have access token OR if on protected page
    if (isProtectedPage && !accessToken) return;

    // Try to validate session via API
    try {
      const res = await api(API.me);
      currentUser = res.user;
    } catch {
      sessionStorage.removeItem("regix_auth");
      sessionStorage.removeItem("regix_access");
      sessionStorage.removeItem("regix_refresh");
      accessToken = null;
      refreshToken = null;
    }
  }

  // ─── Load All Data ─────────────────────────────────────────────
  async function loadAll() {
    try {
      const [data, status] = await Promise.all([
        api(API.botData),
        api(API.botStatus),
      ]);
      botData = data;
      renderStats(data);
      renderRecentViolations(data);
      renderStatus(status);
    } catch {
      showToast("⚠️ Could not load dashboard data", "error");
    }
  }

  async function loadWords() {
    try {
      botData = await api(API.botData);
      renderBadWords(botData);
      renderWhiteList(botData);
      renderStats(botData);
    } catch {
      /* ignore */
    }
  }

  async function loadViolations() {
    try {
      botData = await api(API.botData);
      renderAllViolations(botData);
    } catch {
      /* ignore */
    }
  }

  async function loadCommands() {
    try {
      const status = await api(API.botStatus);
      renderCommandsGrid(status);
    } catch {
      /* ignore */
    }
  }

  async function loadLogs() {
    try {
      const res = await api(API.logs + "?limit=200");
      renderLogs(res.logs || res);
      // Also load stats
      try {
        const stats = await api(API.logsStats);
        renderLogStats(stats);
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  }

  async function loadUsers() {
    if (currentUser?.role !== "owner") return;
    try {
      const users = await api(API.users);
      renderUsersTable(users);
    } catch {
      /* ignore */
    }
  }

  async function loadSettings() {
    try {
      botData = await api(API.botData);
      renderSettings(botData);
      renderPermissions(botData);
    } catch {
      /* ignore */
    }
  }

  // ─── Stats Rendering ───────────────────────────────────────────
  function renderStats(data) {
    if (!data) return;
    const set = (id, val) => {
      const el = $(id);
      if (el) el.innerHTML = val;
    };

    const badWordsCount = data.words?.badWords?.length || 0;
    const violationsArr = Object.values(data.violations || {});
    const totalViolations = violationsArr.reduce((a, b) => a + b, 0);
    const flaggedUsers = Object.keys(data.violations || {}).length;
    const ignoredChannels = data.permissions?.ignoredChannels?.length || 0;

    set("statBadWords", `${badWordsCount} 🚫`);
    set("statViolations", `${totalViolations} 📊`);
    set("statFlaggedUsers", `${flaggedUsers} 🎯`);
    set("statIgnoredChannels", `${ignoredChannels} 🌐`);

    // Violation change indicator
    const changeEl = $("statViolationChange");
    if (changeEl) {
      changeEl.innerHTML =
        totalViolations > 0 ?
          `📈 ${totalViolations} total strikes recorded ⚠️`
        : "✨ Clean slate — no violations 🌟";
    }
  }

  function renderStatus(status) {
    const botStatus = $("botStatus");
    const botUptime = $("botUptime");
    const botVersion = $("botVersion");

    if (botStatus)
      botStatus.innerHTML =
        status?.online !== false ? "🟢 Online ✨" : "🔴 Offline 💤";
    if (botUptime && status?.uptime) {
      const s = Math.floor(status.uptime);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      botUptime.textContent =
        h > 0 ? `${h}h ${m}m ${sec}s ⏱️` : `${m}m ${sec}s ⏱️`;
    }
    if (botVersion) botVersion.textContent = status?.version || "3.0.0 🔥";
  }

  // ─── Violations ────────────────────────────────────────────────
  function renderRecentViolations(data) {
    const body = $("violationsTableBody");
    if (!body || !data?.violations) return;
    const entries = Object.entries(data.violations);
    const max = data.config?.maxStrikes || 3;

    if (!entries.length) {
      body.innerHTML = `<tr><td colspan="3" class="loading-cell">✅ No violations recorded 🌟</td></tr>`;
      return;
    }

    const recent = entries.slice(0, 10);
    body.innerHTML = recent
      .map(
        ([uid, s]) => `
      <tr>
        <td><code style="color:#ff4444;">${escHtml(uid)}</code> 🆔</td>
        <td><strong>${s} 🔨</strong></td>
        <td>${badgeHtml(s, max)}</td>
      </tr>`,
      )
      .join("");
  }

  function renderAllViolations(data) {
    const body = $("allViolationsBody");
    if (!body || !data?.violations) return;
    const entries = Object.entries(data.violations);
    const max = data.config?.maxStrikes || 3;

    if (!entries.length) {
      body.innerHTML = `<tr><td colspan="4" class="loading-cell">✅ No violations recorded 🌟</td></tr>`;
      return;
    }

    body.innerHTML = entries
      .map(
        ([uid, s]) => `
      <tr>
        <td><code style="color:#ff4444;">${escHtml(uid)}</code> 🆔</td>
        <td><strong>${s} 🔨</strong></td>
        <td>${badgeHtml(s, max)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="resetUserViolation('${escHtml(uid)}')">🗑️ Reset ✨</button></td>
      </tr>`,
      )
      .join("");
  }

  function badgeHtml(strikes, max) {
    const r = strikes / (max || 3);
    if (r >= 1) return '<span class="badge badge-red">🔴 Banned ⛔</span>';
    if (r >= 0.6)
      return '<span class="badge badge-yellow">🟡 Warning ⚠️</span>';
    return '<span class="badge badge-green">🟢 Active ✅</span>';
  }

  window.resetUserViolation = async function (userId) {
    if (!confirm(`⚠️ Reset violations for ${userId}? 🔄`)) return;
    try {
      await api(`${API.botViolations}/${encodeURIComponent(userId)}/reset`, {
        method: "POST",
      });
      showToast(`✅ Violations reset for ${userId} 🎯`, "success");
      await loadViolations();
      await loadAll();
    } catch {
      /* ignore */
    }
  };

  window.resetAllViolations = async function () {
    if (!confirm("🗑️ Reset ALL violations? This cannot be undone! ⚠️")) return;
    try {
      await api(API.botViolations, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      showToast("✅ All violations reset 🔄", "success");
      await loadViolations();
      await loadAll();
    } catch {
      /* ignore */
    }
  };

  // ─── Bad Words ─────────────────────────────────────────────────
  function renderBadWords(data) {
    const body = $("badWordsTableBody");
    const count = $("badWordsCount");
    const tabCount = $("badWordsTabCount");
    if (!data?.words?.badWords) return;
    const words = data.words.badWords;
    if (count) count.textContent = words.length;
    if (tabCount) tabCount.textContent = `(${words.length}) 🚫`;
    if (!body) return;
    if (!words.length) {
      body.innerHTML = `<tr><td colspan="3" class="loading-cell">✅ No bad words defined 🌈</td></tr>`;
      return;
    }
    body.innerHTML = words
      .map(
        (w, i) => `
      <tr>
        <td>${i + 1}️⃣</td>
        <td><code>${escHtml(w)}</code> 📖</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteWord('bad','${escHtml(w)}')">🗑️</button></td>
      </tr>`,
      )
      .join("");
  }

  function renderWhiteList(data) {
    const body = $("whiteListTableBody");
    const count = $("whiteListCount");
    const tabCount = $("whiteListTabCount");
    if (!data?.words?.whiteListWords) return;
    const words = data.words.whiteListWords;
    if (count) count.textContent = words.length;
    if (tabCount) tabCount.textContent = `(${words.length}) ✅`;
    if (!body) return;
    if (!words.length) {
      body.innerHTML = `<tr><td colspan="3" class="loading-cell">✅ No whitelist entries 📝</td></tr>`;
      return;
    }
    body.innerHTML = words
      .map(
        (w, i) => `
      <tr>
        <td>${i + 1}️⃣</td>
        <td><code>${escHtml(w)}</code> 📖</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteWord('white','${escHtml(w)}')">🗑️</button></td>
      </tr>`,
      )
      .join("");
  }

  window.deleteWord = async function (type, word) {
    if (
      !confirm(
        `🗑️ Delete "${word}" from ${type === "bad" ? "bad words 🚫" : "whitelist ✅"}?`,
      )
    )
      return;
    try {
      const endpoint =
        type === "bad" ?
          `${API.botWordsBad}/${encodeURIComponent(word)}`
        : `${API.botWordsWhitelist}/${encodeURIComponent(word)}`;
      await api(endpoint, { method: "DELETE" });
      showToast(`✅ "${word}" deleted successfully 🎉`, "success");
      await loadWords();
    } catch {
      /* ignore */
    }
  };

  window.refreshWords = async function () {
    await loadWords();
    showToast("🔄 Words refreshed ✨", "success");
  };

  window.refreshViolations = async function () {
    await loadViolations();
    showToast("🔄 Violations refreshed 📊", "success");
  };

  // ─── Commands Grid ─────────────────────────────────────────────
  function renderCommandsGrid(status) {
    const grid = $("commandsGrid");
    if (!grid) return;

    const cmds = [
      {
        icon: "❓",
        name: "help",
        desc: "Show all available bot commands 🤖",
        access: "🌐 All roles",
        action: "help",
      },
      {
        icon: "🔨",
        name: "strikes",
        desc: "Check strike count for a user 🎯",
        access: "🛡️ Mod+",
        action: "strikes",
      },
      {
        icon: "🔄",
        name: "reset",
        desc: "Reset strikes for a user ✨",
        access: "👑 Admin+",
        action: "reset",
      },
      {
        icon: "⚙️",
        name: "manage",
        desc: "Add/remove words & channels ⚙️",
        access: "👑 Admin+",
        action: "manage",
      },
      {
        icon: "🔧",
        name: "settings",
        desc: "View or update bot configuration ⚙️",
        access: "👑 Owner",
        action: "settings",
      },
    ];

    grid.innerHTML = cmds
      .map(
        (c) => `
      <div class="cmd-card" onclick="runCommand('${c.action}')">
        <div class="cmd-icon">${c.icon}</div>
        <div class="cmd-name">/${c.name} ⚡</div>
        <div class="cmd-desc">${c.desc}</div>
        <span class="cmd-access">${c.access}</span>
      </div>`,
      )
      .join("");

    renderStatus(status || {});
  }

  window.runCommand = async function (action) {
    switch (action) {
      case "help":
        try {
          const res = await api(`${API.botCommand}/help`, { method: "POST" });
          showToast("📋 Help commands listed 🤖", "success");
        } catch {
          /* ignore */
        }
        break;
      case "strikes":
        navigate("violations");
        showToast("🔨 Navigate to violations page to check strikes 🎯", "info");
        break;
      case "reset":
        navigate("violations");
        showToast("🔄 Navigate to violations page to reset strikes ✨", "info");
        break;
      case "manage":
        navigate("words");
        showToast("📝 Navigate to Words page to manage lists 🔧", "info");
        break;
      case "settings":
        navigate("settings");
        showToast("🔧 Navigate to Settings page ⚙️", "info");
        break;
    }
  };

  window.refreshCommands = async function () {
    await loadCommands();
    showToast("🔄 Commands refreshed ✨", "success");
  };

  // ─── Logs ──────────────────────────────────────────────────────
  function renderLogs(logs) {
    const body = $("logsTableBody");
    if (!body) return;
    const logArr = Array.isArray(logs) ? logs : logs?.logs || [];

    const logBadge = $("logBadge");
    if (logBadge)
      logBadge.textContent =
        logArr.length > 99 ? "99+ 🔥" : String(logArr.length);

    if (!logArr.length) {
      body.innerHTML = `<tr><td colspan="4" class="loading-cell">📭 No activity yet 🌙</td></tr>`;
      return;
    }

    body.innerHTML = logArr
      .slice(0, 100)
      .map((l) => {
        const time = new Date(l.timestamp).toLocaleString();
        const actionBadge =
          l.action.includes("login") ? "badge-green"
          : l.action.includes("delete") || l.action.includes("reset") ?
            "badge-red"
          : l.action.includes("update") || l.action.includes("create") ?
            "badge-yellow"
          : "badge";
        return `
      <tr>
        <td style="font-size:.8rem;color:#888;">🕒 ${time}</td>
        <td>👤 ${escHtml(l.user)}</td>
        <td><span class="badge ${actionBadge}">${escHtml(l.action)} 📌</span></td>
        <td style="color:var(--text-dim);font-size:.85rem;">${escHtml(l.details)} 📝</td>
      </tr>`;
      })
      .join("");
  }

  function renderLogStats(stats) {
    // Could be used for a future stats section above logs
    if (!stats) return;
  }

  window.refreshLogs = async function () {
    await loadLogs();
    showToast("🔄 Logs refreshed ✨", "success");
  };

  window.exportLogs = async function () {
    try {
      window.open(API.logsExport + "?format=json", "_blank");
      showToast("📥 Exporting logs... 📋", "info");
    } catch {
      /* ignore */
    }
  };

  window.clearLogs = async function () {
    if (!confirm("🗑️ Delete ALL logs? This cannot be undone! ⚠️")) return;
    try {
      await api(API.logs, { method: "DELETE" });
      showToast("✅ All logs cleared 🗑️", "success");
      await loadLogs();
    } catch {
      /* ignore */
    }
  };

  // ─── Users Management ──────────────────────────────────────────
  function renderUsersTable(users) {
    const body = $("usersTableBody");
    if (!body) return;
    if (!users || !users.length) {
      body.innerHTML = `<tr><td colspan="5" class="loading-cell">👤 No dashboard users yet 😢</td></tr>`;
      return;
    }
    body.innerHTML = users
      .map(
        (u) => `
      <tr>
        <td>${u.avatar || "👤"} ${escHtml(u.username)}</td>
        <td>${
          u.role === "owner" ? "👑 Owner"
          : u.role === "admin" ? "🛡️ Admin"
          : "👤 User"
        }</td>
        <td style="font-size:.8rem;color:#888;">📅 ${new Date(u.created).toLocaleDateString()}</td>
        <td style="font-size:.8rem;color:#888;">${u.lastLogin ? `🕒 ${new Date(u.lastLogin).toLocaleDateString()}` : "🚫 Never"}</td>
        <td>${u.role !== "owner" ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">🗑️</button>` : "🔒"}</td>
      </tr>`,
      )
      .join("");
  }

  window.deleteUser = async function (id) {
    if (!confirm("🗑️ Delete this user? ⚠️")) return;
    try {
      await api(`${API.users}/${id}`, { method: "DELETE" });
      showToast("✅ User deleted successfully 🎉", "success");
      await loadUsers();
    } catch {
      /* ignore */
    }
  };

  // ─── Settings ──────────────────────────────────────────────────
  function renderSettings(data) {
    if (!data?.config) return;
    const c = data.config;
    const set = (id, val) => {
      const el = $(id);
      if (el) el.value = val ?? "";
    };
    set("setTimeout", c.timeoutDurationMs);
    set("setMaxStrikes", c.maxStrikes);
    set("setNotifChannel", c.notificationChannelId);
    set("setLogChannel", c.logChannelId);
    set("setDmTitle", c.dmWarningTitle);
    set("setLogTitle", c.logTitle);
  }

  window.saveSettings = async function () {
    const config = {
      timeoutDurationMs: parseInt($("setTimeout")?.value, 10) || 60000,
      maxStrikes: parseInt($("setMaxStrikes")?.value, 10) || 3,
      notificationChannelId: $("setNotifChannel")?.value.trim() || "",
      logChannelId: $("setLogChannel")?.value.trim() || "",
      dmWarningTitle: $("setDmTitle")?.value.trim() || "",
      logTitle: $("setLogTitle")?.value.trim() || "",
    };
    try {
      await api(API.botConfig, { method: "PUT", body: JSON.stringify(config) });
      showToast("✅ Settings saved successfully 💾", "success");
    } catch {
      /* ignore */
    }
  };

  window.loadSettings = function () {
    if (botData) renderSettings(botData);
    showToast("🔄 Form reset to saved values 🔄", "info");
  };

  function renderPermissions(data) {
    if (!data?.permissions) return;
    const ignoredRow = $("ignoredChannelsRow");
    const allowedRow = $("allowedUsersRow");
    if (ignoredRow) {
      const ch = data.permissions.ignoredChannels;
      const td = ignoredRow.querySelector("td:last-child");
      if (td) {
        td.textContent =
          ch.length ? ch.join(", ") : "🔇 None (all monitored) 🌐";
        td.style.color = ch.length ? "#ff4444" : "#888";
      }
    }
    if (allowedRow) {
      const us = data.permissions.allowedUsers;
      const td = allowedRow.querySelector("td:last-child");
      if (td) {
        td.textContent = us.length ? us.join(", ") : "👑 Role-based only";
        td.style.color = us.length ? "#66bb6a" : "#888";
      }
    }
  }

  // ─── Modals ────────────────────────────────────────────────────
  function openModal(title, html) {
    const overlay = $("modalOverlay");
    const titleEl = $("modalTitle");
    const bodyEl = $("modalBody");
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html;
    if (overlay) overlay.classList.remove("hidden");
  }

  function closeModal() {
    const overlay = $("modalOverlay");
    if (overlay) overlay.classList.add("hidden");
  }

  $("modalClose")?.addEventListener("click", closeModal);
  $("modalOverlay")?.addEventListener("click", (e) => {
    if (e.target === $("modalOverlay")) closeModal();
  });

  // Escape key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Add Word Modal
  window.openAddWordModal = function (type) {
    const label = type === "bad" ? "🚫 Bad Word" : "✅ Whitelist Word";
    openModal(
      `➕ Add ${label} 📝`,
      `
      <div class="form-group">
        <label>📖 Word / Phrase</label>
        <input type="text" id="newWordInput" placeholder="Enter word..." autofocus />
      </div>
      <div style="display:flex;gap:.75rem;margin-top:1rem;">
        <button class="btn-glow btn-sm" onclick="submitNewWord('${type}')">💾 Save ✨</button>
        <button class="btn btn-sm" onclick="closeModal()">❌ Cancel</button>
      </div>`,
    );
    setTimeout(() => $("newWordInput")?.focus(), 100);
  };

  window.submitNewWord = async function (type) {
    const input = $("newWordInput");
    const word = input?.value.trim();
    if (!word) {
      showToast("⚠️ Please enter a word 📝", "error");
      return;
    }
    try {
      const endpoint = type === "bad" ? API.botWordsBad : API.botWordsWhitelist;
      await api(endpoint, { method: "POST", body: JSON.stringify({ word }) });
      showToast(`✅ "${word}" added successfully ✨`, "success");
      closeModal();
      await loadWords();
    } catch {
      /* ignore */
    }
  };

  // Add User Modal
  window.openAddUserModal = function () {
    openModal(
      "👤 Create Dashboard User 🎉",
      `
      <div class="form-group">
        <label>👤 Username</label>
        <input type="text" id="newUserUser" placeholder="Enter username" />
      </div>
      <div class="form-group">
        <label>🔑 Password</label>
        <input type="password" id="newUserPass" placeholder="Enter password (min 6 chars)" />
      </div>
      <div class="form-group">
        <label>👑 Role</label>
        <select id="newUserRole">
          <option value="admin">🛡️ Admin</option>
          <option value="owner">👑 Owner</option>
        </select>
      </div>
      <div style="display:flex;gap:.75rem;margin-top:1rem;">
        <button class="btn-glow btn-sm" onclick="submitNewUser()">💾 Create ✨</button>
        <button class="btn btn-sm" onclick="closeModal()">❌ Cancel</button>
      </div>`,
    );
  };

  window.submitNewUser = async function () {
    const username = $("newUserUser")?.value.trim();
    const password = $("newUserPass")?.value.trim();
    const role = $("newUserRole")?.value || "admin";
    if (!username || !password) {
      showToast("⚠️ Fill all fields 📝", "error");
      return;
    }
    try {
      await api(API.users, {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      });
      showToast(`✅ User "${username}" created successfully 🎉`, "success");
      closeModal();
      await loadUsers();
    } catch {
      /* ignore */
    }
  };

  // Change Password Modal
  window.openChangePasswordModal = function () {
    openModal(
      "🔑 Change Password",
      `
      <div class="form-group">
        <label>🔐 Current Password</label>
        <input type="password" id="currentPassInput" placeholder="Enter current password" />
      </div>
      <div class="form-group">
        <label>🔑 New Password</label>
        <input type="password" id="newPassInput" placeholder="Enter new password (min 6 chars)" />
      </div>
      <div style="display:flex;gap:.75rem;margin-top:1rem;">
        <button class="btn-glow btn-sm" onclick="submitChangePassword()">💾 Update 🔐</button>
        <button class="btn btn-sm" onclick="closeModal()">❌ Cancel</button>
      </div>`,
    );
  };

  window.submitChangePassword = async function () {
    const currentPassword = $("currentPassInput")?.value.trim();
    const newPassword = $("newPassInput")?.value.trim();
    if (!currentPassword || !newPassword) {
      showToast("⚠️ Fill all fields 📝", "error");
      return;
    }
    try {
      await api(API.mePassword, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      showToast("✅ Password updated successfully 🔐", "success");
      closeModal();
    } catch {
      /* ignore */
    }
  };

  // Expose globally
  window.closeModal = closeModal;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.navigate = navigate;

  // ─── Helpers ────────────────────────────────────────────────────
  function escHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ─── Keyboard Shortcuts ─────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (!currentUser) return;
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "1":
          e.preventDefault();
          navigate("overview");
          break;
        case "2":
          e.preventDefault();
          navigate("words");
          break;
        case "3":
          e.preventDefault();
          navigate("violations");
          break;
        case "4":
          e.preventDefault();
          navigate("commands");
          break;
        case "5":
          e.preventDefault();
          navigate("logs");
          break;
        case "6":
          e.preventDefault();
          navigate("settings");
          break;
      }
    }
  });

  // ─── Auto-Refresh (every 30s) ──────────────────────────────────
  let autoRefreshInterval = null;
  function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(async () => {
      if (!currentUser) return;
      try {
        botData = await api(API.botData);
        renderStats(botData);
        // Update the currently visible page
        const visiblePage = document.querySelector(
          ".page-content:not(.hidden)",
        );
        if (visiblePage) {
          const pageId = visiblePage.id.replace("page-", "");
          switch (pageId) {
            case "overview":
              renderRecentViolations(botData);
              break;
            case "words":
              renderBadWords(botData);
              renderWhiteList(botData);
              break;
            case "violations":
              renderAllViolations(botData);
              break;
          }
        }
      } catch {
        /* silent refresh */
      }
    }, 30000);
  }

  // ─── Init ──────────────────────────────────────────────────────
  async function init() {
    accessToken = sessionStorage.getItem("regix_access");
    refreshToken = sessionStorage.getItem("regix_refresh");

    // If no access token, redirect to login
    if (!accessToken) {
      const isProtectedPage = !window.location.pathname.includes("index.html");
      if (isProtectedPage) {
        window.location.href = "../index.html";
        return;
      }
    } else {
      // Validate session via API
      await checkSession();

      // If on protected page and no user, redirect to login
      if (!currentUser) {
        window.location.href = "../index.html";
        return;
      }

      // Set up logout button and close sidebar
      $("logoutBtn")?.addEventListener("click", handleLogout);
      const sidebarClose = $("sidebarClose");
      const sidebarOverlay = $("sidebarOverlay");
      sidebarClose?.addEventListener("click", closeSidebar);
      sidebarOverlay?.addEventListener("click", closeSidebar);

      // Auto-load page-specific content
      if (currentUser) {
        const path = window.location.pathname;
        let pageType = null;
        if (path.includes("overview")) pageType = "overview";
        else if (path.includes("words")) pageType = "words";
        else if (path.includes("violations")) pageType = "violations";
        else if (path.includes("commands")) pageType = "commands";
        else if (path.includes("logs")) pageType = "logs";
        else if (path.includes("users")) pageType = "users";
        else if (path.includes("settings")) pageType = "settings";

        if (pageType) {
          switch (pageType) {
            case "overview":
              loadAll();
              break;
            case "words":
              loadWords();
              break;
            case "violations":
              loadViolations();
              break;
            case "commands":
              loadCommands();
              break;
            case "logs":
              loadLogs();
              break;
            case "users":
              loadUsers();
              break;
            case "settings":
              loadSettings();
              break;
          }
          startAutoRefresh();
        }
      }
    }
  }

  init();
})();
