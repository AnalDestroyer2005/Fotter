// Хедер: отображение гостя/пользователя. Без логики логина — она в auth.js.

const API = { me: "/api/me/" };
const LS_ACCESS = "access_token";
const LS_USER   = "fotter_user";

const qs  = (s, root = document) => root.querySelector(s);

function authHeader() {
  const t = localStorage.getItem(LS_ACCESS);
  return t ? { Authorization: "Bearer " + t } : {};
}

async function fetchMe() {
  const res = await fetch(API.me, { headers: authHeader() });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

function renderGuest() {
  const guest = qs("#auth-guest");
  const user  = qs("#auth-user");
  if (user)  user.classList.add("hidden");
  if (guest) guest.classList.remove("hidden");
}

function renderUser(me) {
  const guest = qs("#auth-guest");
  const user  = qs("#auth-user");
  if (guest) guest.classList.add("hidden");
  if (user)  user.classList.remove("hidden");
  const nameEl = qs("#user-name");
  const avEl   = qs("#user-avatar");
  if (nameEl) nameEl.textContent = me.first_name || me.username || "Профиль";
  if (avEl) {
    if (me.avatar) { avEl.src = me.avatar; avEl.alt = me.username; }
    else { avEl.removeAttribute("src"); avEl.style.background = "#cfd6e6"; }
  }
  const menu = qs("#user-menu");
  if (menu && !menu.querySelector("[data-menu-messages]")) {
    const link = document.createElement("a");
    link.href = "/messages/";
    link.className = "menu-item";
    link.setAttribute("role", "menuitem");
    link.setAttribute("data-menu-messages", "1");
    link.textContent = "Сообщения";
    const logoutBtn = qs("#logout", menu);
    menu.insertBefore(link, logoutBtn || null);
  }
}

async function syncHeaderAuth() {
  try {
    const cached = localStorage.getItem(LS_USER);
    if (cached) {
      renderUser(JSON.parse(cached));
      // тихо обновим в фоне
      fetchMe().then((me) => localStorage.setItem(LS_USER, JSON.stringify(me))).catch(()=>{});
      return;
    }
    const me = await fetchMe();
    localStorage.setItem(LS_USER, JSON.stringify(me));
    renderUser(me);
  } catch {
    renderGuest();
  }
}

// dropdown (если есть)
(function initDropdown() {
  const trigger = qs("#user-trigger");
  const menu    = qs("#user-menu");
  if (!trigger || !menu) return;
  trigger.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("open"); });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target) && !trigger.contains(e.target)) menu.classList.remove("open"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.classList.remove("open"); });
})();

// logout (дублируем на случай, если auth.js не подключён)
qs("#logout")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const csrf = getCookie("csrftoken");
  try {
    await fetch("/api/logout/", {
      method: "POST",
      headers: csrf ? { "X-CSRFToken": csrf } : {},
      credentials: "include",
    });
  } catch (_) {}
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("fotter_user");
  renderGuest();
  window.location.href = "/";
});

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// init
syncHeaderAuth();
