// In-app update check against GitHub Releases. The app has no auto-updater, so
// this compares the built version to the latest published release and points
// the user at the APK (or the release page) to install the new build.
const GITHUB_REPO = 'IronMore3265/VocabMaster';

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
