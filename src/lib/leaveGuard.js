// A one-slot "are you sure you want to leave?" guard for back navigation.
//
// An exercise registers a guard on mount; main.js's back handlers (the header
// back button and the Android hardware back) call runLeaveGuard() first. If a
// guard is set it takes over — typically showing a confirm sheet — and returns
// true so the caller does not also navigate. The guard is responsible for calling
// clearLeaveGuard() + navigating once the user confirms.
let guard = null;

export function setLeaveGuard(fn) {
  guard = fn;
}

export function clearLeaveGuard() {
  guard = null;
}

/** Runs the active guard, if any. Returns true when it handled (blocked) the back. */
export function runLeaveGuard() {
  if (!guard) return false;
  guard();
  return true;
}
