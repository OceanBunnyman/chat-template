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

Existing root `.env.local` was moved there during the workspace migration. Environment files remain ignored. Duo has no AI dependency or AI endpoint and needs no credentials yet. Its current homepage is a scaffold; room creation, invitations and realtime messaging are not implemented.

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
