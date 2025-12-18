// ===== Account page logic (tabs + auth + profile + skills) =====

// ---------------- Tabs ----------------
document.addEventListener("DOMContentLoaded", () => {
  const tabs = Array.from(document.querySelectorAll(".tab[data-tab]"));
  const panels = Array.from(document.querySelectorAll(".panel"));

  function activate(tabName) {
    tabs.forEach(x => x.classList.toggle("active", x.dataset.tab === tabName));
    panels.forEach(x => x.classList.toggle("active", x.id === "panel-" + tabName));
  }

  tabs.forEach(t => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      activate(t.dataset.tab);
    });
  });

  // если ничего не активно — активируем первую вкладку
  const first = tabs[0]?.dataset.tab;
  if (first && !tabs.some(t => t.classList.contains("active"))) activate(first);
});

// ---------------- API ----------------
const API = {
  register: "/api/register/",
  login: "/api/login/",
  me: "/api/me/",
  skills: "/api/skills/",
};
const LS_ACCESS  = "access_token";
const LS_REFRESH = "refresh_token";
const LS_USER    = "fotter_user";

// ---------------- Utils ----------------
const $  = (id) => document.getElementById(id);
const qs = (s, root=document) => root.querySelector(s);

function setMsg(id, text, ok=false, isErr=false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.className = isErr ? "error" : ok ? "ok" : "muted";
}

function authHeader() {
  const t = localStorage.getItem(LS_ACCESS);
  return t ? { Authorization: "Bearer " + t } : {};
}

function getNextUrl() {
  const q = new URLSearchParams(location.search).get("next");
  if (q && /^\/[^\s]*$/.test(q)) return q;
  const hidden = qs('input[name="next"]')?.value;
  if (hidden && /^\/[^\s]*$/.test(hidden)) return hidden;
  return "/account/";
}

function whoami() {
  const t = localStorage.getItem(LS_ACCESS);
  const el = $("whoami");
  if (el) el.textContent = t ? "access: " + t.slice(0, 16) + "…" : "не авторизован";
}
whoami();

// ---------------- Auth: Register ----------------
$("btn-register")?.addEventListener("click", async () => {
  setMsg("reg-msg", "Отправляю…");
  const body = {
    username: $("reg-username")?.value.trim(),
    email: $("reg-email")?.value.trim(),
    password: $("reg-password")?.value,
  };
  try {
    const r = await fetch(API.register, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw j;

    // Автовход после регистрации
    const r2 = await fetch(API.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: body.username, password: body.password }),
    });
    const j2 = await r2.json();
    if (!r2.ok) throw j2;

    localStorage.setItem(LS_ACCESS, j2.access);
    localStorage.setItem(LS_REFRESH, j2.refresh);
    setMsg("reg-msg", "Готово!", true);
    whoami();
    window.location.replace(getNextUrl());
  } catch (e) {
    setMsg("reg-msg", JSON.stringify(e, null, 2), false, true);
  }
});

// ---------------- Auth: Login / Logout ----------------
$("btn-login")?.addEventListener("click", async () => {
  setMsg("login-msg", "Проверяю…");
  const body = {
    username: $("login-username")?.value.trim(),
    password: $("login-password")?.value,
  };
  try {
    const r = await fetch(API.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw j;

    localStorage.setItem(LS_ACCESS, j.access);
    localStorage.setItem(LS_REFRESH, j.refresh);
    setMsg("login-msg", "Вход выполнен.", true);
    whoami();

    // sanity-пинг /api/me (не блокируем редирект при ошибке)
    try { await fetch(API.me, { headers: authHeader() }); } catch {}
    window.location.replace(getNextUrl());
  } catch (e) {
    setMsg("login-msg", JSON.stringify(e, null, 2), false, true);
  }
});

$("btn-logout")?.addEventListener("click", () => {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_USER);
  whoami();
  setMsg("login-msg", "Вышел.", true);
  window.location.replace("/");
});

