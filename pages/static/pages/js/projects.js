const API_PROJECTS = "/api/projects/";
const API_CATEGORIES = "/api/categories/";

const grid = document.getElementById("projects-grid");
const pager = document.getElementById("pagination");
const spinner = document.getElementById("spinner");
const errorBox = document.getElementById("error");
const catList = document.getElementById("cat-list");

const state = {
  page: 1,
  category: "", // id категории или пусто
  q: "",        // текстовый поиск, если понадобится
};

document.addEventListener("DOMContentLoaded", () => {
  loadCategories().then(() => loadProjects());
});

async function loadCategories() {
  if (!catList) return;
  try {
    const res = await fetch(API_CATEGORIES);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const items = await res.json(); // ожидается list [{id,name},...]
    renderCategories(items);
  } catch (e) {
    console.warn("Не удалось загрузить категории:", e);
  }
}

function renderCategories(items) {
  // Сначала оставим "Все", остальные добавим
  // Убедимся, что у "Все" есть один элемент
  if (!catList.querySelector('[data-id=""]')) {
    const all = document.createElement("a");
    all.className = "cat active";
    all.href = "#";
    all.dataset.id = "";
    all.textContent = "Все";
    catList.prepend(all);
  }

  for (const c of items) {
    const a = document.createElement("a");
    a.className = "cat";
    a.href = "#";
    a.dataset.id = String(c.id);
    a.textContent = c.name;
    catList.appendChild(a);
  }

  catList.addEventListener("click", (ev) => {
    const a = ev.target.closest("a.cat");
    if (!a) return;
    ev.preventDefault();
    // активный класс
    catList.querySelectorAll("a.cat").forEach(x => x.classList.remove("active"));
    a.classList.add("active");
    // фильтр категории
    state.category = a.dataset.id || "";
    state.page = 1;
    loadProjects();
  });
}

async function loadProjects() {
  spinner.style.display = "block";
  errorBox.style.display = "none";

  const params = new URLSearchParams();
  params.set("page", String(state.page));
  if (state.category) params.set("category", state.category);
  if (state.q) params.set("q", state.q);

  try {
    const res = await fetch(`${API_PROJECTS}?${params.toString()}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json(); // DRF: {count, next, previous, results}
    renderGrid(data.results || []);
    renderPager(data.next, data.previous, data.count ?? 0);
  } catch (e) {
    errorBox.textContent = "Ошибка загрузки проектов.";
    errorBox.style.display = "block";
    console.error(e);
  } finally {
    spinner.style.display = "none";
  }
}

function renderGrid(items) {
  if (!items.length) {
    grid.innerHTML = "<p>Проектов пока нет.</p>";
    return;
  }
  grid.innerHTML = items.map(p => cardHtml(p)).join("");
}

function cardHtml(p) {
  const title = escapeHtml(p.title ?? "");
  const desc = escapeHtml((p.description ?? "").slice(0, 160));
  const budget = p.budget ?? "—";
  const category = p.category ? escapeHtml(p.category.name) : "Без категории";
  const owner = p.owner_username ?? "—";

  return `
    <article class="card1">
      <h4>${title}</h4>
      <p>${desc}...</p>
      <div class="meta">
        <div><span>Категория</span><b>${category}</b></div>
        <div><span>Бюджет</span><b>${budget}</b></div>
        <div><span>Автор</span><b>${owner}</b></div>
      </div>
      <button class="btn" disabled>Откликнуться</button>
    </article>
  `;
}

function renderPager(next, prev, count) {
  const htmlBtn = (label, disabled, action) =>
    `<button ${disabled ? "disabled" : ""} data-action="${action || ""}">${label}</button>`;

  pager.innerHTML = `
    <span>Всего: ${count}</span>
    ${htmlBtn("« Назад", !prev, "prev")}
    ${htmlBtn("Вперёд »", !next, "next")}
  `;

  pager.onclick = (e) => {
    const b = e.target.closest("button[data-action]");
    if (!b || b.disabled) return;
    if (b.dataset.action === "prev") state.page = Math.max(1, state.page - 1);
    if (b.dataset.action === "next") state.page = state.page + 1;
    loadProjects();
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}
