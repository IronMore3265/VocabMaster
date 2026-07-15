// In-app update check against GitHub Releases. Compares the built version to the
// latest published release; on Android it can download the APK and launch the
// system installer in-app (via the native ApkInstaller plugin), otherwise it
// falls back to opening the download in the browser.
import { Capacitor, registerPlugin } from '@capacitor/core';

const GITHUB_REPO = 'IronMore3265/VocabMaster';

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

/** Fetches the latest release and reports whether it is newer than `current`. */
export async function checkForUpdate(current) {
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
    url: apk?.browser_download_url || rel.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
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