// ---------------- Profile: Load ----------------
$("btn-load-me")?.addEventListener("click", loadMe);
async function loadMe() {
  $("me-error") && ( $("me-error").textContent = "" );
  setMsg("me-msg", "Загружаю…");
  try {
    const r = await fetch(API.me, { headers: authHeader() });
    const j = await r.json();
    if (!r.ok) throw j;

    $("me-first") && ( $("me-first").value = j.first_name || "" );
    $("me-last")  && ( $("me-last").value  = j.last_name  || "" );
    $("me-bio")   && ( $("me-bio").value   = j.bio || "" );

    // если backend отдаёт skills: [{id,name}] — отметим их
    if (Array.isArray(j.skills)) {
      selectedSkillIds = new Set(j.skills.map(s => s.id ?? s));
      syncSelectedChips();
    }

    localStorage.setItem(LS_USER, JSON.stringify(j));
    setMsg("me-msg", "Профиль загружен.", true);
  } catch (e) {
    $("me-error") && ( $("me-error").textContent = JSON.stringify(e, null, 2) );
    setMsg("me-msg", "");
  }
}

// ---------------- Skills: Load & UI ----------------
let ALL_SKILLS = [];
let selectedSkillIds = new Set();

$("btn-load-skills")?.addEventListener("click", loadSkills);
async function loadSkills() {
  const r = await fetch(API.skills);
  const j = await r.json();
  const list = Array.isArray(j) ? j : (j.results || []);
  ALL_SKILLS = list;

  const box = $("skills-list");
  if (!box) return;
  box.innerHTML = "";
  list.forEach(s => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.id = s.id;
    chip.textContent = `${s.name}`;
    chip.addEventListener("click", () => {
      const id = Number(chip.dataset.id);
      if (selectedSkillIds.has(id)) selectedSkillIds.delete(id);
      else selectedSkillIds.add(id);
      syncSelectedChips();
    });
    box.appendChild(chip);
  });

  // если skills уже были отмечены (после loadMe), то синхронизируем вид
  syncSelectedChips();
}

function syncSelectedChips() {
  // Подсветим выбранные
  document.querySelectorAll("#skills-list .chip").forEach(ch => {
    const id = Number(ch.dataset.id);
    ch.classList.toggle("active", selectedSkillIds.has(id));
  });

  // Отрендерим выбранные (если есть контейнер)
  const picked = $("skills-picked");
  if (picked) {
    picked.innerHTML = "";
    const arr = ALL_SKILLS.filter(x => selectedSkillIds.has(x.id));
    if (!arr.length) {
      picked.innerHTML = `<span class="muted">Навыки не выбраны</span>`;
    } else {
      arr.forEach(x => {
        const tag = document.createElement("span");
        tag.className = "chip active";
        tag.textContent = x.name;
        picked.appendChild(tag);
      });
    }
  }

  // обновим скрытое поле, если оно есть (через запятую)
  const hidden = $("me-skill-ids");
  if (hidden) hidden.value = Array.from(selectedSkillIds).join(",");
}

// ---------------- Profile: Save ----------------
$("btn-save-me")?.addEventListener("click", saveProfile);
async function saveProfile() {
  $("me-error") && ( $("me-error").textContent = "" );
  setMsg("me-msg", "Сохраняю…");

  // берём ids либо из выбранных чипов, либо из инпута
  let ids = Array.from(selectedSkillIds);
  if (!ids.length && $("me-skill-ids")) {
    ids = $("me-skill-ids").value
      .split(",").map(x => parseInt(x.trim(), 10)).filter(Boolean);
  }

  // отправляем краткую форму: skills: [ids]
  const body = {
    first_name: $("me-first")?.value ?? "",
    last_name:  $("me-last")?.value  ?? "",
    bio:        $("me-bio")?.value   ?? "",
    skills:     ids,
  };

  try {
    const r = await fetch(API.me, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw j;

    // обновим локальный кэш
    localStorage.setItem(LS_USER, JSON.stringify(j));

    // синхронизируем выбранные навыки из ответа (если backend вернул)
    if (Array.isArray(j.skills)) {
      selectedSkillIds = new Set(j.skills.map(s => s.id ?? s));
      syncSelectedChips();
    }

    setMsg("me-msg", "Сохранено.", true);
  } catch (e) {
    $("me-error") && ( $("me-error").textContent = JSON.stringify(e, null, 2) );
    setMsg("me-msg", "");
  }
}

// ---------------- Auto-init ----------------
// если на странице уже есть форму профиля — сразу грузим
if ($("me-first") || $("btn-load-me")) loadMe().catch(()=>{});
// если есть контейнер с навыками — сразу подгружаем пулл
if ($("skills-list") || $("btn-load-skills")) loadSkills().catch(()=>{});
