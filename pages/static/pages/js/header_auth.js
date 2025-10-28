// --- API и вспомогательные функции ---
const API = {
    me: "/api/me/",
  };
  const LS_ACCESS = "access_token";
  
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => Array.from(root.querySelectorAll(s));
  
  function authHeader() {
    const t = localStorage.getItem(LS_ACCESS);
    return t ? { "Authorization": "Bearer " + t } : {};
  }
  
  // --- Обновление состояния хедера ---
  async function syncHeaderAuth() {
    const guest = qs("#auth-guest");
    const user = qs("#auth-user");
    try {
      const r = await fetch(API.me, { headers: authHeader() });
      if (!r.ok) throw 0;
      const me = await r.json();
  
      // показать блок пользователя
      guest.classList.add("hidden");
      user.classList.remove("hidden");
  
      qs("#user-name").textContent = me.first_name || me.username || "Профиль";
      const av = qs("#user-avatar");
      if (me.avatar) {
        av.src = me.avatar;
        av.alt = me.username;
      } else {
        av.removeAttribute("src");
        av.style.background = "#cfd6e6";
      }
    } catch {
      // показать гостевой UI
      user.classList.add("hidden");
      guest.classList.remove("hidden");
    }
  }
  
  // --- Дропдаун пользователя ---
  function initDropdown() {
    const trigger = qs("#user-trigger");
    const menu = qs("#user-menu");
    if (!trigger || !menu) return;
    
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target))
        menu.classList.remove("open");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") menu.classList.remove("open");
    });
  }
  
  // --- Выход ---
  qs("#logout")?.addEventListener("click", () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    syncHeaderAuth();
  });
  
  // --- Инициализация ---
  initDropdown();
  syncHeaderAuth();
  