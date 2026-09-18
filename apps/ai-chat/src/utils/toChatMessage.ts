import type { UIMessage } from 'ai'
import type { ChatMessageData, ChatMessagePart, WhiteboardMetadata } from '@chat/ui/types'

/** Keep SDK roles and provider metadata out of the shared UI. */
export function toChatMessage(message: UIMessage): ChatMessageData {
  const parts: ChatMessagePart[] = []
  for (const part of message.parts) {
    if (part.type === 'text') parts.push({ type: 'text', text: part.text })
    if (part.type === 'file') parts.push({
      type: 'file', url: part.url, filename: part.filename, mediaType: part.mediaType,
      whiteboard: part.providerMetadata?.tldraw as WhiteboardMetadata | undefined,
    })
  }
  return { id: message.id, isMine: message.role === 'user', parts }
}
