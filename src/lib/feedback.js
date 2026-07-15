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

export function playAudio(url) {
  if (!url || !getSettings().sound) return;
  try {
    if (!el) el = new Audio();
    el.src = url;
    el.currentTime = 0;
    el.play().catch(() => {});
  } catch {
    /* ignore */
  }
}
