// settings page client logic with token guard + refresh fallback
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(".settings-layout");
  if (!root) return;

  const LS_ACCESS = "access_token";
  const LS_REFRESH = "refresh_token";

  // Section switching
  const menuItems = root.querySelectorAll(".menu-item[data-section]");
  const sections = root.querySelectorAll(".settings-section");
  function activate(id) {
    if (!id) return;
    menuItems.forEach((i) => i.classList.toggle("active", i.dataset.section === id));
    sections.forEach((s) => s.classList.toggle("active", s.id === id));
  }
  menuItems.forEach((item) => item.addEventListener("click", () => activate(item.dataset.section)));
  if (!root.querySelector(".settings-section.active")) activate("profile");

  async function refreshToken(refresh) {
    const res = await fetch("/api/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error("refresh_failed");
    const data = await res.json();
    if (data.access) {
      localStorage.setItem(LS_ACCESS, data.access);
      return data.access;
    }
    throw new Error("refresh_missing_access");
  }

  async function fetchMe() {
    let access = localStorage.getItem(LS_ACCESS);
    const refresh = localStorage.getItem(LS_REFRESH);
    if (!access && !refresh) throw new Error("no_tokens");

    let resp = await fetch("/api/me/", {
      headers: access ? { Authorization: "Bearer " + access } : {},
    });
    if (resp.status === 401 && refresh) {
      access = await refreshToken(refresh);
      resp = await fetch("/api/me/", { headers: { Authorization: "Bearer " + access } });
    }
    if (!resp.ok) throw new Error("me_failed");
    return resp.json();
  }

  function renderMe(me) {
    const ava = document.getElementById("settings-avatar");
    const name = document.getElementById("settings-name");
    const email = document.getElementById("settings-email");
    const about = document.getElementById("settings-about");
    if (ava) ava.src = me.avatar || ava.dataset.default || ava.src;
    if (name) name.value = me.first_name || "";
    if (email) email.value = me.email || "";
    if (about) about.value = me.bio || "";
  }

  async function patchMe(data, isFormData = false) {
    let access = localStorage.getItem(LS_ACCESS);
    const refresh = localStorage.getItem(LS_REFRESH);
    if (!access && !refresh) throw new Error("no_tokens");

    const headers = isFormData
      ? { Authorization: access ? "Bearer " + access : "" }
      : { Authorization: access ? "Bearer " + access : "", "Content-Type": "application/json" };

    let resp = await fetch("/api/me/", {
      method: "PATCH",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });

    if (resp.status === 401 && refresh) {
      access = await refreshToken(refresh);
      const retryHeaders = isFormData
        ? { Authorization: "Bearer " + access }
        : { Authorization: "Bearer " + access, "Content-Type": "application/json" };
      resp = await fetch("/api/me/", {
        method: "PATCH",
        headers: retryHeaders,
        body: isFormData ? data : JSON.stringify(data),
      });
    }

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`save_failed_${resp.status}: ${errText}`);
    }

    const updated = await resp.json();
    renderMe(updated);
    return updated;
  }

  function setupAvatarUpload() {
    const btn = document.getElementById("settings-avatar-btn");
    const input = document.getElementById("settings-avatar-input");
    if (!btn || !input) return;
    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("avatar", file);
      try {
        await patchMe(fd, true);
      } catch (e) {
        console.error("Avatar upload failed", e);
      } finally {
        input.value = "";
      }
    });
  }

  function setupProfileEdit() {
    const name = document.getElementById("settings-name");
    const about = document.getElementById("settings-about");
    const email = document.getElementById("settings-email");
    const editBtn = document.getElementById("btn-edit-profile");
    const saveBtn = document.getElementById("btn-save-profile");
    const cancelBtn = document.getElementById("btn-cancel-profile");
    const inputs = [name, about, email];

    function setEditing(isEdit) {
      inputs.forEach((el) => {
        if (el) el.disabled = !isEdit;
      });
      if (saveBtn) saveBtn.style.display = isEdit ? "" : "none";
      if (cancelBtn) cancelBtn.style.display = isEdit ? "" : "none";
      if (editBtn) editBtn.style.display = isEdit ? "none" : "";
    }

    setEditing(false);

    if (editBtn) {
      editBtn.addEventListener("click", () => setEditing(true));
    }
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const payload = {
          first_name: name?.value?.trim() || "",
          bio: about?.value?.trim() || "",
          email: email?.value?.trim() || "",
        };
        try {
          await patchMe(payload, false);
          setEditing(false);
        } catch (e) {
          console.error("Profile save failed", e);
        }
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", async () => {
        try {
          const me = await fetchMe();
          renderMe(me);
        } catch (e) {
          console.error("Profile cancel reload failed", e);
        } finally {
          setEditing(false);
        }
      });
    }
  }

  async function changePassword(oldPass, newPass) {
    let access = localStorage.getItem(LS_ACCESS);
    const refresh = localStorage.getItem(LS_REFRESH);
    if (!access && !refresh) throw new Error("no_tokens");
    const headers = { Authorization: access ? "Bearer " + access : "", "Content-Type": "application/json" };
    let resp = await fetch("/api/password/change/", {
      method: "POST",
      headers,
      body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
    });
    if (resp.status === 401 && refresh) {
      access = await refreshToken(refresh);
      resp = await fetch("/api/password/change/", {
        method: "POST",
        headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
      });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`pwd_change_failed_${resp.status}: ${txt}`);
    }
    return resp.json();
  }

  function setupPasswordChange() {
    const btn = document.getElementById("btn-save-password");
    const oldInput = document.getElementById("curr-pass");
    const newInput = document.getElementById("new-pass");
    const repInput = document.getElementById("rep-pass");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const oldPass = oldInput?.value || "";
      const newPass = newInput?.value || "";
      const repPass = repInput?.value || "";
      if (!oldPass || !newPass || !repPass) {
        alert("Заполните все поля пароля.");
        return;
      }
      if (newPass !== repPass) {
        alert("Пароли не совпадают.");
        return;
      }
      try {
        await changePassword(oldPass, newPass);
        alert("Пароль обновлён.");
        oldInput.value = "";
        newInput.value = "";
        repInput.value = "";
      } catch (e) {
        console.error(e);
        alert("Не удалось сменить пароль. Проверьте данные.");
      }
    });
  }

  fetchMe()
    .then((me) => {
      renderMe(me);
      setupAvatarUpload();
      setupProfileEdit();
      setupPasswordChange();
    })
    .catch(() => {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace(`/auth/login/?next=${next}`);
    });
});
