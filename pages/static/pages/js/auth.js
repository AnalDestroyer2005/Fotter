// ---- Конфиг API ----
const API = {
  register: "/api/register/",
  login: "/api/login/",
  me: "/api/me/",
};

// ---- LocalStorage ключи ----
const LS_ACCESS  = "access_token";
const LS_REFRESH = "refresh_token";
const LS_USER    = "fotter_user"; // кэш профиля

const DEFAULT_AFTER_LOGIN = "/account/"; // дефолтный редирект

// ---- Утилиты ----
const qs  = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));

function authHeader() {
  const t = localStorage.getItem(LS_ACCESS);
  return t ? { Authorization: "Bearer " + t } : {};
}

function showHint(sel, msg, ok = false, err = false) {
  const el = qs(sel);
  if (!el) return;
  el.className = "hint" + (ok ? " ok" : "") + (err ? " err" : "");
  el.textContent = msg || "";
}

function closeModalSafe(el) {
  if (el && el.classList) el.classList.remove("show");
}

async function apiMe() {
  const res = await fetch(API.me, { headers: authHeader() });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

// Куда редиректить после логина/регистрации
function getNextUrl() {
  const p = new URLSearchParams(location.search).get("next");
  if (p && /^\/[^\s]*$/.test(p)) return p; // безопасный относительный путь
  const hidden = qs('input[name="next"]')?.value;
  if (hidden && /^\/[^\s]*$/.test(hidden)) return hidden;
  return DEFAULT_AFTER_LOGIN;
}

// ---- Синхронизация хедера/состояния ----
async function syncAuthUI() {
  const guest = qs("#auth-guest");
  const user  = qs("#auth-user");
  try {
    const me = await apiMe();
    if (user) user.classList.remove("hidden");
    if (guest) guest.classList.add("hidden");
    qs("#user-name") && (qs("#user-name").textContent = me.first_name || me.username || "Профиль");
    if (qs("#user-avatar") && me.avatar) qs("#user-avatar").src = me.avatar;
    localStorage.setItem(LS_USER, JSON.stringify(me));
  } catch {
    if (user) user.classList.add("hidden");
    if (guest) guest.classList.remove("hidden");
    localStorage.removeItem(LS_USER);
  }
}

// ---- Вход ----
const loginForm = qs("#form-login");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showHint("#login-hint", "Вход…");
    const username = (qs("#login-username") || qs('[name="username"]')).value.trim();
    const password = (qs("#login-password") || qs('[name="password"]')).value;

    try {
      const r = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || "Ошибка входа");

      localStorage.setItem(LS_ACCESS,  j.access);
      localStorage.setItem(LS_REFRESH, j.refresh);

      try { // не блокируем редирект, даже если /me/ упадёт
        const me = await apiMe();
        localStorage.setItem(LS_USER, JSON.stringify(me));
      } catch {}

      closeModalSafe(qs("#modal-login"));
      showHint("#login-hint", "Готово", true, false);

      // Редирект
      window.location.replace(getNextUrl());

    } catch (err) {
      console.error(err);
      showHint("#login-hint", String(err.message || err), false, true);
    }
  });
}

// ---- Регистрация ----
const regForm = qs("#form-register");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showHint("#reg-hint", "Создаём…");

    const username = (qs("#reg-username") || qs('[name="username"]')).value.trim();
    const email    = (qs("#reg-email")    || qs('[name="email"]'))?.value.trim() || "";
    const password = (qs("#reg-password") || qs('[name="password"]')).value;

    try {
      const r = await fetch(API.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || JSON.stringify(j));

      // Автовход после регистрации
      const r2 = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2?.detail || "Не удалось войти после регистрации");

      localStorage.setItem(LS_ACCESS,  j2.access);
      localStorage.setItem(LS_REFRESH, j2.refresh);

      try {
        const me = await apiMe();
        localStorage.setItem(LS_USER, JSON.stringify(me));
      } catch {}

      closeModalSafe(qs("#modal-register"));
      showHint("#reg-hint", "Готово", true, false);

      // Редирект
      window.location.replace(getNextUrl());

    } catch (err) {
      console.error(err);
      showHint("#reg-hint", String(err.message || err), false, true);
    }
  });
}

// ---- Выход ----
qs("#logout")?.addEventListener("click", () => {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_USER);
  syncAuthUI();
  window.location.replace("/");
});

// Первичная синхронизация (гость/пользователь)
syncAuthUI();
