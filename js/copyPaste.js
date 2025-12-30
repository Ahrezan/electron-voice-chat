// js/copyPaste.js
document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copy-id');
  const pasteBtn = document.getElementById('paste-id');
  const peerIdEl = document.getElementById('peer-id');
  const peerInputEl = document.getElementById('peer-input');

  // Görsel geri bildirim
  function flashCopyIcon(button) {
    const img = button && button.querySelector('img');
    if (!img) return;
    const prevSrc = img.src;
    // Eğer assets klasörünüzde check.svg yoksa burası hata verir, dosyanın olduğundan emin olun
    // Yoksa img.src = 'assets/clipboard.svg' (veya başka bir ikon) yapın.
    img.src = 'assets/check.svg'; 
    setTimeout(() => { img.src = prevSrc; }, 1200);
  }

  // --- KOPYALA ---
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const id = peerIdEl ? peerIdEl.textContent.trim() : '';
      if (!id) return;

      console.log('ID to be copied:', id); // Debug

      try {
        // 1. Electron API Denemesi (IPC üzerinden)
        if (window.api && window.api.clipboard) {
          console.log('Using Electron clipboard...');
          await window.api.clipboard.writeText(id);
          flashCopyIcon(copyBtn);
        } 
        // 2. Tarayıcı Fallback
        else if (navigator.clipboard && navigator.clipboard.writeText) {
          console.log('Navigator clipboard kullanılıyor...');
          await navigator.clipboard.writeText(id);
          flashCopyIcon(copyBtn);
        } else {
          console.warn('No clipboard access method was found.');
        }
      } catch (err) {
        console.error('Copy error:', err);
        alert('Copying failed. Please select and copy manually.');
      }
    });
  }

  // --- YAPIŞTIR ---
  if (pasteBtn) {
    pasteBtn.addEventListener('click', async () => {
      if (!peerInputEl) return;

      try {
        let text = '';

        // 1. Electron API Denemesi (IPC üzerinden)
        if (window.api && window.api.clipboard) {
          console.log('Reading Electron clipboard...');
          text = await window.api.clipboard.readText();
        } 
        // 2. Tarayıcı Fallback
        else if (navigator.clipboard && navigator.clipboard.readText) {
          console.log('Reading navigator clipboard...');
          text = await navigator.clipboard.readText();
        }

        console.log('Read text:', text); // Debug

        text = (text || '').trim();
        if (!text) return;

        // Kendi ID kontrolü
        const myId = peerIdEl ? peerIdEl.textContent.trim() : '';
        if (myId && text === myId) {
          peerInputEl.value = '';
          peerInputEl.placeholder = "You cannot enter your own ID!";
          setTimeout(() => peerInputEl.placeholder = "Enter or paste PeerJS ID", 2000);
          return;
        }

        peerInputEl.value = text;
        // Input eventini tetikle (bazen UI frameworkleri bunu bekler)
        peerInputEl.dispatchEvent(new Event('input', { bubbles: true }));
        peerInputEl.focus();

      } catch (err) {
        console.error('Paste error:', err);
      }
    });
  }
});