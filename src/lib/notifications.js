// Local (on-device) practice reminders, Duolingo-style. No server/push: everything
// here is scheduled by the device against the OS scheduler, so it works offline and
// needs no Firebase. The plugin is imported lazily and every call no-ops off native
// or when the plugin is absent, so the web build and tests never touch it.
import { Capacitor } from '@capacitor/core';
import { getSettings } from '../store.js';

const STREAK_ID = 1001; // daily "keep your streak" reminder
const NUDGE_ID = 1002; // gentle friends nudge, a bit later
const REQUEST_ID = 2001; // "someone added you" heads-up (fires immediately)
const GIFT_ID = 2002; // "someone gave you a streak freeze" heads-up
const TEST_ID = 3001; // "test reminder" fired on demand from Settings

let pluginPromise = null;

async function plugin() {
  try {
    if (!Capacitor.isNativePlatform()) return null;
    if (!pluginPromise) pluginPromise = import('@capacitor/local-notifications');
    return (await pluginPromise).LocalNotifications;
  } catch {
    return null; // plugin not installed / not native
  }
}

/** Requests OS permission; returns true if granted. Safe to call repeatedly. */
export async function ensurePermission() {
  const LN = await plugin();
  if (!LN) return false;
  try {
    let perm = await LN.checkPermissions();
    if (perm.display !== 'granted') perm = await LN.requestPermissions();
    return perm.display === 'granted';
  } catch {
    return false;
  }
}

// The next occurrence of `hour:minute` today or tomorrow — never a time in the
// past, or the OS fires it instantly.
function nextAt(hour, minute = 0) {
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  return at;
}

/**
 * Reschedules the daily reminders from current state. Called on app resume, after
 * practice, and when settings change. If today's goal is already met, the streak
 * reminder is cancelled (nothing to nag about); otherwise it's set for the user's
 * chosen hour. Idempotent — fixed IDs mean re-scheduling replaces, never stacks.
 */
export async function rescheduleReminders({ streak = 0, goalMet = false } = {}) {
  const LN = await plugin();
  if (!LN) return;
  const s = getSettings();

  try {
    await LN.cancel({ notifications: [{ id: STREAK_ID }, { id: NUDGE_ID }] });
    if (!s.notifications) return;
    if (!(await ensurePermission())) return;

    const notifications = [];
    if (!goalMet) {
      const body = streak > 0
        ? `Keep your ${streak}-day streak alive — hit today's goal before midnight.`
        : "A few minutes of practice keeps your streak going. Let's go!";
      notifications.push({
        id: STREAK_ID,
        title: 'Time to practise',
        body,
        schedule: { at: nextAt(s.reminderHour, s.reminderMinute), allowWhileIdle: true },
      });
      // A softer nudge a couple of hours later, only if still unmet by then.
      notifications.push({
        id: NUDGE_ID,
        title: 'Your streak is waiting',
        body: 'Practise with a friend today to keep your streaks going together.',
        schedule: { at: nextAt((s.reminderHour + 2) % 24, s.reminderMinute), allowWhileIdle: true },
      });
    }
    if (notifications.length) await LN.schedule({ notifications });
  } catch {
    // Scheduling is best-effort; never let it break app flow.
  }
}

/** Fires immediately when a friend request arrives while the app is open. */
export async function notifyFriendRequest(name) {
  const LN = await plugin();
  if (!LN) return;
  if (!getSettings().notifications) return;
  try {
    if (!(await ensurePermission())) return;
    await LN.schedule({
      notifications: [{
        id: REQUEST_ID,
        title: 'New friend request',
        body: `${name} wants to connect on VocabMaster.`,
        schedule: { at: new Date(Date.now() + 500) },
      }],
    });
  } catch {
    // best-effort
  }
}

/** Fires immediately when a friend gifts you a streak freeze while the app is open. */
export async function notifyFreezeGift(name) {
  const LN = await plugin();
  if (!LN) return;
  if (!getSettings().notifications) return;
  try {
    if (!(await ensurePermission())) return;
    await LN.schedule({
      notifications: [{
        id: GIFT_ID,
        title: 'You got a streak freeze ❄️',
        body: `${name} gave you a streak freeze to protect your streak.`,
        schedule: { at: new Date(Date.now() + 500) },
      }],
    });
  } catch {
    // best-effort
  }
}

/**
 * Fires a reminder right now so the user can confirm, on their own device, that
 * delivery + sound + vibration actually work. The daily reminders use the exact
 * same plugin, channel and payload shape, so a working test means a working
 * schedule — it just removes the "did it silently break?" doubt of a nudge that
 * isn't due until tonight. Returns a status the caller can surface:
 *   'sent'        – handed to the OS scheduler
 *   'blocked'     – native, but notifications aren't permitted (guide to settings)
 *   'unsupported' – not running on a device (web/tests)
 */
export async function sendTestReminder() {
  const LN = await plugin();
  if (!LN) return 'unsupported';
  try {
    if (!(await ensurePermission())) return 'blocked';
    await LN.schedule({
      notifications: [{
        id: TEST_ID,
        title: 'Test reminder ✅',
        body: 'Notifications are working. Your daily practice reminders will arrive like this.',
        schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true },
      }],
    });
    return 'sent';
  } catch {
    return 'blocked';
  }
}

export async function cancelAllReminders() {
  const LN = await plugin();
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: STREAK_ID }, { id: NUDGE_ID }] });
  } catch { /* ignore */ }
}
