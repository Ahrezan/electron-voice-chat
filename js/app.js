// js/app.js
import * as UI from './ui.js';
import * as PeerService from './peerService.js';

// Local UI state
let isMicMuted = false;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Butonları Ayarla
    setupUIListeners();

    // Sonra Peer ve Mikrofonu başlat (async hale getirdik)
    try {
        await PeerService.init();
    } catch (e) {
        console.error("Init error:", e);
    }
    
    // 2. Uygulamayı Başlat (Peer oluştur vs.)
    PeerService.init();

    // 3. Fallback kontrolü
    setTimeout(() => {
        if (UI.elements.peerId && !UI.elements.peerId.textContent.trim()) {
            UI.setStatus('failed');
        }
    }, 3000);
});

function setupUIListeners() {
    const { chatSend, chatInput, volumeBtn, micBtn, callBtn, peerInput } = UI.elements;

    // --- CHAT ---
    if (chatSend) {
        chatSend.addEventListener('click', () => {
            const text = chatInput ? chatInput.value.trim() : '';
            const targetId = peerInput ? peerInput.value.trim() : '';
            PeerService.sendChatMessage(text, targetId);
            if (chatInput) chatInput.value = '';
        });
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                if (chatSend) chatSend.click(); 
            }
        });
    }

    // --- SES (HOPARLÖR) ---
    if (volumeBtn) {
        volumeBtn.addEventListener('click', () => {
            PeerService.toggleRemoteAudio();
        });
    }

    // --- MİKROFON ---
    if (micBtn) {
        micBtn.addEventListener('click', () => {
            isMicMuted = !isMicMuted;
            PeerService.toggleMic(isMicMuted);
        });
    }

    // --- ARAMA (CALL) ---
    if (callBtn) {
        callBtn.addEventListener('click', () => {
            // Butonun o anki durumuna (class) bakarak karar verebiliriz
            // Veya serviste zaten kontrol var:
            const targetId = peerInput ? peerInput.value.trim() : '';
            
            // Eğer butonda hata class'ı varsa (kırmızıysa) kapatma işlemi yapıyordur
            if (callBtn.classList.contains('btn-error')) {
                PeerService.endCurrentCall();
            } else {
                if (!targetId) { alert('Please enter the Peer ID to call.'); return; }
                PeerService.startOutgoingCall(targetId);
            }
        });
    }
}