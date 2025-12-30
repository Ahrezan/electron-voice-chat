// js/peerService.js
import * as UI from './ui.js';
import * as AudioMgr from './audio.js';
import * as Stats from './stats.js';

// State
let peer = null;
let currentCall = null;
let dataConn = null;
let localStream = null;
let callActive = false;

// --- Public Methods (Dışarıya Açılanlar) ---

export async function init() {
    AudioMgr.initAudio();
    
    // UYGULAMA BAŞINDA İZİN İSTEĞİ
    // Bu sayede arkadaşınız uygulamayı ilk açtığında izin penceresi çıkacak.
    try {
        await requestInitialMicPermission();
    } catch (e) {
        console.warn("Initial mic request failed or denied:", e);
    }

    try {
        peer = (typeof Peer !== 'undefined') ? new Peer() : null;
    } catch (e) {
        console.error('Peer creation failed:', e);
        peer = null;
    }

    if (!peer) {
        UI.setStatus('failed');
        return;
    }

    UI.setStatus('ready');
    setupPeerEvents();
}

export async function startOutgoingCall(targetId) {
    if (currentCall) { cleanupCall(true); return; } // Zaten aramadaysa kapat

    try {
        UI.setStatus('connecting');
        const stream = await ensureMic();
        const call = peer.call(targetId, stream);
        setupCall(call);

        // Data bağlantısı (chat/hangup için)
        if (!dataConn || !dataConn.open) {
            connectData(targetId);
        }
    } catch (err) {
        console.error('Call start failed:', err);
        UI.setStatus('failed');
    }
}

export function endCurrentCall() {
    cleanupCall(true);
}

export function sendChatMessage(text, targetId) {
    if (!text) return;

    // Eğer bağlantı yoksa önce bağlan
    if (!dataConn || !dataConn.open) {
        if (!targetId) { 
            // Eğer hedef ID yoksa ve chat açıksa kullanıcıyı uyar
            console.warn('Message could not be sent: No target ID.'); 
            return; 
        }
        const conn = peer.connect(targetId);
        setupDataConnection(conn);
        conn.on('open', () => {
            conn.send({ type: 'chat', message: text });
            UI.addMessage(text, 'right');
        });
    } else {
        dataConn.send({ type: 'chat', message: text });
        UI.addMessage(text, 'right');
    }
}

export async function toggleMic(isMuted) {
    try {
        if (!localStream) localStream = await ensureMic();
        if (localStream.getAudioTracks) {
            localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        }
        UI.updateMicButton(isMuted);
    } catch (e) { console.error(e); }
}

export function toggleRemoteAudio() {
    const isMuted = AudioMgr.toggleRemoteMute();
    UI.updateVolumeButton(isMuted);
}

// --- Internal Logic (Sadece bu dosya içinde kullanılanlar) ---

function setupPeerEvents() {
    peer.on('open', (id) => {
        if (UI.elements.peerId) {
            UI.elements.peerId.textContent = id;
            UI.elements.peerId.title = id;
        }
        UI.setStatus('ready');
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        UI.setStatus('failed');
    });

    peer.on('disconnected', () => UI.setStatus('failed'));
    peer.on('close', () => UI.setStatus('failed'));

    peer.on('connection', (conn) => setupDataConnection(conn));

    peer.on('call', async (call) => {
        try {
            UI.setStatus('connecting');
            const stream = await ensureMic();
            call.answer(stream);
            setupCall(call);
            
            // Gelen aramada, arayan kişiye data kanalı aç
            if (!dataConn || !dataConn.open) {
                connectData(call.peer);
            }
        } catch (err) {
            console.warn('Answering error:', err);
            UI.setStatus('failed');
        }
    });
}

function connectData(targetId) {
    try {
        const conn = peer.connect(targetId);
        setupDataConnection(conn);
    } catch (e) { console.warn(e); }
}

async function ensureMic() {
    if (localStream && localStream.active) return localStream;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return localStream;
    } catch (err) {
        console.error("Mic error:", err);
        alert('Microphone not found or permission denied.');
        throw err;
    }
}

function setupDataConnection(conn) {
    dataConn = conn;
    conn.on('data', (data) => {
        if (!data) return;
        if (data.type === 'chat') {
            UI.addMessage(data.message, 'left');
            // Gelen mesaj varsa chat kilidini aç (Opsiyonel: mesaj gelince de açılsın isterseniz)
            unlockChat(); 
        }
        if (data.type === 'hangup') cleanupCall(false);
    });
    conn.on('close', () => { dataConn = null; });
    conn.on('error', (e) => console.error('DataConn error:', e));
}

function setupCall(call) {
    if (currentCall && currentCall !== call) {
        try { currentCall.close(); } catch (e) {}
    }

    // Yeni arama başladığında chat temizlensin mi?
    // İsteğinize göre burayı yorum satırı yapabilirsiniz, şimdilik temizliyoruz:
    UI.clearChat(); 
    
    AudioMgr.resetCallEndSoundFlag();
    currentCall = call;
    UI.setStatus('connecting');

    call.on('stream', (remoteStream) => {
        AudioMgr.setRemoteStream(remoteStream);
        callActive = true;
        AudioMgr.resetCallEndSoundFlag();
        UI.setStatus('in-call');
        UI.updateCallButton(true);
        AudioMgr.playCallStart();
        
        // --- CHAT KİLİDİNİ KALDIR ---
        // Arama bağlandığı anda chat aktif olur ve hep açık kalır.
        unlockChat();

        // İstatistikleri başlat
        const pc = call.peerConnection;
        if (pc) Stats.startStatsPolling(pc);
    });

    call.on('close', () => cleanupCall(true));
    call.on('error', (err) => { console.error('Call err:', err); cleanupCall(true); });
}

function cleanupCall(sendRemote = true) {
    const wasActive = !!callActive;
    callActive = false;
    
    // Stats durdur
    Stats.stopStatsPolling();

    if (sendRemote) {
        if (dataConn && dataConn.open) {
            dataConn.send({ type: 'hangup' });
        } else if (currentCall && peer) {
            try {
                const otherId = currentCall.peer;
                if (otherId) {
                    const temp = peer.connect(otherId);
                    temp.on('open', () => {
                        temp.send({ type: 'hangup' });
                        setTimeout(() => temp.close(), 100);
                    });
                }
            } catch (e) {}
        }
    }

    try { if (currentCall) currentCall.close(); } catch (e) {}
    currentCall = null;

    if (wasActive) {
        AudioMgr.playCallEndOnce();
        UI.setStatus('ended');
    }

    UI.updateCallButton(false);
    lockChat();
    
    // NOT: Burada chat'i tekrar kilitlemiyoruz (add 'chat-disabled').
    // Böylece ilk aramadan sonra chat hep açık kalıyor.
}

// Yardımcı: Chat kilidini açan fonksiyon
function unlockChat() {
    const chatBox = document.querySelector('.chat-box');
    if (chatBox && chatBox.classList.contains('chat-disabled')) {
        chatBox.classList.remove('chat-disabled');
        // Kullanıcıya bilgi ver (Opsiyonel)
        UI.addMessage("Voice connection established, chat is active.", 'left');
    }
}
function lockChat() {
    const chatBox = document.querySelector('.chat-box');
    if (chatBox) chatBox.classList.add('chat-disabled');
}