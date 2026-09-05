# Gleami

Staff mobile app for Gleami — calendar, POS, clients, and services.

This repo is `glenntroncquo/salonify-app`. Product identity is **Gleami** (`com.gleami.staff`).

## Run locally

```bash
npm install
npx expo start
```

Then open the project in Expo Go, an iOS simulator, or an Android emulator.

## EAS / store builds

`eas.json` and the Gleami Expo identity are already in the repo:

- `name`: Gleami
- `slug` / `scheme`: `gleami`
- `ios.bundleIdentifier` / `android.package`: `com.gleami.staff`

`extra.eas.projectId` is **not** set. On a machine logged into Expo, run `eas init` once and commit the generated project id before `eas build`.

## Brand assets

Icons and splash in `assets/images/` are a **placeholder** Gleami mark (letter G on `#161616`). Replace `icon.png` (1024) and the Android adaptive / splash derivatives with the final brand artwork when it is ready.
