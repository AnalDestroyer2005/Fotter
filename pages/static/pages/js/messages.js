// Realtime chat (Channels/WebSocket)
(() => {
  const chatListPanel = document.getElementById('chatListPanel');
  const chatMainPanel = document.getElementById('chatMainPanel');
  const chatInfoPanel = document.getElementById('chatInfoPanel');
  const messagesArea = document.getElementById('messagesArea');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const chatSearch = document.getElementById('chatSearch');
  const openChatListBtn = document.getElementById('openChatList');
  const backToChatsBtn = document.getElementById('backToChats');
  const toggleInfoBtn = document.getElementById('toggleInfo');
  const closeInfoBtn = document.getElementById('closeInfo');
  const root = document.querySelector('.messages-container');

  let isMobile = window.innerWidth <= 768;
  const currentUserId = Number(root?.dataset.userId || 0);
  let activeChatId = root?.dataset.activeChat || null;
  let socket = null;

  function init() {
    setupEventListeners();
    setupChatSwitching();
    setupSearch();
    if (activeChatId) {
      connectSocket(activeChatId);
      scrollToBottom();
    }
    checkMobileState();
  }

  function setupEventListeners() {
    if (messageForm) {
      messageForm.addEventListener('submit', handleSendMessage);
    }
    openChatListBtn?.addEventListener('click', showChatList);
    backToChatsBtn?.addEventListener('click', showChatList);
    toggleInfoBtn?.addEventListener('click', toggleInfoPanel);
    closeInfoBtn?.addEventListener('click', () => chatInfoPanel?.classList.remove('open'));

    document.querySelectorAll('.chat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        filterChats(tab.dataset.tab);
      });
    });

    window.addEventListener('resize', checkMobileState);
    document.addEventListener('keydown', handleKeyboard);
  }

  function setupChatSwitching() {
    document.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', async () => {
        const chatId = item.dataset.chatId;
        await switchChat(chatId, item);
        if (isMobile) {
          chatListPanel?.classList.add('hidden');
          chatMainPanel?.classList.add('active');
        }
      });
    });
  }

  async function switchChat(chatId, itemNode) {
    if (!chatId) return;
    activeChatId = chatId;
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const activeNode = itemNode || document.querySelector(`[data-chat-id="${chatId}"]`);
    activeNode?.classList.add('active');
    fillHeaderFromItem(activeNode);
    await loadMessages(chatId);
    await markChatRead(chatId);
    connectSocket(chatId);
    scrollToBottom();
  }

  function fillHeaderFromItem(item) {
    if (!item) return;
    const name = item.dataset.userName || '';
    const avatar = item.dataset.userAvatar || '';
    const header = chatMainPanel?.querySelector('.chat-user-info');
    if (!header) return;
    const avatarEl = header.querySelector('.avatar');
    if (avatarEl && avatar) {
      avatarEl.innerHTML = `<img src="${avatar}" alt="${name}" class="avatar">`;
    } else if (avatarEl) {
      avatarEl.textContent = (name || '?').slice(0, 1).toUpperCase();
    }
    const nameEl = header.querySelector('.user-name');
    if (nameEl) nameEl.textContent = name;
  }

  function connectSocket(chatId) {
    if (!chatId) return;
    if (socket) {
      socket.close();
      socket = null;
    }
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${scheme}://${window.location.host}/ws/chat/${chatId}/`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        appendMessage({
          senderId: data.sender?.id || data.sender_id,
          text: data.text,
          time: formatTime(data.created_at),
        });
        updateChatPreview(chatId, data.text, data.created_at);
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    socket.onclose = () => {
      // socket will reconnect on next send or switch
    };
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !activeChatId) return;
    const payload = { text };

    // Try WebSocket first
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      appendMessage({
        senderId: currentUserId,
        text,
        time: formatTime(new Date().toISOString()),
      });
      messageInput.value = '';
      scrollToBottom();
      updateChatPreview(activeChatId, text);
      return;
    }

    // Fallback to HTTP
    try {
      const response = await fetch(`/api/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ chat: activeChatId, text }),
      });
      if (response.ok) {
        appendMessage({
          senderId: currentUserId,
          text,
          time: formatTime(new Date().toISOString()),
        });
        messageInput.value = '';
        scrollToBottom();
        updateChatPreview(activeChatId, text);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  async function loadMessages(chatId) {
    if (!messagesArea || !chatId) return;
    messagesArea.innerHTML = '';
    try {
      const res = await fetch(`/api/messages/?chat=${chatId}`);
      if (!res.ok) return;
      const data = await res.json();
      data.forEach(msg => {
        appendMessage({
          senderId: msg.sender?.id,
          text: msg.text,
          time: formatTime(msg.created_at),
        });
      });
      scrollToBottom();
    } catch (err) {
      console.error('loadMessages error', err);
    }
  }

  async function markChatRead(chatId) {
    try {
      await fetch(`/api/chats/${chatId}/mark_read/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      });
      const badge = document.querySelector(`[data-chat-id="${chatId}"] .unread-badge`);
      if (badge) badge.remove();
    } catch (err) {
      console.warn('mark read failed', err);
    }
  }

  function appendMessage({ senderId, text, time }) {
    if (!messagesArea) return;
    const msgRow = document.createElement('div');
    const side = senderId === currentUserId ? 'user' : 'partner';
    msgRow.className = `msg-row ${side}`;
    const msgBubble = document.createElement('div');
    msgBubble.className = 'msg-bubble';
    msgBubble.innerHTML = `
      ${text}
      <span class="msg-time">${time || ''}</span>
    `;
    msgRow.appendChild(msgBubble);
    messagesArea.appendChild(msgRow);
  }

  function updateChatPreview(chatId, text, timeOverride) {
    const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (!chatItem) return;
    const lastMsg = chatItem.querySelector('.last-msg');
    if (lastMsg) {
      lastMsg.textContent = text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    const chatTime = chatItem.querySelector('.chat-time');
    if (chatTime) {
      chatTime.textContent = timeOverride ? formatTime(timeOverride) : new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
  }

  function setupSearch() {
    chatSearch?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.chat-item').forEach(item => {
        const name = item.querySelector('.chat-name')?.textContent.toLowerCase() || '';
        const lastMsg = item.querySelector('.last-msg')?.textContent.toLowerCase() || '';
        item.style.display = (name.includes(query) || lastMsg.includes(query)) ? 'flex' : 'none';
      });
    });
  }

  function filterChats(tab) {
    const items = document.querySelectorAll('.chat-item');
    items.forEach(item => {
      switch(tab) {
        case 'unread':
          item.style.display = item.querySelector('.unread-badge') ? 'flex' : 'none';
          break;
        case 'archive':
          item.style.display = 'none';
          break;
        default:
          item.style.display = 'flex';
      }
    });
  }

  function showChatList() {
    if (!isMobile) return;
    chatListPanel?.classList.remove('hidden');
    chatMainPanel?.classList.remove('active');
  }

  function toggleInfoPanel() {
    if (isMobile || window.innerWidth <= 1200) {
      chatInfoPanel?.classList.toggle('open');
    }
  }

  function checkMobileState() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    if (wasMobile && !isMobile) {
      chatListPanel?.classList.remove('hidden');
      chatMainPanel?.classList.remove('active');
      chatInfoPanel?.classList.remove('open');
    }
  }

  function handleKeyboard(e) {
    if (e.key === 'Escape') {
      chatInfoPanel?.classList.remove('open');
    }
  }

  function scrollToBottom() {
    if (messagesArea) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  function formatTime(value) {
    try {
      const d = new Date(value);
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
