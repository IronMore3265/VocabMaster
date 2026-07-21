// Haptics + audio, both gated by user settings. Haptics use the Web Vibration
// API (works in the Android WebView) so we avoid an extra Capacitor plugin.
import { getSettings } from '../store.js';

export function vibrate(pattern) {
  if (!getSettings().haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported — ignore */
  }
}

export const haptic = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  success: () => vibrate([12, 40, 12]),
  error: () => vibrate([30, 40, 30]),
};

// One shared <audio> element; each play swaps its src (pronunciation clips).
let el = null;
// The URL currently buffered by preloadAudio, so playAudio can skip a redundant
// src swap (which would drop the already-downloaded clip and re-fetch).
let preloadedUrl = null;

function ensureEl() {
  if (!el) el = new Audio();
  return el;
}

/**
 * Downloads a clip into the shared element ahead of time so a later playAudio(url)
 * starts instantly. Called when a flashcard is shown, before the user taps speak.
 */
export function preloadAudio(url) {
  if (!url || !getSettings().sound || url === preloadedUrl) return;
  try {
    const a = ensureEl();
    a.preload = 'auto';
    a.src = url;
    a.load();
    preloadedUrl = url;
  } catch {
    /* ignore */
  }
}

export function playAudio(url) {
  if (!url || !getSettings().sound) return;
  try {
    const a = ensureEl();
    // Reuse the buffered clip when it's already the one we want.
    if (url !== preloadedUrl) {
      a.src = url;
      preloadedUrl = url;
    }
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}
