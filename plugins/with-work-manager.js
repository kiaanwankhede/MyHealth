// The home-screen widget library pulls in WorkManager 2.8.1, whose database fails to start
// in release builds next to the newer Room other libraries bring (the app crashed on launch).
// Depending on a newer WorkManager in the app makes Gradle use that version everywhere.
const { withAppBuildGradle } = require('expo/config-plugins');

const WORK_VERSION = '2.10.0';
// work-runtime-ktx too: the steps notification's background task asks for an older ktx.
const LINE = [
  `    implementation("androidx.work:work-runtime:${WORK_VERSION}")`,
  `    implementation("androidx.work:work-runtime-ktx:${WORK_VERSION}")`,
].join('\n');

module.exports = function withWorkManager(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('androidx.work:work-runtime')) {
      c.modResults.contents = c.modResults.contents.replace(/dependencies\s*\{/, (m) => `${m}\n${LINE}`);
    }
    return c;
  });
};
