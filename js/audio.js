// js/audio.js

let remoteAudio = null;
let callStartAudio = null;
let callEndAudio = null;
let _callEndSoundPlayed = false;

export function initAudio() {
  // Remote audio element
  remoteAudio = document.getElementById('remote-audio');
  if (!remoteAudio) {
    remoteAudio = document.createElement('audio');
    remoteAudio.id = 'remote-audio';
    remoteAudio.autoplay = true;
    remoteAudio.style.display = 'none';
    document.body.appendChild(remoteAudio);
  }
  remoteAudio.muted = false;

  // Sound effects
  try {
    callStartAudio = new Audio('assets/call-start.wav');
    callEndAudio = new Audio('assets/call-end.wav');
    callStartAudio.preload = 'auto';
    callEndAudio.preload = 'auto';
  } catch (e) {
    console.warn('Audio init failed', e);
  }
}

export function getRemoteAudio() {
  return remoteAudio;
}

export function setRemoteStream(stream) {
  if (remoteAudio) {
    remoteAudio.srcObject = stream;
    remoteAudio.muted = false;
  }
}

export function toggleRemoteMute() {
  if (remoteAudio) {
    remoteAudio.muted = !remoteAudio.muted;
    return remoteAudio.muted;
  }
  return false;
}

export function playCallStart() {
  try {
    if (callStartAudio) callStartAudio.play().catch(() => {});
  } catch (e) {}
}

export function playCallEndOnce() {
  try {
    if (_callEndSoundPlayed) return;
    _callEndSoundPlayed = true;
    if (callEndAudio) callEndAudio.play().catch(() => {});
  } catch (e) {}
}

export function resetCallEndSoundFlag() {
  _callEndSoundPlayed = false;
}