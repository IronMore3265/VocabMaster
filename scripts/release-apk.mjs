// Copies the signed release APK to the canonical release asset name
// `VocabMaster-v<version>.apk` (version from package.json) and prints the path.
// GitHub names a release asset after the file you upload, so uploading this
// copy keeps every release consistent and the in-app updater happy
// (src/lib/updates.js picks the asset ending in `.apk`).
//
// Usage:
//   node scripts/release-apk.mjs            # just produce the renamed copy
//   gh release create v<version> "$(node scripts/release-apk.mjs)"
import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const src = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!existsSync(src)) {
  console.error(`Signed APK not found at ${src}\nBuild it first: cd android && ./gradlew assembleRelease --no-daemon`);
  process.exit(1);
}

const dest = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', `VocabMaster-v${version}.apk`);
copyFileSync(src, dest);
// stdout is only the path, so it can be captured directly by `gh release create`.
process.stdout.write(dest);
