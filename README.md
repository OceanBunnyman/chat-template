# AI Chat and Duo Chat

Two Next.js apps share the chat UI and tldraw editor through an npm workspace.

## Development

```sh
npm ci
npm run dev:ai   # http://localhost:3000 (also npm run dev)
npm run dev:duo  # http://localhost:3001
```

AI configuration lives in `apps/ai-chat/.env.local`:

```dotenv
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Existing root `.env.local` was moved there during the workspace migration. Environment files remain ignored. Duo has no AI dependency or AI endpoint. It now supports temporary text conversations using Supabase Broadcast and Presence; configure it as described below.

## Structure

- `apps/ai-chat/src/components/Chat.tsx`: AI transport, history and AI-only states.
- `apps/ai-chat/src/utils/toChatMessage.ts`: converts SDK messages to shared display data; original stored messages are unchanged.
- `apps/ai-chat/src/app/api/`: AI chat and Google file-upload endpoints.
- `apps/duo-chat/`: independent application entry point for two-person chat.
- `packages/chat-ui/src/components/ChatView.tsx`: layout, drag/drop and draft editing.
- `packages/chat-ui/src/components/`: shared message list, composer, image preview, icons and whiteboard.
- `packages/chat-ui/src/types/chat.ts`: SDK-independent message parts and board metadata.
- `packages/chat-ui/src/hooks/`: input state and scrolling.
- `packages/chat-ui/src/styles/chat.css`: shared styles.

Shared components accept data and callbacks. They do not call AI APIs or know about room storage. `ChatView.onSendMessage` can return a promise; the draft clears after it resolves and stays on rejection. AI keeps its existing SDK-controlled error handling and clears the draft when submitting. Thinking indicators are supplied by the AI app through a UI slot.

## Checks and builds

```sh
npm run typecheck
npm test            # message compatibility tests; Node 22.18+ or 24
npm run build       # both apps
npm run build:ai
npm run build:duo
npm run start       # AI production server, port 3000
npm run start:duo    # Duo production server, port 3001
```

Use the root `package-lock.json` and install from the repository root. Each app has its own Next config, build output and environment files. Existing browser history is retained when the AI app is served on the same origin (hostname and port).

## Deployment layout

The intended Vercel projects use `apps/ai-chat` and `apps/duo-chat` as their respective Root Directories, with workspace files outside the app directory available to the build. Configure credentials separately; the Duo project does not need the Google AI key. This refactor does not create or deploy Vercel projects.

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/char-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).

## Duo Broadcast prototype

1. Create a Supabase project and obtain its Project URL and **publishable** key.
2. Copy `apps/duo-chat/.env.example` to `apps/duo-chat/.env.local` and replace the placeholders. Never use a secret/service-role key in a `NEXT_PUBLIC_` variable.
3. Ensure the project allows public Realtime channels. This version uses public Broadcast/Presence: no tables, SQL migrations, Auth or Storage setup is required.
4. Restart `npm run dev:duo`, open `http://localhost:3001`, click 创建聊天, enter a nickname and join.
5. Copy the invitation link into a second browser/window, enter another nickname and join. Both clients should see presence and exchange text.
6. For phone testing, open the site using the computer's reachable LAN IP **before** copying the invitation, so the link does not contain localhost. Manual copying is available when HTTP blocks clipboard access.

This is a temporary online prototype, not an authenticated private two-person room. Anyone with the room link can join; no strict two-person limit is enforced and sender identities are client-declared. Messages are only in page memory (latest 500), refresh clears them, and offline/late joiners receive no history. Server acknowledgement is not a delivery/read receipt. Failed sends keep the draft and reuse the message ID on retry. Messages are limited to 4,000 characters. Images, board attachments, snapshots, QR codes and durable history are deferred; AI's attachment tools remain available.

The existing shared `ChatView` is reused; `attachmentsEnabled={false}` hides attachment controls in Duo and `centeredEmpty={false}` keeps the invitation/status header visible before the first message. The AI defaults are unchanged.

Communication follows the official [Realtime Chat](https://supabase.com/library/docs/nextjs/realtime-chat), [Broadcast](https://supabase.com/docs/guides/realtime/broadcast) and [Presence](https://supabase.com/docs/guides/realtime/presence) patterns, with our own hook, payload validation and retry deduplication. The official UI is not installed.

Manual acceptance: exchange messages both ways; verify different rooms do not receive each other's messages; close a peer and check presence updates; reconnect after disabling the network; verify failures preserve drafts; refresh and verify history disappears as documented. A real Supabase project is required for these network checks.

Optional real-service smoke test (uses `.env.local` and temporary test channels): `node apps/duo-chat/tests/realtime-smoke.mjs`. Checks bidirectional messaging, channel separation, server acknowledgements and presence join/leave.
