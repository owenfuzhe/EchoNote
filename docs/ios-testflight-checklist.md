# EchoNote iOS TestFlight Checklist

## Current State

- Expo / EAS release scaffolding is present in [mobile/app.json](/Users/bytedance/Echonote/mobile/app.json) and [mobile/eas.json](/Users/bytedance/Echonote/mobile/eas.json).
- `eas-cli` is installed locally in [mobile/package.json](/Users/bytedance/Echonote/mobile/package.json).
- The core MVP path is already testable:
  - link import
  - article reading
  - AI chat
  - quick-read / explore / briefing / podcast
  - voice capture MVP

## Blockers Before TestFlight

1. Add release assets.
   - App icon
   - Splash / launch image
   - Optional App Store marketing icon

2. Prepare Apple credentials.
   - Apple Developer account access
   - App Store Connect app record
   - Bundle ID confirmation: `com.echonote.mobile`

3. Verify production env values for the app build.
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - optional fallback values only if truly needed for release

4. Run one real device regression round.
   - import WeChat article
   - open source page / snapshot / plain text
   - AI chat
   - voice capture -> refine -> save note

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

- AI jobs/artifacts are not yet durable enough for store-grade reliability; current backend storage still needs persistence work.
- Voice capture is MVP-grade and should get one more round of permission/error polish before public release.
- AI assistant is already usable, but still needs clearer high-frequency actions instead of only generic chat.

## Recommended Next Order

1. Add icon and splash assets
2. Log in to EAS
3. Produce one `preview` iOS build
4. Test on one or two real devices
5. Persist AI jobs/artifacts
6. Polish voice capture and AI assistant
7. Ship TestFlight
