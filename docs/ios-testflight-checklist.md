# EchoNote iOS TestFlight Checklist

## Current State

- Expo / EAS release scaffolding is present in [mobile/app.json](/Users/bytedance/Echonote/mobile/app.json) and [mobile/eas.json](/Users/bytedance/Echonote/mobile/eas.json).
- `eas-cli` is installed locally in [mobile/package.json](/Users/bytedance/Echonote/mobile/package.json).
- Release assets are now wired in:
  - [icon.png](/Users/bytedance/Echonote/mobile/assets/icon.png)
  - [splash.png](/Users/bytedance/Echonote/mobile/assets/splash.png)
- Bundle ID is confirmed as `com.crispyideas.echonote`.
- The core MVP path is already testable:
  - link import
  - article reading
  - AI chat
  - quick-read / explore / briefing / podcast
  - voice capture MVP

## Blockers Before TestFlight

1. Prepare App Store Connect metadata.
   - App Store Connect app record
   - screenshots
   - app description / subtitle / keywords
   - privacy policy URL

2. Verify production env values for the app build.
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - optional fallback values only if truly needed for release
   - Render `DATABASE_URL` if you want durable AI jobs/artifacts in production

3. Run one real device regression round.
   - import WeChat article
   - open source page / snapshot / plain text
   - AI chat
   - voice capture -> refine -> save note
   - AI assistant -> mic -> record -> send to AI

## Commands

From [mobile](/Users/bytedance/Echonote/mobile):

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run typecheck
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx eas login
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run eas:build:preview
```

When preview is stable:

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run eas:build:prod
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run eas:submit:ios
```

## Release Risks Still Open

- AI jobs/artifacts support durable storage in code, but the live Render service still needs `DATABASE_URL` to avoid memory-only fallback.
- Voice capture has been simplified to an explicit start/stop flow, but still needs one full real-device regression round before public release.
- The AI assistant is now on a clearer single-screen path, but still needs product wording and empty/error-state polish after real usage.

## Recommended Next Order

1. Produce one fresh `preview` iOS build
2. Run real-device regression on one or two iPhones
3. Configure Render `DATABASE_URL`
4. Create App Store Connect metadata and screenshots
5. Produce `production` build
6. Submit to TestFlight / App Store
