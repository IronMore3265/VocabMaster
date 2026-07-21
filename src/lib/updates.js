// In-app update check against GitHub Releases. Compares the built version to the
// latest published release; on Android it can download the APK and launch the
// system installer in-app (via the native ApkInstaller plugin), otherwise it
// falls back to opening the download in the browser.
import { Capacitor, registerPlugin } from '@capacitor/core';

const GITHUB_REPO = 'IronMore3265/VocabMaster';

// The `latest/download/<name>` URL always resolves to the newest release's asset
// of that fixed name, served from GitHub's release download CDN — which, unlike
// the REST API, is not capped at 60 requests/hour per IP. Checking updates through
// a small manifest there means a user behind a shared/CGNAT mobile IP (or one
// whose network blocks api.github.com) stops hitting "check failed".
const RELEASES_LATEST = `https://github.com/${GITHUB_REPO}/releases/latest`;
const MANIFEST_URL = `${RELEASES_LATEST}/download/latest.json`;

/** The GitHub releases page, for the manual-update fallback link. */
export const RELEASES_URL = RELEASES_LATEST;

const ApkInstaller = registerPlugin('ApkInstaller');

/** True when the native installer is available (i.e. running inside the APK). */
export function canInstallInApp() {
  return Capacitor.isNativePlatform();
}

/**
 * Downloads `url` and launches the Android package installer, reporting download
 * progress (0..1) through `onProgress`. Only call when canInstallInApp() is true.
 */
export async function installUpdate(url, onProgress) {
  let handle = null;
  if (onProgress) {
    handle = await ApkInstaller.addListener('downloadProgress', (e) => onProgress(e?.progress ?? 0));
  }
  try {
    await ApkInstaller.installApk({ url });
  } finally {
    try { await handle?.remove?.(); } catch { /* listener already gone */ }
  }
}

/** Semver-ish compare of dotted numeric versions. 1 if a>b, -1 if a<b, 0 equal. */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/**
 * Reports whether a newer release exists than `current`. Prefers the CDN-served
 * manifest (no API rate limit); falls back to the REST API for releases published
 * before the manifest existed. Throws on total failure so the caller can surface
 * the real reason rather than a blanket "check failed".
 */
export async function checkForUpdate(current) {
  try {
    return await checkViaManifest(current);
  } catch (manifestErr) {
    try {
      return await checkViaApi(current);
    } catch {
      // The manifest error is the more informative one (the API is the fallback).
      throw manifestErr;
    }
  }
}

/** Primary path: a fixed-name JSON asset on the release download CDN. */
async function checkViaManifest(current) {
  const res = await fetch(MANIFEST_URL, { redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error(`Update check failed (HTTP ${res.status})`);
  const m = await res.json();
  const latest = String(m.version || '').replace(/^v/, '');
  if (!latest) throw new Error('Update manifest missing a version');
  return {
    current,
    latest,
    hasUpdate: compareVersions(latest, current) > 0,
    url: m.apk
      ? `${RELEASES_LATEST}/download/${m.apk}`
      : RELEASES_LATEST,
    name: m.name || `v${latest}`,
  };
}

/** Fallback path: GitHub REST API (rate-limited to 60/hr per IP). */
async function checkViaApi(current) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const rel = await res.json();
  const latest = String(rel.tag_name || '').replace(/^v/, '');
  const apk = (rel.assets || []).find((a) => String(a.name || '').toLowerCase().endsWith('.apk'));
  return {
    current,
    latest,
    hasUpdate: !!latest && compareVersions(latest, current) > 0,
    url: apk?.browser_download_url || rel.html_url || RELEASES_LATEST,
    name: rel.name || `v${latest}`,
  };
}

/** Opens a URL outside the app (system browser). */
export function openExternal(url) {
  try {
    window.open(url, '_blank', 'noopener');
  } catch {
    location.href = url;
  }
}
