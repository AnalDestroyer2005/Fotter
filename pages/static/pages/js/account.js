(() => {

const container = document.querySelector(".main-container.account");

  if (!container) return;



  const API = {

    performer: (id) => `/api/performers/${id}/`,

    services: (owner) => `/api/services/?owner=${owner}`,

    serviceDetail: (id) => `/api/services/${id}/`,

    portfolioList: (owner) => `/api/portfolio/?owner=${owner}`,

    portfolioDetail: (id) => `/api/portfolio/${id}/`,

    portfolioCreate: "/api/portfolio/",

    reviews: (target) => `/api/reviews/?target=${target}`,

    skills: "/api/skills/",

    customSkills: "/api/custom-skills/",

    me: "/api/me/",

  };



  const state = {

    profileId: null,

    isOwner: false,

    performer: null,

    services: [],

    portfolio: [],

    reviews: [],

    skillsCatalog: [],

    customSkills: [],

    me: null,

    servicesEditing: false,

    skillsEditing: false,

    editingPortfolioId: null,

  };



  let portfolioData = [];

  let currentProject = 0;

  let currentSlide = 0;



  const qs = (s, root = document) => root.querySelector(s);

  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));

  const ONLINE_WINDOW_MIN = 5;
  const DEFAULT_AVATAR = "/static/pages/img/avatar-default.svg";



  function formatDate(dateValue) {

    if (!dateValue) return "";

    const parsed = new Date(dateValue);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleDateString("ru-RU", {

      day: "2-digit",

      month: "short",

      year: "numeric",

    });

  }



  function computeOnline(lastSeen, explicitFlag) {

    if (typeof explicitFlag === "boolean") return explicitFlag;

    if (!lastSeen) return false;

    const ts = new Date(lastSeen).getTime();

    if (Number.isNaN(ts)) return false;

    return Date.now() - ts <= ONLINE_WINDOW_MIN * 60 * 1000;

  }



  function iconForAward(code) {

    switch (code) {

      case "orders_5":

        return '<i class="ri-medal-line"></i>';

      case "year_with_us":

        return '<i class="ri-trophy-line"></i>';

      default:

        return '<i class="ri-award-line"></i>';

    }

  }



  function authHeader() {

    const token = localStorage.getItem("access_token");

    return token ? { Authorization: `Bearer ${token}` } : {};

  }



  async function fetchJson(url, options = {}) {

    const headers = { Accept: "application/json", ...authHeader(), ...(options.headers || {}) };

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) throw new Error(`Request failed: ${res.status}`);

    return res.json();

  }



  function unwrapList(payload) {

    if (Array.isArray(payload)) return payload;

    if (payload && Array.isArray(payload.results)) return payload.results;

    return [];

  }



  async function loadCurrentUser() {

    try {

      state.me = await fetchJson(API.me);

    } catch {

      state.me = null;

    }

  }



  async function detectProfileId() {

    const params = new URLSearchParams(window.location.search);

    const paramId = params.get("user") || params.get("id");

    const dataUserId = container.dataset.userId;

    const fromUser = paramId || dataUserId;

    if (fromUser) {

      state.profileId = fromUser;

      return;

    }

    if (!state.me) await loadCurrentUser();

    state.profileId = state.me?.id || null;

  }



  async function loadPerformer() {

    if (!state.profileId) return;

    try {

      state.performer = await fetchJson(API.performer(state.profileId));

    } catch {

      state.performer = null;

    }

    state.isOwner = !!(state.me?.id && String(state.me.id) === String(state.profileId));

    if (state.performer) {

      renderProfileHeader();
      updateOwnerControls();

    } else if (state.isOwner && state.me) {

      state.performer = state.me;

      renderProfileHeader();
      updateOwnerControls();

    } else {
      updateOwnerControls();
    }

  }



  

  function renderProfileHeader() {
    if (!state.performer) return;

    const fullName = [state.performer.first_name, state.performer.last_name].filter(Boolean).join(" " ).trim();
    const name = fullName || state.performer.username || "";
    const avatarEl = qs("#accAvatar");
    const nameEl = qs("#accName");
    const bioEl = qs("#availabilityText");
    const availabilityEl = qs("#availabilityText");
    const bioText = state.performer.bio || "Информация пока не заполнена.";
    const joinedEl = qs("#accJoined");
    const onlineEl = qs("#accOnline");
    const awardsEl = qs("#accAwards");

    if (nameEl) nameEl.textContent = name || "-";
    if (bioEl) bioEl.textContent = bioText;
    if (availabilityEl) availabilityEl.textContent = bioText;

    if (avatarEl) {
      const avatarUrl = state.performer.avatar || DEFAULT_AVATAR;
      avatarEl.style.backgroundImage = `url(${avatarUrl})`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.textContent = "";
    }

    if (joinedEl) {
      const joinedDate = state.performer.date_joined || state.performer.joined_at;
      const formatted = formatDate(joinedDate);
      joinedEl.textContent = formatted ? `\u041d\u0430 FOTTER \u0441 ${formatted}` : "\u041d\u0430 FOTTER \u0441 —";
    }

    if (onlineEl) {
      const onlineCalculated = computeOnline(
        state.performer.last_seen || state.performer.last_login,
        state.performer.is_online
      );
      const online = state.isOwner ? true : onlineCalculated;
      onlineEl.textContent = online ? "\u041e\u043d\u043b\u0430\u0439\u043d" : "\u041e\u0444\u0444\u043b\u0430\u0439\u043d";
      onlineEl.classList.toggle("offline", !online);
      onlineEl.classList.toggle("online", online);
    }

    if (awardsEl) {
      const awards = Array.isArray(state.performer.awards) ? state.performer.awards : [];
      if (!awards.length) {
        awardsEl.innerHTML = "";
      } else {
        awardsEl.innerHTML = awards
          .map(
            (award) => `
          <div class="award-icon" title="${award.reason || award.title || ""}" aria-label="${award.reason || award.title || ""}">
            ${iconForAward(award.code)}
          </div>`
          )
          .join("");
      }
    }

    const skillNames =
      state.performer.skills && state.performer.skills.length
        ? state.performer.skills
        : state.isOwner && state.me?.user_skills
          ? state.me.user_skills.map((us) => us.skill?.name).filter(Boolean)
          : [];
    renderSkillTags(skillNames.concat(state.customSkills.map((c) => c.name || c)));

    const statPortfolio = qs("#statDone");
    const completedOrders = state.performer.completed_orders ?? state.performer.portfolio_count;
    if (statPortfolio) statPortfolio.textContent = completedOrders ?? "0";
  }

  function updateOwnerControls() {
    const owner = !!state.isOwner;
    // hide all edit buttons and uploader if not owner
    document.querySelectorAll(".edit-btn, #btnAddWork, .avatar-upload-btn").forEach((el) => {
      if (!owner) {
        el.style.display = "none";
      } else {
        el.style.display = "";
      }
    });
    // hide bio editor buttons
    const bioBox = qs("#bioEditBox");
    if (!owner && bioBox) bioBox.style.display = "none";
  }



  async function loadServices() {

    if (!state.profileId) return;

    const data = await fetchJson(API.services(state.profileId));

    state.services = unwrapList(data);

    renderServices();

  }



  function renderServices() {
    const grid = qs("#servicesGrid");
    if (!grid) return;

    const serviceCards = state.services
      .map(
        (s) => `
      <div class="service-card" data-service-id="${s.id}">
        <div class="service-icon">
          ${
            s.icon
              ? `<img src="${s.icon}" alt="${s.title}" style="width:40px;height:40px;object-fit:cover;">`
              : '<i class="ri-briefcase-line"></i>'
          }
        </div>
        <div class="service-name">${s.title}</div>
        <p class="service-description">${s.description || ""}</p>
        ${
          state.isOwner && state.servicesEditing
            ? `<div class="service-actions">
                 <button data-action="edit-service" data-id="${s.id}" class="action-btn"><i class="ri-pencil-line"></i></button>
                 <button data-action="delete-service" data-id="${s.id}" class="action-btn delete"><i class="ri-delete-bin-line"></i></button>
              </div>`
            : ""
        }
      </div>`
      )
      .join("");

    const addFormHtml =
      state.isOwner && state.servicesEditing
        ? `
        <div class="service-card add-card">
          <form id="serviceAddForm">
            <input type="text" id="serviceTitle" class="form-input" placeholder="\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0443\u0441\u043b\u0443\u0433\u0438" required />
            <textarea id="serviceDesc" class="form-textarea" placeholder="\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435"></textarea>
            <button type="submit" class="btn btn-primary" style="margin-top:8px">\u0421\u043e\u0437\u0434\u0430\u0442\u044c</button>
          </form>
        </div>`
        : "";

    if (!state.services.length && !state.servicesEditing) {
      grid.innerHTML = '<div class="service-card"><div class="service-name">\u041d\u0435\u0442 \u0443\u0441\u043b\u0443\u0433</div></div>';
      return;
    }

    grid.innerHTML = serviceCards + addFormHtml;

    if (!state.isOwner || !state.servicesEditing) return;

    grid.querySelectorAll("[data-action='edit-service']").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const srv = state.services.find((s) => String(s.id) === String(id));
        if (!srv) return;
        openServiceModal({
          title: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0443\u0441\u043b\u0443\u0433\u0443",
          initial: srv,
          onSubmit: async (values, close) => {
            try {
              await fetch(API.serviceDetail(id), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeader() },
                body: JSON.stringify(values),
              });
              close();
              await loadServices();
            } catch (err) {
              console.error("Failed to update service", err);
            }
          },
        });
      });
    });

    grid.querySelectorAll("[data-action='delete-service']").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const srv = state.services.find((s) => String(s.id) === String(id));
        if (!srv) return;
        openConfirm({
          title: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0441\u043b\u0443\u0433\u0443",
          message: srv.title || "\u0423\u0441\u043b\u0443\u0433\u0430",
          onConfirm: async (close) => {
            try {
              await fetch(API.serviceDetail(id), { method: "DELETE", headers: authHeader() });
              close();
              await loadServices();
            } catch (err) {
              console.error("Failed to delete service", err);
            }
          },
        });
      });
    });

    const addForm = grid.querySelector("#serviceAddForm");
    if (addForm) {
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = addForm.querySelector("#serviceTitle")?.value?.trim();
        const description = addForm.querySelector("#serviceDesc")?.value?.trim() || "";
        if (!title) return;
        try {
          await fetch("/api/services/", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ title, description }),
          });
          addForm.reset();
          await loadServices();
        } catch (err) {
          console.error("Failed to create service", err);
        }
      });
    }
  }


  async function loadPortfolio() {

    if (!state.profileId) return;

    const data = await fetchJson(API.portfolioList(state.profileId));

    state.portfolio = unwrapList(data);

    portfolioData = state.portfolio;

    renderPortfolioGrid();

  }



  function renderPortfolioGrid() {
    const grid = qs("#portfolioGrid");
    if (!grid) return;

    if (!portfolioData.length) {
      grid.innerHTML = '<div class="empty">\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0440\u0430\u0431\u043e\u0442.</div>';
      return;
    }

    grid.innerHTML = portfolioData
      .map((item, idx) => {
        const cover = item.images?.[0]?.image;
        return `
        <div class="portfolio-item" data-idx="${idx}">
          <div class="portfolio-thumb">
            ${
              cover
                ? `<img src="${cover}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`
                : '<i class="ri-image-line"></i>'
            }
          </div>
          <div class="portfolio-info">
            <div class="portfolio-title">${item.title}</div>
            <div class="portfolio-desc">${(item.description || "").slice(0, 80)}${
          item.description && item.description.length > 80 ? "..." : ""
        }</div>
          </div>
        </div>`;
      })
      .join("");

    qsa(".portfolio-item", grid).forEach((card) => {
      card.addEventListener("click", () => openModal(Number(card.dataset.idx)));
    });
  }



  function renderModalGallery(item) {

    const gallery = qs(".modal-gallery");

    if (!gallery) return;

    const slides = item.images?.length ? item.images : [null];



    const slidesHtml = slides

      .map(

        (img, i) =>

          `<div class="gallery-slide ${i === 0 ? "active" : ""}">

            ${

              img && img.image

                ? `<img src="${img.image}" alt="${item.title}" style="width:100%;height:100%;object-fit:contain;">`

                : '<i class="ri-image-line"></i>'

            }

          </div>`

      )

      .join("");

    const indicators = slides

      .map(

        (_, i) =>

          `<span class="indicator ${i === 0 ? "active" : ""}" data-goto="${i}"></span>`

      )

      .join("");



    gallery.innerHTML = `

      ${slidesHtml}

      <div class="gallery-nav">

        <button class="gallery-btn" data-slide="-1"><i class="ri-arrow-left-s-line"></i></button>

        <button class="gallery-btn" data-slide="1"><i class="ri-arrow-right-s-line"></i></button>

      </div>

      <div class="gallery-indicators">

        ${indicators}

      </div>

    `;



    bindModalControls();

  }



  function updateModalContent() {

    const project = portfolioData[currentProject];

    if (!project) return;



    qs("#mTitle") && (qs("#mTitle").textContent = project.title || "");

    qs("#mDesc") && (qs("#mDesc").textContent = project.description || "");

    qs("#mDate") && (qs("#mDate").textContent = project.created_at?.split("T")[0] || "");

    qs("#mDuration") && (qs("#mDuration").textContent = project.external_url || "");

            qs("#mViews") && (qs("#mViews").textContent = project.images?.length ? `${project.images.length} \u0444\u043e\u0442\u043e` : "\u2014");

    const tagsContainer = qs("#mTags");

    if (tagsContainer) tagsContainer.innerHTML = "";



    renderModalGallery(project);

    updateProjectNavButtons();

    goToSlide(0);

  }



  function updateProjectNavButtons() {

    const prevBtn = qs(".project-nav-btn.prev");

    const nextBtn = qs(".project-nav-btn.next");

    if (prevBtn) prevBtn.disabled = currentProject === 0;

    if (nextBtn) nextBtn.disabled = currentProject >= portfolioData.length - 1;

  }



  function openModal(projectIndex) {

    currentProject = projectIndex;

    currentSlide = 0;

    updateModalContent();

    const modal = qs("#portfolioModal");

    if (modal) {

      modal.classList.add("active");

      document.body.style.overflow = "hidden";

    }

    qs("#modalView")?.setAttribute("style", "display:block");

    qs("#modalEdit")?.setAttribute("style", "display:none");

  }



  function closeModal() {

    const modal = qs("#portfolioModal");

    if (modal) {

      modal.classList.remove("active");

      document.body.style.overflow = "auto";

    }

  }



  function changeSlide(direction) {

    const slides = qsa(".gallery-slide");

    const indicators = qsa(".indicator");

    if (!slides.length) return;

    currentSlide += direction;

    if (currentSlide < 0) currentSlide = slides.length - 1;

    if (currentSlide >= slides.length) currentSlide = 0;



    slides.forEach((slide, idx) => slide.classList.toggle("active", idx === currentSlide));

    indicators.forEach((indicator, idx) => indicator.classList.toggle("active", idx === currentSlide));

  }



  function goToSlide(index) {

    currentSlide = index;

    const slides = qsa(".gallery-slide");

    const indicators = qsa(".indicator");

    slides.forEach((slide, i) => slide.classList.toggle("active", i === index));

    indicators.forEach((indicator, i) => indicator.classList.toggle("active", i === index));

  }



  function changeProject(direction) {

    const newIndex = currentProject + direction;

    if (newIndex >= 0 && newIndex < portfolioData.length) {

      currentProject = newIndex;

      updateModalContent();

    }

  }



  function bindModalControls() {

    qsa("[data-slide]").forEach((btn) => {

      btn.onclick = () => changeSlide(Number(btn.dataset.slide) || 0);

    });

    qsa("[data-goto]").forEach((indicator) => {

      indicator.onclick = () => goToSlide(Number(indicator.dataset.goto) || 0);

    });

  }



  async function loadReviews() {

    if (!state.profileId) return;

    const data = await fetchJson(API.reviews(state.profileId));

    state.reviews = unwrapList(data);

    renderReviews();

  }



  function renderReviews() {
    const listEl = qs("#reviewsList");
    const count = state.reviews.length;
    const avg = count
      ? (state.reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / count).toFixed(1)
      : "0.0";

    qs("#ratingNumber") && (qs("#ratingNumber").textContent = avg);
    qs("#ratingNumberLg") && (qs("#ratingNumberLg").textContent = avg);
    qs("#ratingCount") && (qs("#ratingCount").textContent = `Отзывов: ${count}`);
    qs("#statReviews") && (qs("#statReviews").textContent = count);

    if (!listEl) return;
    if (!count) {
      listEl.innerHTML = '<div class="empty">Нет отзывов</div>';
      return;
    }

    listEl.innerHTML = state.reviews
      .map(
        (r) => `
      <div class="review-card">
        <div class="review-head">
          <strong>${r.author_username || r.author}</strong>
          <span class="rating">${r.rating}★</span>
          <span class="date">${(r.created_at || "").split("T")[0]}</span>
        </div>
        <p>${r.text || ""}</p>
      </div>`
      )
      .join("");
  }

  async function loadSkillsCatalog() {

    try {

      const data = await fetchJson(API.skills);

      state.skillsCatalog = unwrapList(data);

    } catch {

      state.skillsCatalog = [];

    }

  }



  async function loadCustomSkills() {

    if (!state.isOwner) return;

    try {

      const data = await fetchJson(API.customSkills);

      state.customSkills = unwrapList(data);

    } catch {

      state.customSkills = [];

    }

  }

  function setupAvatarUploader() {
    const input = qs("#accAvatarInput");
    const avatarEl = qs("#accAvatar");
    if (!input) return;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("avatar", file);
      try {
        const res = await fetch(API.me, { method: "PATCH", headers: { ...authHeader() }, body: fd });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Avatar upload failed ${res.status}: ${errText}`);
        }
        await loadCurrentUser();
        await loadPerformer();
        if (avatarEl) {
          const url = state.performer?.avatar || DEFAULT_AVATAR;
          avatarEl.style.backgroundImage = `url(${url})`;
          avatarEl.style.backgroundSize = "cover";
          avatarEl.textContent = "";
        }
      } catch (err) {
        console.error("Failed to upload avatar", err);
      } finally {
        input.value = "";
      }
    });
  }

  function setupBioEditor() {
    const btn = qs("#bioEditBtn");
    const box = qs("#bioEditBox");
    const input = qs("#bioInput");
    const textEl = qs("#availabilityText");
    if (!btn || !box || !input || !textEl || !state.isOwner) return;
    let editing = false;

    const close = () => {
      editing = false;
      box.style.display = "none";
      btn.style.display = "";
    };

    btn.addEventListener("click", () => {
      editing = true;
      btn.style.display = "none";
      box.style.display = "flex";
      input.value = state.performer?.bio || state.me?.bio || "";
      input.focus();
    });

    qs("#bioCancel")?.addEventListener("click", close);

    qs("#bioSave")?.addEventListener("click", async () => {
      const bio = input.value.trim();
      try {
        const res = await fetch(API.me, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ bio }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Save bio failed ${res.status}: ${errText}`);
        }
        await loadCurrentUser();
        await loadPerformer();
        textEl.textContent = bio || "Информация пока не заполнена.";
        close();
      } catch (err) {
        console.error("Failed to save bio", err);
      }
    });
  }



  function renderSkillTags(skills) {

    const box = qs("#skillsTags");

    if (!box) return;

    box.innerHTML = (skills || []).map((name) => `<span class="tag">${name}</span>`).join("");

  }



  function setupSkillsEditor() {
    const box = qs("#skillsTags");
    const btn = box?.closest(".section-block")?.querySelector(".edit-btn");
    if (!box || !btn) return;
    if (!state.isOwner) {
      btn.style.display = "none";
      return;
    }

    const inputId = "skillInput";
    const suggestionsBoxId = "skillsSuggestions";

    const ensureRemover = (tagEl) => {
      if (tagEl.querySelector(".tag-remove")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-remove";
      btn.setAttribute("aria-label", "??????? ?????");
      btn.textContent = "?";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        tagEl.remove();
      });
      tagEl.appendChild(btn);
    };

    const makeInput = () => {
      const input = document.createElement("input");
      input.id = inputId;
      input.type = "text";
      input.className = "tag-input-field";
      input.placeholder = "??????? ??????? ?????";
      const listId = "skillsCatalogList";
      input.setAttribute("list", listId);
      if (!document.getElementById(listId)) {
        const dl = document.createElement("datalist");
        dl.id = listId;
        dl.innerHTML = state.skillsCatalog.map((s) => `<option value="${s.name}">`).join("");
        document.body.appendChild(dl);
      }
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const value = input.value.trim();
          if (value) {
            const tag = createSkillTag(value);
            box.insertBefore(tag, input);
            input.value = "";
          }
        }
      };
      return input;
    };

    if (!box.__skillsDelegated) {
      box.addEventListener("click", (e) => {
        if (!state.skillsEditing) return;
        const removeBtn = e.target.closest(".tag-remove");
        if (removeBtn) {
          e.preventDefault();
          removeBtn.closest(".tag")?.remove();
        }
      });
      box.__skillsDelegated = true;
    }

    btn.addEventListener("click", async () => {
      state.skillsEditing = !state.skillsEditing;
      btn.innerHTML = `<i class="ri-${state.skillsEditing ? "check" : "pencil"}-line"></i>${state.skillsEditing ? "??????" : "?????????????"}`;

      if (state.skillsEditing) {
        const input = makeInput();
        if (input) box.appendChild(input);
        box.classList.add("is-editing");
        let sugg = qs(`#${suggestionsBoxId}`);
        if (!sugg) {
          sugg = document.createElement("div");
          sugg.id = suggestionsBoxId;
          sugg.className = "tags-suggestions";
          box.parentElement?.appendChild(sugg);
        }
        const topSkills = state.skillsCatalog.slice(0, 20);
        sugg.innerHTML = topSkills
          .map((s) => `<button class="tag suggestion" data-skill-name="${s.name}">${s.name}</button>`)
          .join("");
        sugg.querySelectorAll("button[data-skill-name]").forEach((btnEl) => {
          btnEl.addEventListener("click", () => {
            const name = btnEl.dataset.skillName;
            if (!name) return;
            const existing = qsa(".tag", box).some((t) => t.dataset.name === name);
            if (!existing) {
              const tag = createSkillTag(name);
              box.insertBefore(tag, input);
            }
          });
        });
        qsa(".tag", box).forEach((tag) => {
          tag.classList.add("editable");
          ensureRemover(tag);
        });
      } else {
        const names = Array.from(
          new Set(
            qsa(".tag", box)
              .filter((tag) => !tag.classList.contains("suggestion"))
              .map((tag) => {
                if (!tag.dataset.name) {
                  tag.dataset.name = tag.textContent.replace("?", "").trim();
                }
                return tag.dataset.name;
              })
              .filter(Boolean)
          )
        );
        box.querySelector(`#${inputId}`)?.remove();
        qs(`#${suggestionsBoxId}`)?.remove();
        qsa(".tag", box).forEach((tag) => {
          tag.onclick = null;
          tag.classList.remove("editable");
          tag.querySelector(".tag-remove")?.remove();
        });
        await saveSkills(names);
      }
    });
  };



    

  function createSkillTag(text) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.dataset.name = text;
    tag.textContent = text;
    if (!tag.querySelector(".tag-remove")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-remove";
      btn.setAttribute("aria-label", "??????? ?????");
      btn.textContent = "?";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        tag.remove();
      });
      tag.appendChild(btn);
    }
    return tag;
  }



  async function saveSkills(names) {
    const map = new Map(state.skillsCatalog.map((s) => [s.name.toLowerCase(), s.id]));
    const skillIds = new Set();
    const customNames = new Set();

    names.forEach((name) => {
      const key = name.toLowerCase();
      if (map.has(key)) {
        skillIds.add(map.get(key));
      } else {
        customNames.add(name);
      }
    });

    try {
    const res = await fetch(API.me, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({
        skills: Array.from(skillIds),
        custom_skills: Array.from(customNames),
      }),
    });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Save skills failed ${res.status}: ${errText}`);
      }

      await loadCustomSkills();
      await loadCurrentUser();
      await loadPerformer();

      const skillNames =
        state.performer?.skills?.length
          ? state.performer.skills
          : state.me?.user_skills?.map((us) => us.skill?.name).filter(Boolean) || [];
      const merged = Array.from(new Set(skillNames.concat(state.customSkills.map((c) => c.name || c))));
      renderSkillTags(merged);
    } catch (e) {
      console.error("Failed to save skills", e);
    }
  }



  function setupTabs() {

    const tabItems = qsa(".tab-item");

    const tabContents = qsa(".tab-content");

    tabItems.forEach((tab) => {

      tab.addEventListener("click", () => {

        const targetTab = tab.getAttribute("data-tab");

        tabItems.forEach((t) => t.classList.remove("active"));

        tabContents.forEach((c) => c.classList.remove("active"));

        tab.classList.add("active");

        qs(`#${targetTab}-content`)?.classList.add("active");

      });

    });

  }



  function setupFilters() {

    qsa(".filter-chip").forEach((chip) => {

      chip.addEventListener("click", () => {

        const parent = chip.parentElement;

        parent?.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));

        chip.classList.add("active");

      });

    });

  }



  function setupModalListeners() {

    qs("[data-close]")?.addEventListener("click", closeModal);

    qs("#portfolioModal")?.addEventListener("click", (e) => {

      if (e.target.id === "portfolioModal") closeModal();

    });

    qs(".project-nav-btn.prev")?.addEventListener("click", () => changeProject(-1));

    qs(".project-nav-btn.next")?.addEventListener("click", () => changeProject(1));

    qsa("[data-slide]").forEach((btn) => {

      btn.addEventListener("click", () => changeSlide(Number(btn.dataset.slide) || 0));

    });

    qsa("[data-goto]").forEach((indicator) => {

      indicator.addEventListener("click", () => goToSlide(Number(indicator.dataset.goto) || 0));

    });

    document.addEventListener("keydown", (e) => {

      if (e.key === "Escape") closeModal();

      if (e.key === "ArrowLeft") changeSlide(-1);

      if (e.key === "ArrowRight") changeSlide(1);

    });

  }



  function setupPortfolioEditor() {

    const addWorkBtn = qs("#btnAddWork");

    const editForm = qs("#editForm");

    const modalView = qs("#modalView");

    const modalEdit = qs("#modalEdit");



    if (!state.isOwner) {

      if (addWorkBtn) addWorkBtn.style.display = "none";

      if (modalEdit) modalEdit.style.display = "none";

      return;

    }



    if (addWorkBtn) {

      addWorkBtn.addEventListener("click", () => {

        state.editingPortfolioId = null;

        qs("#portfolioModal")?.classList.add("active");

        if (modalView) modalView.style.display = "none";

        if (modalEdit) modalEdit.style.display = "block";

        document.body.style.overflow = "hidden";

        editForm?.reset();

      });

    }



    if (editForm) {

      if (!qs("#eImages", editForm)) {
        const grp = document.createElement("div");
        grp.className = "form-group";
        grp.innerHTML = `
          <label class="form-label">Изображения (до 10)</label>
          <input id="eImages" name="images" type="file" class="form-input" accept="image/*" multiple>
        `;
        editForm.appendChild(grp);
      }

editForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const title = qs("#eTitle")?.value?.trim();

        const description = qs("#eDesc")?.value?.trim();

        const imagesInput = qs("#eImages");

        if (!title) return;



        const files = imagesInput?.files ? Array.from(imagesInput.files) : [];

        const hasFiles = files.length > 0;

        const fd = new FormData();

        fd.append("title", title);

        if (description) fd.append("description", description);

        files.slice(0, 10).forEach((file) => fd.append("images", file));



        const url = state.editingPortfolioId ? API.portfolioDetail(state.editingPortfolioId) : API.portfolioCreate;

        const method = state.editingPortfolioId ? "PATCH" : "POST";

        const options = {

          method,

          headers: hasFiles ? { ...authHeader() } : { "Content-Type": "application/json", ...authHeader() },

          body: hasFiles ? fd : JSON.stringify({ title, description }),

        };



        try {

          await fetch(url, options);

          state.editingPortfolioId = null;

          await loadPortfolio();

          closeModal();

        } catch (err) {

          console.error("Failed to save portfolio item", err);

        }

      });

    }



    qs("#eCancel")?.addEventListener("click", (e) => {

      e.preventDefault();

      closeModal();

    });



    qs("#mEdit")?.addEventListener("click", () => {

      if (!state.isOwner) return;

      const item = portfolioData[currentProject];

      if (!item) return;

      state.editingPortfolioId = item.id;

      qs("#portfolioModal")?.classList.add("active");

      if (modalView) modalView.style.display = "none";

      if (modalEdit) modalEdit.style.display = "block";

      document.body.style.overflow = "hidden";

      qs("#eTitle") && (qs("#eTitle").value = item.title || "");

      qs("#eDesc") && (qs("#eDesc").value = item.description || "");

    });



    qs("#mDelete")?.addEventListener("click", async () => {

      if (!state.isOwner) return;

      const item = portfolioData[currentProject];

      if (!item) return;

      if (!confirm("\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443?")) return;

      try {

        await fetch(API.portfolioDetail(item.id), { method: "DELETE", headers: authHeader() });

        await loadPortfolio();

        closeModal();

      } catch (err) {

        console.error("Failed to delete portfolio item", err);

      }

    });

  }



  async function init() {

    setupTabs();

    setupFilters();

    setupModalListeners();



    await loadCurrentUser();

    await detectProfileId();

    if (!state.profileId) return;



    await loadSkillsCatalog();

    await Promise.allSettled([loadPerformer(), loadServices(), loadPortfolio(), loadReviews(), loadCustomSkills()]);



    setupAvatarUploader();
    setupBioEditor();
    setupSkillsEditor();
    setupPortfolioEditor();



    // services editor toggle

    const servicesBtn = qs("#servicesGrid")?.closest(".section-block")?.querySelector(".edit-btn");

    if (servicesBtn) {

      servicesBtn.addEventListener("click", () => {

        if (!state.isOwner) return;

        state.servicesEditing = !state.servicesEditing;

        const editOn = "\u0413\u043e\u0442\u043e\u0432\u043e";
        const editOff = "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c";
        servicesBtn.innerHTML = `<i class="ri-${state.servicesEditing ? "check" : "pencil"}-line"></i>${state.servicesEditing ? editOn : editOff}`;

        renderServices();

      });

    }

  }



  document.addEventListener("DOMContentLoaded", init);

})();



