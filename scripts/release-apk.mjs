// Prepares the two release assets the in-app updater needs and prints their paths
// (newline-separated), so `gh release create` can upload both at once:
//   1. `VocabMaster-v<version>.apk` — a copy of the signed APK under the canonical
//      name (src/lib/updates.js builds its download URL from this name).
//   2. `latest.json` — a tiny manifest fetched from the release *download CDN*
//      (github.com/.../releases/latest/download/latest.json), which is NOT capped
//      like the REST API. The updater reads this first so users behind shared/CGNAT
//      mobile IPs stop hitting the API rate limit and "check failed".
//
// Usage:
//   node scripts/release-apk.mjs            # produce the renamed APK + latest.json
//   gh release create v<version> $(node scripts/release-apk.mjs)
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const outDir = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release');
const src = join(outDir, 'app-release.apk');
if (!existsSync(src)) {
  console.error(`Signed APK not found at ${src}\nBuild it first: cd android && ./gradlew assembleRelease --no-daemon`);
  process.exit(1);
}

const apkName = `VocabMaster-v${version}.apk`;
const apkDest = join(outDir, apkName);
copyFileSync(src, apkDest);

// The manifest must carry a fixed asset name so `latest/download/latest.json`
// always resolves. `apk` is the APK's fixed name; the updater builds the download
// URL as `latest/download/<apk>`.
const manifestDest = join(outDir, 'latest.json');
writeFileSync(manifestDest, `${JSON.stringify({
  version,
  apk: apkName,
  name: `v${version}`,
}, null, 2)}\n`);

// stdout is only the two paths (newline-separated) so `gh release create` can take
// them as its asset arguments directly.
process.stdout.write(`${apkDest}\n${manifestDest}`);
