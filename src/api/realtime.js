// Live friend updates. The promise cache has no way to know a *friend's* device
// changed a friendships row (a new request, an acceptance), so those used to stay
// frozen for the whole session. A Realtime subscription on the caller's own
// friendships rows (the only ones RLS lets us see) invalidates the list and nudges
// the Friends screen the moment anything moves.
//
// Battery: one idle WebSocket is cheap, but we still close it when the app is
// backgrounded and reopen on resume, and filter to this user's rows so we only
// wake for relevant changes.
import { supabase } from '../supabase.js';
import { invalidate } from './queries.js';
import { notifyFriendRequest } from '../lib/notifications.js';

let channel = null;
let currentUserId = null;
let paused = false;

function open() {
  if (channel || !currentUserId || paused) return;
  channel = supabase
    .channel(`friendships:${currentUserId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${currentUserId}` },
      (payload) => {
        invalidate('friends:list', 'friends:mutual');
        window.dispatchEvent(new CustomEvent('vm:friends-changed'));
        // A fresh incoming request while the app is open earns a local heads-up.
        const row = payload.new;
        if (payload.eventType === 'INSERT' && row?.direction === 'in' && row?.status === 'pending') {
          announceRequest(row.friend_id);
        }
      },
    )
    .subscribe();
}

async function announceRequest(friendId) {
  let name = 'Someone';
  try {
    const { data } = await supabase
      .from('profiles').select('display_name').eq('id', friendId).single();
    if (data?.display_name) name = data.display_name;
  } catch { /* name is a nicety; the notification still fires without it */ }
  notifyFriendRequest(name);
}

function close() {
  if (!channel) return;
  supabase.removeChannel(channel);
  channel = null;
}

/** Begin (or switch to) live updates for the signed-in user. */
export function startFriendsRealtime(userId) {
  if (userId === currentUserId && channel) return;
  close();
  currentUserId = userId;
  paused = false;
  open();
}

/** Tear down on sign-out. */
export function stopFriendsRealtime() {
  currentUserId = null;
  close();
}

/** Close the socket while backgrounded; reopen on resume. */
export function pauseFriendsRealtime() {
  paused = true;
  close();
}

export function resumeFriendsRealtime() {
  paused = false;
  open();
}
