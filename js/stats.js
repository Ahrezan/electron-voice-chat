// js/stats.js
import { elements } from './ui.js';

let statsIntervalId = null;
let prevBytesReceived = 0;
let prevBytesSent = 0;
let prevTimestamp = 0;

export function startStatsPolling(pc) {
  stopStatsPolling();
  // Sayaçları sıfırla
  prevBytesReceived = 0;
  prevBytesSent = 0;
  prevTimestamp = Date.now();
  
  statsIntervalId = setInterval(() => collectStatsOnce(pc), 1000);
}

export function stopStatsPolling() {
  if (statsIntervalId) {
    clearInterval(statsIntervalId);
    statsIntervalId = null;
  }
  // UI Reset
  if (elements.statPing) elements.statPing.textContent = 'MS: —';
  if (elements.statDown) elements.statDown.textContent = '↓ — KB/s';
  if (elements.statUp) elements.statUp.textContent = '↑ — KB/s';
}

async function collectStatsOnce(pc) {
  if (!pc) return;

  try {
    const report = await pc.getStats();
    let bytesReceived = 0;
    let bytesSent = 0;
    let currentRtt = null;

    // Raporu tara
    report.forEach(r => {
      // 1. Latency (Ping) - Sadece aktif aday çiftine bak
      if (r.type === 'candidate-pair' && r.state === 'succeeded') {
        if (typeof r.currentRoundTripTime !== 'undefined') {
          currentRtt = r.currentRoundTripTime * 1000;
        }
      }

      // 2. Bandwidth (Download) - Gelen tüm RTP paketleri (ses/video ayrımı yapmadan toplar)
      if (r.type === 'inbound-rtp') {
        if (typeof r.bytesReceived !== 'undefined') {
          bytesReceived += Number(r.bytesReceived);
        }
      }

      // 3. Bandwidth (Upload) - Giden tüm RTP paketleri
      if (r.type === 'outbound-rtp') {
        if (typeof r.bytesSent !== 'undefined') {
          bytesSent += Number(r.bytesSent);
        }
      }
    });

    // Hesaplama için şimdiki zamanı al (Date.now() daha kararlıdır)
    const nowTs = Date.now();
    
    // İlk çalıştırmada fark hesaplanamaz, değerleri kaydet ve çık
    if (prevTimestamp === 0) {
      prevBytesReceived = bytesReceived;
      prevBytesSent = bytesSent;
      prevTimestamp = nowTs;
      return;
    }

    const dt = (nowTs - prevTimestamp) / 1000; // saniye cinsinden fark
    if (dt <= 0) return; // Sıfıra bölünme hatasını önle

    // Byte farkları
    const downB = bytesReceived - prevBytesReceived;
    const upB = bytesSent - prevBytesSent;

    // Hız hesapla (KB/s)
    const downKBs = Math.max(0, downB / 1024 / dt);
    const upKBs = Math.max(0, upB / 1024 / dt);

    // UI Güncelle
    if (elements.statPing) {
      elements.statPing.textContent = (currentRtt !== null 
        ? `MS: ${Math.round(currentRtt)}` 
        : 'MS: —');
    }
    if (elements.statDown) {
      elements.statDown.textContent = `↓ ${downKBs.toFixed(1)} KB/s`;
    }
    if (elements.statUp) {
      elements.statUp.textContent = `↑ ${upKBs.toFixed(1)} KB/s`;
    }

    // Değerleri bir sonraki tur için sakla
    prevBytesReceived = bytesReceived;
    prevBytesSent = bytesSent;
    prevTimestamp = nowTs;

  } catch (err) {
    console.warn('Stats error', err);
  }
}