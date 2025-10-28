const API = {
    register: "/api/register/",
    login: "/api/login/",
    me: "/api/me/",
  };
  const LS_ACCESS = "access_token";
  const LS_REFRESH = "refresh_token";
  
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => Array.from(root.querySelectorAll(s));
  
  function authHeader() {
    const t = localStorage.getItem(LS_ACCESS);
    return t ? { "Authorization": "Bearer " + t } : {};
  }
  
  async function syncAuthUI() {
    const guest = qs("#auth-guest");
    const user  = qs("#auth-user");
    try {
      const r = await fetch(API.me, { headers: authHeader() });
      if (!r.ok) throw 0;
      const me = await r.json();
      guest.classList.add("hidden");
      user.classList.remove("hidden");
      qs("#user-name").textContent = me.first_name || me.username || "Профиль";
      const av = qs("#user-avatar");
      if (me.avatar) { av.src = me.avatar; }
    } catch {
      user.classList.add("hidden");
      guest.classList.remove("hidden");
    }
  }
  
  /* модалки */
  function openModal(id){ qs(id).classList.add("show"); }
  function closeModal(el){ el.classList.remove("show"); }
  qsa("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.closest(".modal"))));
  qs("#open-login")?.addEventListener("click", () => openModal("#modal-login"));
  qs("#open-register")?.addEventListener("click", () => openModal("#modal-register"));
  window.addEventListener("keydown", e => { if (e.key === "Escape") qsa(".modal.show").forEach(closeModal); });
  
  /* дропдаун */
  const trigger = qs("#user-trigger");
  const menu = qs("#user-menu");
  if (trigger && menu) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) menu.classList.remove("open");
    });
  }
  
  /* хелпер для сообщений */
  function showHint(sel, msg, ok=false, err=false) {
    const el = qs(sel);
    if (!el) return;
    el.className = "hint" + (ok ? " ok" : "") + (err ? " err" : "");
    el.textContent = msg || "";
  }
  
  /* вход */
  qs("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showHint("#login-hint","Вход…");
    const username = qs("#login-username").value.trim();
    const password = qs("#login-password").value;
    const r = await fetch(API.login, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({username, password})
    });
    const j = await r.json();
    if (!r.ok) return showHint("#login-hint", j.detail || "Ошибка", false, true);
    localStorage.setItem(LS_ACCESS, j.access);
    localStorage.setItem(LS_REFRESH, j.refresh);
    closeModal(qs("#modal-login"));
    syncAuthUI();
  });
  
  /* регистрация */
  qs("#form-register")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showHint("#reg-hint","Создаём…");
    const username = qs("#reg-username").value.trim();
    const email = qs("#reg-email").value.trim();
    const password = qs("#reg-password").value;
    const r = await fetch(API.register, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({username, email, password})
    });
    const j = await r.json();
    if (!r.ok) return showHint("#reg-hint", JSON.stringify(j), false, true);
    showHint("#reg-hint", "Аккаунт создан. Войдите.", true);
    closeModal(qs("#modal-register"));
    openModal("#modal-login");
    qs("#login-username").value = email || username;
    qs("#login-password").value = password;
  });
  
  /* выход */
  qs("#logout")?.addEventListener("click", () => {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    syncAuthUI();
  });
  
  syncAuthUI();
  