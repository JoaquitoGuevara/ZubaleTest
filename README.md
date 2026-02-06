# Zubale Offline Auditor (Option 1)

Offline-first React Native app focused on Android low-end reliability.

## Goal

This app simulates field audit tasks that must continue working with no connectivity:

- Task updates always save locally first.
- Every local update is queued for later sync.
- Sync resumes automatically when connectivity returns.
- App restarts preserve tasks, queue, and conflicts.

## Stack

- React Native CLI `0.75.5`
- TypeScript
- Redux Toolkit + React Redux
- SQLite (`react-native-sqlite-storage`)
- NetInfo (`@react-native-community/netinfo`)
- Background fetch (`react-native-background-fetch`)
- Camera capture (`react-native-image-picker`)

## Android target

- `minSdkVersion 23` (Android 6.0)
- Tested build type: `debug` and intended final validation on `release`

## Main behavior

### Local-first writes

When a task is edited:

1. Local task row is updated in SQLite.
2. Existing queue entry for the task is replaced with a fresh sync payload.
3. UI status becomes `Pending Sync`.

### Sync cycle

A sync cycle can start from:

- Manual button (`Run Sync Now`)
- Network reconnect
- Background fetch event

For each queued item:

1. Queue item becomes `processing`.
2. Task status becomes `Syncing`.
3. Fake server applies update.
4. On success: queue item is removed and task becomes `Synced`.
5. On conflict: queue item is removed and task becomes `Conflict`.
6. On network/server error: queue item is scheduled with retry backoff and task becomes `Sync Error`.

### Conflict resolution

If server and local versions disagree:

- `Accept server`: keep server version and mark synced.
- `Retry local`: enqueue local payload again and run a new sync attempt.

## Fake backend model

No external backend is required.

The app includes an in-memory fake server gateway with two debug controls:

- `Fake server available` toggle
- `Force conflict on next sync` toggle

The sync engine still enforces real network checks using NetInfo, so airplane mode behavior is valid.

## Project structure

- `src/domain`: app domain types
- `src/infrastructure/database`: schema, seed, mapping, repository
- `src/infrastructure/fakeServer`: fake sync backend behavior
- `src/sync`: sync engine + background registration
- `src/state`: Redux store, slice, selectors, thunks
- `src/features`: list/details/debug UI
- `src/app/AppRoot.tsx`: app wiring and lifecycle integration

## Run locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start Metro

```bash
npm start
```

### 3. Build and install on Android

```bash
npm run android
```

### 4. Build APK directly

```bash
cd android
./gradlew assembleDebug
```

Generated APK:

- `android/app/build/outputs/apk/debug/app-debug.apk`

## Quality checks

```bash
npm run lint
npm run test -- --watch=false
npx tsc --noEmit
```

## Demo script (recommended)

1. Open task list.
2. Enable airplane mode.
3. Open a task, change status/notes, capture a photo, save.
4. Verify task shows `Pending Sync`.
5. Kill app and reopen.
6. Verify same task is still `Pending Sync`.
7. Disable airplane mode.
8. Wait for reconnect trigger or tap `Run Sync Now`.
9. Verify task moves to `Synced`.
10. Enable `Force conflict on next sync`, edit and save a task, sync.
11. Verify `Conflict` state and resolve via `Accept server` or `Retry local`.

## Notes for low-end Android devices

- UI is intentionally simple and lightweight.
- Data source is SQLite to keep memory stable.
- Sync queue stores one latest payload per task to avoid queue bloat.
- Camera capture uses moderate quality for lower file size.
