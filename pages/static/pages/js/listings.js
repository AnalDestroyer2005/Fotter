// listings.js: filters + project creation + chat launch
document.addEventListener("DOMContentLoaded", () => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const container = qs(".listings-wrap");
  const currentUserId = Number(container?.dataset.currentUser || 0);

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

  async function fetchExistingChat(ownerId, projectId) {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/chats/", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) return null;
      const chats = await res.json();
      const byProject = chats.find((c) => Number(c.project) === Number(projectId) && c.partner?.id === ownerId);
      if (byProject) return byProject;
      return chats.find((c) => c.partner?.id === ownerId) || null;
    } catch (err) {
      console.warn("fallback chats load failed", err);
      return null;
    }
  }

  async function startChat(projectId, ownerId) {
    if (!currentUserId) {
      window.location.href = "/auth/login/?next=" + encodeURIComponent(location.pathname + location.search);
      return;
    }
    if (!ownerId) {
      alert("Не удалось определить собеседника.");
      return;
    }

    // Try to reuse an existing chat first to avoid backend errors.
    const existingFirst = await fetchExistingChat(ownerId, projectId);
    if (existingFirst?.id) {
      window.location.href = `/messages/?chat=${existingFirst.id}`;
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/chats/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ project: projectId, participant_id: ownerId }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = `/messages/?chat=${data.id}`;
        return;
      }
      const existing = await fetchExistingChat(ownerId, projectId);
      if (existing?.id) {
        window.location.href = `/messages/?chat=${existing.id}`;
        return;
      }
      const errText = await res.text().catch(() => "");
      throw new Error(`chat_create_failed_${res.status}_${errText}`);
    } catch (err) {
      console.error("Failed to start chat", err);
      alert("Не удалось открыть чат. Попробуйте позже.");
    }
  }

  function initProjectChatButtons() {
    if (!container || !currentUserId) return;
    qsa(".project-card", container).forEach((card) => {
      const ownerId = Number(card.dataset.ownerId || 0);
      const projectId = Number(card.dataset.projectId || 0);
      const btn = qs(".btn-chat", card);
      if (!btn || !ownerId || ownerId === Number(currentUserId)) return;
      btn.style.display = "inline-flex";
      btn.textContent = "Написать";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        startChat(projectId, ownerId);
      });
    });
  }

  function initFreelancerChatButtons() {
    if (!container || !currentUserId) return;
    qsa(".freelancer-card", container).forEach((card) => {
      const targetId = Number(card.dataset.userId || 0);
      const btn = qs(".btn-contact", card) || qs(".action-btn.solid", card);
      if (!btn || !targetId || targetId === currentUserId) return;
      btn.textContent = "Связаться";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        startChat(null, targetId);
      });
    });
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

  initProjectChatButtons();
  initFreelancerChatButtons();

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
