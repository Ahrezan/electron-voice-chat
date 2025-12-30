// js/ui.js

// Element referansları (Gerektiğinde dışarıdan erişmek için)
export const elements = {
  peerId: document.getElementById('peer-id'),
  peerInput: document.getElementById('peer-input'),
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  chatSend: document.getElementById('chat-send'),
  statusText: document.querySelector('.status-text'),
  statusDot: document.querySelector('.status-dot'),
  statPing: document.getElementById('stat-ping'),
  statDown: document.getElementById('stat-down'),
  statUp: document.getElementById('stat-up'),
  volumeBtn: document.getElementById('volumeBtn'),
  micBtn: document.getElementById('micBtn'),
  callBtn: document.getElementById('callBtn')
};

// Durum Güncellemeleri
export function setStatus(state) {
  const { statusText, statusDot } = elements;
  
  // Önce tüm sınıfları temizle
  if (statusDot) statusDot.classList.remove('status-dot--error', 'status-dot--yellow', 'status-dot--blue');

  switch (state) {
    case 'connecting':
      if (statusText) statusText.textContent = 'CONNECTING TO THE CALL...';
      if (statusDot) statusDot.classList.add('status-dot--yellow');
      break;
    case 'ready':
      if (statusText) statusText.textContent = 'READY TO CONNECT';
      // Default green (css'de default varsayılıyor)
      break;
    case 'failed':
      if (statusText) statusText.textContent = 'CONNECTION FAILED';
      if (statusDot) statusDot.classList.add('status-dot--error');
      break;
    case 'in-call':
      if (statusText) statusText.textContent = 'IN CALL';
      // Green
      break;
    case 'ended':
      if (statusText) statusText.textContent = 'CALL ENDED';
      if (statusDot) statusDot.classList.add('status-dot--blue');
      setTimeout(() => setStatus('ready'), 3000);
      break;
  }
}

// Chat İşlemleri
function formatTime(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function addMessage(text, side = 'right') {
  const { chatMessages } = elements;
  if (!chatMessages) return;

  const msg = document.createElement('div');
  msg.className = `msg msg-${side}`;

  const content = document.createElement('div');
  content.className = 'msg-content';

  const txt = document.createElement('div');
  txt.className = 'msg-text';
  txt.textContent = text;

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(new Date());

  content.appendChild(txt);
  content.appendChild(timeEl);
  msg.appendChild(content);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function clearChat() {
  if (elements.chatMessages) elements.chatMessages.innerHTML = '';
}

// Buton UI Güncellemeleri
export function updateMicButton(isMuted) {
  const { micBtn } = elements;
  if (!micBtn) return;
  const img = micBtn.querySelector('img');
  if (img) img.src = isMuted ? 'assets/mic-off.svg' : 'assets/mic-on.svg';
  micBtn.classList.toggle('btn-error', isMuted);
}

export function updateVolumeButton(isMuted) {
  const { volumeBtn } = elements;
  if (!volumeBtn) return;
  const img = volumeBtn.querySelector('img');
  if (img) img.src = isMuted ? 'assets/volume-off.svg' : 'assets/volume-on.svg';
  volumeBtn.classList.toggle('btn-error', isMuted);
}

export function updateCallButton(active, prevSrc = null) {
  const { callBtn } = elements;
  if (!callBtn) return;
  const img = callBtn.querySelector('img');
  
  if (active) {
    if (img && !img.dataset.prevSrc) img.dataset.prevSrc = img.src;
    if (img) img.src = 'assets/call-end.svg';
    callBtn.classList.add('btn-error');
  } else {
    if (img && img.dataset.prevSrc) {
      img.src = img.dataset.prevSrc;
      delete img.dataset.prevSrc;
    }
    callBtn.classList.remove('btn-error');
  }
}