// ------- Modals for services -------

function ensureModalStyles() {

  if (document.getElementById("account-modal-styles")) return;

  const style = document.createElement("style");

  style.id = "account-modal-styles";

  style.textContent = `

  .account-modal-backdrop { position: fixed; inset:0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index: 1000; }

  .account-modal { background:#fff; border-radius:12px; padding:20px; width: min(420px, 90vw); box-shadow: 0 12px 32px rgba(0,0,0,0.2); }

  .account-modal h3 { margin:0 0 12px; font-size:18px; }

  .account-modal .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:16px; }

  .account-modal .btn-primary { background:#111; color:#fff; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; }

  .account-modal .btn-secondary { background:#eee; color:#333; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; }

  .account-modal label { display:block; margin-bottom:6px; font-size:14px; color:#333; }

  .account-modal input, .account-modal textarea { width:100%; box-sizing:border-box; padding:8px 10px; border-radius:8px; border:1px solid #ddd; }

  .account-modal textarea { min-height:90px; resize:vertical; }

  `;

  document.head.appendChild(style);

}



function openServiceModal({ title, initial = {}, onSubmit }) {
  ensureModalStyles();
  const backdrop = document.createElement("div");
  backdrop.className = "account-modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "account-modal";
  modal.innerHTML = `
    <h3>${title || "\u0423\u0441\u043b\u0443\u0433\u0430"}</h3>
    <div class="form-group">
      <label>\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0443\u0441\u043b\u0443\u0433\u0438</label>
      <input type="text" id="svcTitle" value="${initial.title || ""}" required />
    </div>
    <div class="form-group">
      <label>\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435</label>
      <textarea id="svcDesc">${initial.description || ""}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>\u041e\u0442\u043c\u0435\u043d\u0430</button>
      <button class="btn-primary" data-save>\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  modal.querySelector("[data-close]")?.addEventListener("click", close);
  modal.querySelector("[data-save]")?.addEventListener("click", () => {
    const titleVal = modal.querySelector("#svcTitle")?.value?.trim();
    const descVal = modal.querySelector("#svcDesc")?.value?.trim() || "";
    if (!titleVal) return;
    onSubmit && onSubmit({ title: titleVal, description: descVal }, close);
  });
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
}

function openConfirm({ title = "Подтвердите действие", message = "", onConfirm }) {
  ensureModalStyles();
  const backdrop = document.createElement("div");
  backdrop.className = "account-modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "account-modal";
  modal.innerHTML = `
    <h3>${title}</h3>
    <p style="margin:8px 0 16px;">${message}</p>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>Отмена</button>
      <button class="btn-primary" data-ok>Ок</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  modal.querySelector("[data-close]")?.addEventListener("click", close);
  modal.querySelector("[data-ok]")?.addEventListener("click", () => { onConfirm && onConfirm(close); });
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
}
