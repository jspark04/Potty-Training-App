# Potty Pal

A potty-training timer and journey log. No account, no subscription; everything stays on the device.

- **Today** – countdown to the next try (10 min – 2 hr), pause / nap / end day, snooze, one-tap logging
  (pee, poop, sat & tried, accident) with undo, and a little celebration for every success.
- **Journey** – day-by-day timeline with stars, notes, "asked to go" markers; edit or back-fill any moment.
- **Insights** – success rate, dry streak, typical gap between pees, when accidents happen, and a
  suggestion to stretch (or shorten) the interval.
- **Settings** – name, interval, alerts, CSV export, backup / restore.

## Android app

The Android app is the web app in a [Capacitor](https://capacitorjs.com) shell. It schedules the next
"potty time" as a system alarm, so it rings with the app closed or the phone locked.

Every push builds an APK (`.github/workflows/android.yml`). Download `potty-pal-apk` from the run's
**Artifacts** on the repo's Actions tab, unzip, and open `app-debug.apk` on the phone.

### Google Play

With the repository secrets `UPLOAD_KEYSTORE_BASE64` (a base64-encoded PKCS12 keystore, key alias
`upload`) and `UPLOAD_KEYSTORE_PASSWORD` set, each run also produces `potty-pal-play-bundle`
(`app-release.aab`), signed and ready to upload in Play Console. The version code is the run number.

To build locally (needs Android Studio / the Android SDK and JDK 21):

```sh
npm install
npm run android        # build web, sync, open in Android Studio
```

## Develop

```sh
npm run dev            # browser version at http://localhost:5173
npm test               # timer + insights unit tests
npm run build
```

Code map: `src/lib/session.ts` (timer state), `src/lib/insights.ts` (stats), `src/lib/alerts.ts`
(sound, haptics, notifications), `src/components/*` (screens), `android/` (native project).
