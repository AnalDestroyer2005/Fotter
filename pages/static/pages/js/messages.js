(() => {
  const container = document.querySelector(".messages-container");
  if (!container) return;

  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
  const currentUserId = Number(container.dataset.userId || 0);
  const url = new URL(window.location.href);
  const chatFromUrl = Number(url.searchParams.get("chat") || container.dataset.activeChat || 0) || null;
  const API = {
    chats: "/api/chats/",
    messages: (chatId) => `/api/messages/?chat=${chatId}`,
    sendMessage: "/api/messages/",
    markRead: (chatId) => `/api/chats/${chatId}/mark_read/`,
  };

  const state = {
    chats: [],
    activeChatId: chatFromUrl,
    socket: null,
  };

  const chatListEl = qs("#chatsList");
  const chatMainPanel = qs("#chatMainPanel");
  const chatInfoPanel = qs("#chatInfoPanel");

  function ensureLayout() {
    if (chatMainPanel && !qs("#messageForm", chatMainPanel)) {
      chatMainPanel.innerHTML = `
        <div class="chat-header" id="chatHeader">
          <button class="mobile-menu-btn" id="openChatList">
            <i class="ri-arrow-left-line"></i>
          </button>
          <div class="chat-user-info">
            <div class="avatar" id="chatAvatar"></div>
            <div class="user-info-text">
              <span class="user-name" id="chatUserName"></span>
              <span class="user-status" id="chatUserStatus"></span>
            </div>
          </div>
          <div class="chat-actions">
            <button class="action-btn" id="toggleInfo" aria-label="info">
              <i class="ri-information-line"></i>
            </button>
          </div>
        </div>
        <div class="messages-area" id="messagesArea"></div>
        <div class="empty-chat-state" id="emptyChatState">
          <i class="ri-chat-3-line"></i>
          <h3>Выберите чат</h3>
          <p>Начните диалог, чтобы обсудить проект.</p>
        </div>
        <form class="message-input-area" id="messageForm">
          <button type="button" class="input-icon-btn" aria-label="attach">
            <i class="ri-attachment-2"></i>
          </button>
          <div class="input-wrapper">
            <input type="text"
                   class="message-input"
                   placeholder="Напишите сообщение..."
                   id="messageInput"
                   name="text"
                   required>
            <button type="button" class="input-icon-btn" aria-label="emoji">
              <i class="ri-emotion-line"></i>
            </button>
          </div>
          <button type="submit" class="send-btn" aria-label="send">
            <i class="ri-send-plane-fill"></i>
          </button>
        </form>
      `;
    }

    if (chatInfoPanel && !chatInfoPanel.children.length) {
      chatInfoPanel.innerHTML = `
        <div class="info-header">
          <h3>Информация</h3>
          <button class="close-info-btn" id="closeInfo">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <div class="user-profile-card">
          <div class="profile-avatar" id="infoAvatar"></div>
          <h4 class="profile-name" id="infoName"></h4>
          <p class="profile-spec" id="infoBio"></p>
          <a href="#" class="btn-view-profile" id="infoProfileLink" target="_blank" rel="noreferrer">
            Открыть профиль
          </a>
        </div>
        <div class="info-section" id="infoProjectSection" style="display:none;">
          <h4 class="section-title">Проект</h4>
          <div class="info-item">
            <span class="info-label">ID</span>
            <span class="info-value" id="infoProjectId"></span>
          </div>
        </div>
      `;
    }
  }

  ensureLayout();

  const messageForm = qs("#messageForm");
  const messageInput = qs("#messageInput");
  const messagesArea = qs("#messagesArea");
  const emptyChatState = qs("#emptyChatState");
  const chatHeader = qs("#chatHeader");
  const chatAvatar = qs("#chatAvatar");
  const chatUserName = qs("#chatUserName");
  const chatUserStatus = qs("#chatUserStatus");
  const infoAvatar = qs("#infoAvatar");
  const infoName = qs("#infoName");
  const infoBio = qs("#infoBio");
  const infoProfileLink = qs("#infoProfileLink");
  const infoProjectSection = qs("#infoProjectSection");
  const infoProjectId = qs("#infoProjectId");

  toggleEmptyState(!!state.activeChatId);

  function authHeader() {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

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

  function formatTime(dt) {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function buildAvatar(partner, size = 36) {
    if (partner?.avatar) {
      return `<img src="${partner.avatar}" alt="${partner.username || ""}" class="avatar" style="width:${size}px;height:${size}px;">`;
    }
    const letter = (partner?.first_name || partner?.username || "?").slice(0, 1).toUpperCase();
    return `<div class="avatar" style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">${letter}</div>`;
  }

  function partnerOf(chat) {
    return chat.partner || chat.participants?.find((p) => p.id !== currentUserId) || {};
  }

  async function loadChats() {
    try {
      const res = await fetch(API.chats, { headers: authHeader() });
      if (!res.ok) throw new Error("chats_load_failed");
      state.chats = await res.json();
      if (!state.activeChatId && state.chats.length) {
        state.activeChatId = state.chats[0].id;
      }
      renderChats();
      if (state.activeChatId) {
        await selectChat(state.activeChatId, { skipListRender: true });
      }
    } catch (err) {
      console.error("Failed to load chats", err);
      if (chatsListEl) {
        chatsListEl.innerHTML = `<div class="empty-state"><i class="ri-alert-line"></i><p>Не удалось загрузить чаты</p></div>`;
      }
    }
  }

  function renderChats() {
    if (!chatListEl) return;
    chatListEl.innerHTML = "";
    if (!state.chats.length) {
      chatListEl.innerHTML = `
        <div class="empty-state">
          <i class="ri-chat-3-line"></i>
          <p>Сообщений пока нет</p>
        </div>`;
      return;
    }
    state.chats.forEach((chat) => {
      const partner = partnerOf(chat);
      const item = document.createElement("div");
      item.className = "chat-item" + (chat.id === state.activeChatId ? " active" : "");
      item.dataset.chatId = chat.id;
      item.innerHTML = `
        <div class="avatar-wrapper">
          ${buildAvatar(partner, 40)}
        </div>
        <div class="chat-info">
          <div class="chat-header">
            <span class="chat-name">${partner.first_name || partner.username || "Без имени"}</span>
            <span class="chat-time">${chat.last_message?.created_at ? formatTime(chat.last_message.created_at) : ""}</span>
          </div>
          <div class="chat-preview">
            <span class="last-msg">${chat.last_message?.text || ""}</span>
            ${chat.unread_count ? `<span class="unread-badge">${chat.unread_count}</span>` : ""}
          </div>
        </div>
      `;
      item.addEventListener("click", () => selectChat(chat.id));
      chatListEl.appendChild(item);
    });
  }

  async function selectChat(chatId, opts = {}) {
    state.activeChatId = chatId;
    if (!opts.skipListRender) renderChats();
    await loadMessages(chatId);
    openSocket(chatId);
    toggleEmptyState(true);
  }

  function toggleEmptyState(hasChat) {
    if (!emptyChatState) return;
    if (hasChat) {
      emptyChatState.style.display = "none";
      messageForm?.classList.remove("disabled");
      messageInput?.removeAttribute("disabled");
    } else {
      emptyChatState.style.display = "";
      messageInput?.setAttribute("disabled", "true");
    }
  }

  async function loadMessages(chatId) {
    if (!messagesArea) return;
    messagesArea.innerHTML = `<div class="empty-state"><i class="ri-loader-2-line"></i><p>Загрузка...</p></div>`;
    try {
      const res = await fetch(API.messages(chatId), { headers: authHeader() });
      if (!res.ok) throw new Error("messages_load_failed");
      const data = await res.json();
      renderMessages(data);
      await markRead(chatId);
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.unread_count = 0;
        renderActiveChatInfo(chat);
      }
      renderChats();
    } catch (err) {
      console.error("Failed to load messages", err);
      messagesArea.innerHTML = `<div class="empty-state"><i class="ri-alert-line"></i><p>Не удалось загрузить сообщения</p></div>`;
    }
  }

  function renderMessages(list) {
    if (!messagesArea) return;
    messagesArea.innerHTML = "";
    if (!list.length) {
      messagesArea.innerHTML = `
        <div class="empty-state">
          <i class="ri-message-3-line"></i>
          <p>Сообщений пока нет</p>
        </div>`;
      return;
    }
    list.forEach((m) => {
      const row = document.createElement("div");
      row.className = "msg-row " + (m.sender?.id === currentUserId ? "user" : "partner");
      row.innerHTML = `
        <div class="msg-bubble">
          ${escapeHtml(m.text)}
          <span class="msg-time">${formatTime(m.created_at)}</span>
        </div>`;
      messagesArea.appendChild(row);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[c] || c;
    });
  }

  async function markRead(chatId) {
    try {
      await fetch(API.markRead(chatId), {
        method: "POST",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          ...authHeader(),
        },
        credentials: "include",
      });
    } catch (err) {
      console.warn("markRead failed", err);
    }
  }

  function openSocket(chatId) {
    if (state.socket) {
      state.socket.onmessage = null;
      state.socket.close();
    }
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/chat/${chatId}/`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat.message") {
          handleIncomingMessage(data);
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };
    ws.onclose = () => {
      state.socket = null;
    };
    state.socket = ws;
  }

  function handleIncomingMessage(payload) {
    const chatId = Number(payload.chat);
    const chat = state.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.last_message = {
        text: payload.text,
        sender_id: payload.sender?.id,
        created_at: payload.created_at,
      };
      if (chatId !== state.activeChatId && payload.sender?.id !== currentUserId) {
        chat.unread_count = (chat.unread_count || 0) + 1;
      }
    }
    if (chatId === state.activeChatId) {
      appendMessage(payload);
      markRead(chatId);
    }
    state.chats.sort((a, b) => {
      const ta = a.last_message?.created_at || a.updated_at || "";
      const tb = b.last_message?.created_at || b.updated_at || "";
      return ta < tb ? 1 : -1;
    });
    renderChats();
  }

  function appendMessage(msg) {
    if (!messagesArea) return;
    const row = document.createElement("div");
    row.className = "msg-row " + (msg.sender?.id === currentUserId ? "user" : "partner");
    row.innerHTML = `
      <div class="msg-bubble">
        ${escapeHtml(msg.text)}
        <span class="msg-time">${formatTime(msg.created_at)}</span>
      </div>`;
    messagesArea.appendChild(row);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  async function sendMessage(text) {
    if (!text || !state.activeChatId) return;
    const payload = { text: text.trim() };
    if (!payload.text) return;

    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify(payload));
      return;
    }

    try {
      const res = await fetch(API.sendMessage, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          ...authHeader(),
        },
        credentials: "include",
        body: JSON.stringify({ chat: state.activeChatId, text: payload.text }),
      });
      if (!res.ok) throw new Error("send_failed");
      const msg = await res.json();
      appendMessage(msg);
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Не удалось отправить сообщение");
    }
  }

  function renderActiveChatInfo(chat) {
    const partner = partnerOf(chat);
    if (chatAvatar) {
      chatAvatar.innerHTML = buildAvatar(partner, 40);
    }
    if (chatUserName) {
      chatUserName.textContent = partner.first_name || partner.username || "Без имени";
    }
    if (chatUserStatus) {
      chatUserStatus.textContent = "Онлайн";
    }
    if (infoAvatar) {
      infoAvatar.innerHTML = buildAvatar(partner, 72);
    }
    if (infoName) infoName.textContent = partner.first_name || partner.username || "";
    if (infoBio) infoBio.textContent = partner.bio || "";
    if (infoProfileLink) {
      infoProfileLink.href = partner.id ? `/account/?user=${partner.id}` : "#";
    }
    if (infoProjectSection && infoProjectId) {
      if (chat.project) {
        infoProjectSection.style.display = "";
        infoProjectId.textContent = chat.project;
      } else {
        infoProjectSection.style.display = "none";
      }
    }
  }

  messageForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = messageInput?.value || "";
    messageInput.value = "";
    sendMessage(val);
  });

  qs("#toggleInfo")?.addEventListener("click", () => {
    chatInfoPanel?.classList.toggle("open");
  });
  qs("#closeInfo")?.addEventListener("click", () => {
    chatInfoPanel?.classList.remove("open");
  });
  qs("#openChatList")?.addEventListener("click", () => {
    qs("#chatListPanel")?.classList.toggle("open");
  });
  qs("#backToChats")?.addEventListener("click", () => {
    qs("#chatListPanel")?.classList.add("open");
  });

  qs("#chatSearch")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    qsa(".chat-item", chatListEl).forEach((item) => {
      const name = item.querySelector(".chat-name")?.textContent.toLowerCase() || "";
      item.style.display = name.includes(term) ? "" : "none";
    });
  });

  loadChats();
})();
