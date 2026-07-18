// A one-shot handoff from a graded exercise to the results screen, so results can
// show the session time + "new best" without threading extra route params.
// The exercise sets it right before navigating; results takes (and clears) it once.
let summary = null;

export function setSessionSummary(s) {
  summary = s;
}

/** Returns the pending summary once, then clears it. */
export function takeSessionSummary() {
  const s = summary;
  summary = null;
  return s;
}
