// --- вкладки
document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.querySelector('#panel-' + t.dataset.tab).classList.add('active');
    });
  });
  
  const API = {
    register: "/api/register/",
    login: "/api/login/",
    me: "/api/me/",
    skills: "/api/skills/"
  };
  const LS_ACCESS = "access_token";
  const LS_REFRESH = "refresh_token";
  
  const $ = (id) => document.getElementById(id);
  const setMsg = (id, text, ok=false) => {
    const el = $(id);
    el.textContent = text || "";
    el.className = ok ? "ok" : "muted";
  };
  
  function authHeader() {
    const t = localStorage.getItem(LS_ACCESS);
    return t ? { "Authorization": "Bearer " + t } : {};
  }
  function whoami() {
    const t = localStorage.getItem(LS_ACCESS);
    const el = $("whoami");
    if (el) el.textContent = t ? "access: " + t.slice(0, 16) + "..." : "не авторизован";
  }
  whoami();
  
  // --- Регистрация
  const btnReg = $("btn-register");
  if (btnReg) btnReg.onclick = async () => {
    setMsg("reg-msg", "Отправляю…");
    const body = {
      username: $("reg-username").value.trim(),
      email: $("reg-email").value.trim(),
      password: $("reg-password").value
    };
    try {
      const r = await fetch(API.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw j;
      setMsg("reg-msg", "Готово! Теперь войди на вкладке «Логин».", true);
    } catch (e) {
      const m = $("reg-msg"); m.className = "error";
      m.textContent = JSON.stringify(e, null, 2);
    }
  };
  
  // --- Логин / логаут
  const btnLogin = $("btn-login");
  if (btnLogin) btnLogin.onclick = async () => {
    setMsg("login-msg", "Проверяю…");
    const body = { username: $("login-username").value.trim(), password: $("login-password").value };
    try {
      const r = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw j;
      localStorage.setItem(LS_ACCESS, j.access);
      localStorage.setItem(LS_REFRESH, j.refresh);
      setMsg("login-msg", "Вход выполнен.", true);
      whoami();
    } catch (e) {
      const m = $("login-msg"); m.className = "error";
      m.textContent = JSON.stringify(e, null, 2);
    }
  };
  
  const btnLogout = $("btn-logout");
  if (btnLogout) btnLogout.onclick = () => {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    whoami();
    setMsg("login-msg", "Вышел.", true);
  };
  
  // --- Профиль: загрузить
  const btnLoadMe = $("btn-load-me");
  if (btnLoadMe) btnLoadMe.onclick = async () => {
    $("me-error").textContent = "";
    setMsg("me-msg", "Загружаю…");
    try {
      const r = await fetch(API.me, { headers: authHeader() });
      const j = await r.json();
      if (!r.ok) throw j;
      $("me-first").value = j.first_name || "";
      $("me-last").value  = j.last_name  || "";
      $("me-bio").value   = j.bio || "";
      setMsg("me-msg", "Профиль загружен.", true);
    } catch (e) {
      $("me-error").textContent = JSON.stringify(e, null, 2);
      setMsg("me-msg", "");
    }
  };
  
  // --- список доступных навыков
  const btnLoadSkills = $("btn-load-skills");
  if (btnLoadSkills) btnLoadSkills.onclick = async () => {
    const r = await fetch(API.skills);
    const j = await r.json();
    const box = $("skills-list");
    box.innerHTML = "";
    (j.results || j).slice(0, 30).forEach(s => {
      const div = document.createElement("div");
      div.className = "chip";
      div.textContent = `${s.id}: ${s.name}`;
      box.appendChild(div);
    });
  };
  
  // --- Профиль: сохранить
  const btnSaveMe = $("btn-save-me");
  if (btnSaveMe) btnSaveMe.onclick = async () => {
    $("me-error").textContent = "";
    setMsg("me-msg", "Сохраняю…");
    const ids = $("me-skill-ids").value
      .split(",").map(x => parseInt(x.trim(),10)).filter(Boolean);
    const user_skills = ids.map(id => ({ skill_id: id, level: 2, years: 1.0 }));
    const body = {
      first_name: $("me-first").value,
      last_name: $("me-last").value,
      bio: $("me-bio").value,
      user_skills
    };
    try {
      const r = await fetch(API.me, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw j;
      setMsg("me-msg", "Сохранено.", true);
    } catch (e) {
      $("me-error").textContent = JSON.stringify(e, null, 2);
      setMsg("me-msg", "");
    }
  };
  