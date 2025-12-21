// listings.js: filters + project creation + chat launch
document.addEventListener("DOMContentLoaded", () => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const container = qs(".listings-wrap");
  const currentUserId = container?.dataset.currentUser || "";

  function buildParams() {
    const url = new URL(location.href);
    const p = new URLSearchParams(url.search);

    const q = qs("#q")?.value?.trim();
    if (q) p.set("search", q);
    else p.delete("search");

    const activeSort = qs(".sort-opt.active")?.dataset.sort;
    if (activeSort) p.set("sort", activeSort);
    else p.delete("sort");

    const checkboxGroups = {};
    qsa(".filters input[name], .filters select[name]").forEach((el) => {
      if (el.type === "radio") {
        if (el.checked) {
          if (el.value) p.set(el.name, el.value);
          else p.delete(el.name);
        }
      } else if (el.type === "checkbox") {
        if (el.checked) {
          checkboxGroups[el.name] = checkboxGroups[el.name] || [];
          checkboxGroups[el.name].push(el.value);
        }
      } else if (el.value) {
        p.set(el.name, el.value);
      } else {
        p.delete(el.name);
      }
    });
    Object.entries(checkboxGroups).forEach(([name, values]) => {
      if (values.length) p.set(name, values.join(","));
      else p.delete(name);
    });

    p.delete("page");
    return p.toString();
  }

  // sort buttons
  qsa(".sort-opt").forEach((b) => {
    b.addEventListener("click", () => {
      qsa(".sort-opt").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const q = buildParams();
      location.href = location.pathname + (q ? "?" + q : "");
    });
  });

  // project creation modal
  const createBtn = qs("#btncreate");
  const modal = qs("#projectModal");
  const form = qs("#projectForm");
  if (createBtn && modal && form) {
    const closeModal = () => {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    };
    createBtn.addEventListener("click", () => {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
    modal.querySelectorAll("[data-close]").forEach((btn) =>
      btn.addEventListener("click", closeModal)
    );
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = qs("#pTitle")?.value?.trim();
      const description = qs("#pDesc")?.value?.trim();
      const budgetMin = qs("#pBudgetMin")?.value;
      const budgetMax = qs("#pBudgetMax")?.value;
      const skillsRaw = qs("#pSkills")?.value || "";
      const deadline = qs("#pDeadline")?.value;
      if (!title || !description) return;
      const maxDigits = 12;
      if (budgetMin && budgetMin.replace(/\D/g, "").length > maxDigits) {
        alert("Бюджет 'от' слишком большой, максимум 12 цифр.");
        return;
      }
      if (budgetMax && budgetMax.replace(/\D/g, "").length > maxDigits) {
        alert("Бюджет 'до' слишком большой, максимум 12 цифр.");
        return;
      }
      const payload = {
        title,
        description,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        deadline: deadline ? Number(deadline) : null,
        skills: skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/projects/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`create_failed_${res.status}: ${t}`);
        }
        closeModal();
        location.reload();
      } catch (err) {
        console.error("Failed to create project", err);
        alert("Не удалось создать проект. Войдите и попробуйте снова.");
      }
    });
  }

  // Apply -> show chat btn
  qsa(".btn-apply").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".card");
      const chat = card?.querySelector(".btn-chat");
      const projectId = card?.dataset.projectId;
      const ownerId = card?.dataset.ownerId;
       // запрет отклика на свой проект
      if (ownerId && currentUserId && ownerId === currentUserId) {
        btn.disabled = true;
        return;
      }
      if (!ownerId) {
        btn.disabled = true;
        return;
      }
      if (chat) {
        chat.style.display = "";
        chat.href = projectId ? `/messages/?project=${projectId}` : "/messages/";
        chat.dataset.ownerId = ownerId || "";
        chat.textContent = "Чат";
      }
      btn.textContent = "Отклик отправлен";
      btn.disabled = true;
    });
  });

  // Chat -> ensure chat exists then open
  qsa(".btn-chat").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const card = btn.closest(".card");
      const projectId = card?.dataset.projectId;
      let ownerId = btn.dataset.ownerId || card?.dataset.ownerId;
      if (ownerId && currentUserId && ownerId === currentUserId) {
        e.preventDefault();
        return;
      }
      if (!projectId) return;
      e.preventDefault();
      if (!ownerId) {
        // подтянуть владельца проекта через API, если не передан в разметке
        try {
          const resProj = await fetch(`/api/projects/${projectId}/`, { credentials: "include" });
          if (resProj.ok) {
            const proj = await resProj.json();
            ownerId = proj.owner || proj.owner_id;
          }
        } catch (_) {}
      }
      if (!ownerId) {
        alert("У проекта нет владельца, чат недоступен.");
        return;
      }
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/chats/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ participant_id: ownerId, project: projectId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "chat_create_failed");
        const chatId = data?.id;
        window.location.href = chatId
          ? `/messages/?chat=${chatId}`
          : `/messages/?project=${projectId}`;
      } catch (err) {
        alert("Не удалось создать чат. У проекта должен быть владелец и вы должны быть авторизованы.");
        window.location.href = `/messages/?project=${projectId}`;
      }
    });
  });

  // search/filter controls
  qs("#do-search")?.addEventListener("click", () => {
    const q = buildParams();
    location.href = location.pathname + (q ? "?" + q : "");
  });
  qs("#q")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = buildParams();
      location.href = location.pathname + (q ? "?" + q : "");
    }
  });
  qs("#apply-filters")?.addEventListener("click", () => {
    const q = buildParams();
    location.href = location.pathname + (q ? "?" + q : "");
  });
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
