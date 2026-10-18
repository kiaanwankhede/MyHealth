# Sehat (सेहत)

Personal Android health tracker for Indian adults: steps, weight with a dated weight-loss goal, body
measures with Asian cut-offs, lab results, sleep, medicines. No calorie counting, no account, no ads.

Steps, weight, sleep and resting heart rate are read from **Health Connect** (Google Fit and most
watches/scales sync into it). Lab reports are typed in or imported from a PDF/photo, read on the phone.
All data stays on the phone.

## Status

| Roadmap step | Scope | State |
|---|---|---|
| 1. Foundation | Expo project, Health Connect access, Today screen with steps + latest weight | ✅ |
| 2. Weight & goal | Goal setup, trend/plan lines, ahead/behind, log a weigh-in | ✅ |
| 3. Steps & labs | Steps screen with retro goal, cholesterol lab reports, full Today screen | ✅ |
| 4. Indian health focus | Profile; Asian BMI and waist; HbA1c, BP, thyroid, vitamins, kidney, Lp(a); LAI LDL targets; last-7-days review; plateau alert | ✅ |
| 5. Safety net | Backup/restore and CSV export; reminders; medicines; doctor summary PDF | ✅ |
| 6. Less typing | Lab report import (PDF/photo, on-device OCR); sleep and resting heart rate; home-screen widget | ✅ |

## Stack

React Native + Expo (SDK 58) with Expo Router, `react-native-health-connect`, `expo-sqlite`,
`react-native-svg`, `expo-notifications`, `expo-print`, `react-native-android-widget`, and a small local
native module (`modules/sehat-pdf`: Android PdfRenderer + ML Kit text recognition, bundled model).

Every push also runs **Smoke test APK**: an x86_64 copy of the release build is installed on an Android
emulator and opened, and the log shows whether it stays up, any crash, and the text on screen.

## Install the APK

Every push builds the APK on GitHub Actions and publishes it as the latest release.

1. On your phone, open **https://github.com/kiaanwankhede/MyHealth/releases/latest/download/sehat.apk**
   (or the repo's **Releases → latest**) and download `sehat.apk`.
2. Open it and allow installing from your browser/Files app.
3. Set up Health Connect (see *On the phone* below), then open Sehat → **Allow access**.

Every build is signed with the same key, so a new APK installs over the old one and keeps your data.

## Run it on your phone (development)

Health Connect is a native module, so the app can't run in Expo Go — it needs a **development build**.

1. Install the tools once: `npm install`, then sign in to Expo with `npx eas-cli@latest login`
   (free account at expo.dev).
2. Build the development APK in the cloud (no Android Studio needed):

   ```sh
   npx eas-cli@latest build --profile development --platform android
   ```

   When it finishes, open the link on your phone and install the APK
   (allow "install unknown apps" for your browser when asked).
3. Start the dev server on your computer and open the app on the phone (same Wi-Fi):

   ```sh
   npm start
   ```

You only need to rebuild the APK when native dependencies or `app.json` change; JavaScript changes
load live from `npm start`.

For a standalone APK that runs without your computer: `npx eas-cli@latest build --profile preview --platform android`.

### On the phone

- Android 14+: Health Connect is built in (Settings → Security & privacy → Privacy → Health Connect).
  Older Android: install **Health Connect** from the Play Store.
- In **Google Fit** settings, turn on syncing with **Health Connect** so your steps and weight flow in.
- Open Sehat → **Allow access** and grant Steps and Weight.

## Development

```sh
npm test          # unit tests (jest-expo)
npm run typecheck # tsc --noEmit
```

Code lives in `src/`: routes in `src/app/` (Expo Router), Health Connect access in `src/health/`,
local storage (SQLite: goals, lab reports) in `src/db/`, pure helpers in `src/lib/`. All weight-goal maths is in
`src/lib/goal.ts`, step maths (including the retro goal) in `src/lib/steps.ts` and cholesterol ranges in
`src/lib/cholesterol.ts`, each covered by tests in `src/lib/__tests__/`.

### Home-screen widget

Long-press the home screen → Widgets → **Sehat** (4×2, resizable). It shows today's steps with a
progress bar, the retro-goal line and, when wide enough, the weight trend and goal status. It
updates whenever the app is opened and every 30 minutes in the background (steps only, if Health
Connect background access is allowed). Tap it to open Sehat.

The widget library uses WorkManager; `plugins/with-work-manager.js` makes the app use a current
WorkManager and `app.json` keeps Room's generated database classes from R8, which fixed the
launch crash in builds 9–10.

### Lab report import

Labs → Import → pick the report PDF or a photo. Pages are rendered at 3× and read with ML Kit on
the phone (nothing is uploaded); `src/lib/labImport.ts` rebuilds table rows from line positions,
matches Indian labs' test names, converts units and finds the collection date. The values open in
the lab form to check before saving.

### Retro step goal

Once today's step goal is met, Sehat checks whether today and yesterday together reach 2 × the goal;
if so, today plus the last two days against 3 × the goal, and so on, as far back as 1 January. It shows how many
days are covered and how many more steps would cover one more day.
