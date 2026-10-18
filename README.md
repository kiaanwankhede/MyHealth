# Sehat (सेहत)

Personal Android health tracker: steps, weight, cholesterol and a weight-loss goal with a target date.

Steps and weight are read from **Health Connect** (Google Fit and most watches/scales sync into it).
Cholesterol is entered by hand from lab reports. All data stays on the phone.

## Status

| Roadmap step | Scope | State |
|---|---|---|
| 1. Foundation | Expo project, Health Connect access, Today screen with steps + latest weight | ✅ |
| 2. Weight & goal | Goal setup, trend/plan lines, ahead/behind, log a weigh-in | ✅ |
| 3. Steps & labs | Steps screen with retro goal, cholesterol lab reports, full Today screen | ✅ |
| 4. Polish | Settings (step goal, height), reminders, CSV export, dark mode | next |

## Stack

React Native + Expo (SDK 58) with Expo Router, `react-native-health-connect`, `expo-sqlite`
(local storage, from step 2), `react-native-svg`.

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
progress bar, the retro-goal line, and — when wide enough — the weight trend and goal status. It
updates whenever the app is opened and every 30 minutes in the background (steps only, if Health
Connect background access is allowed; otherwise it shows the last values the app saw). Tap it to open
Sehat.

### Retro step goal

Once today's step goal is met, Sehat checks whether today and yesterday together reach 2 × the goal;
if so, today plus the last two days against 3 × the goal, and so on, as far back as 1 January. It shows how many
days are covered and how many more steps would cover one more day.
