export interface PngAttachment {
  filename: string
  mediaType: 'image/png'
  url: string
}
export const MAX_BROADCAST_BYTES = 220_000
export function messageBytes(value: unknown) { return new TextEncoder().encode(JSON.stringify(value)).byteLength }
function isPngAttachment(value: unknown): value is PngAttachment {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.mediaType === 'image/png' && typeof v.filename === 'string' && v.filename.length <= 150
    && typeof v.url === 'string' && v.url.length <= 180_000
    && /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(v.url)
}
export interface BroadcastMessage {
  id: string
  senderId: string
  nickname: string
  text: string
  attachments?: PngAttachment[]
  createdAt: string
}
export const MAX_TEXT_LENGTH = 4000
export function isBroadcastMessage(value: unknown): value is BroadcastMessage {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const hasAttachments = Array.isArray(v.attachments) && v.attachments.length > 0
  if (v.attachments !== undefined && (!Array.isArray(v.attachments) || v.attachments.length > 4 || !v.attachments.every(isPngAttachment))) return false
  if (messageBytes(v) > MAX_BROADCAST_BYTES) return false
  return ['id', 'senderId'].every(k => typeof v[k] === 'string' && v[k].length > 0 && v[k].length <= 100)
    && typeof v.nickname === 'string' && v.nickname.trim().length > 0 && v.nickname.length <= 40
    && typeof v.text === 'string' && (v.text.trim().length > 0 || hasAttachments) && v.text.length <= MAX_TEXT_LENGTH
    && typeof v.createdAt === 'string' && v.createdAt.length <= 40 && Number.isFinite(Date.parse(v.createdAt))
}
export function appendMessage(messages: BroadcastMessage[], message: BroadcastMessage) {
  if (messages.some(item => item.id === message.id)) return messages
  const next = [...messages, message].slice(-500)
  let bytes = next.reduce((sum, item) => sum + messageBytes(item), 0)
  while (next.length > 1 && bytes > 8_000_000) bytes -= messageBytes(next.shift()!)
  return next
}
// getRandomValues also works on a phone accessing a local HTTP development server.
export function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** Convert only displayable PNGs and text; never transmit editable snapshots. */
export function messageParts(message: BroadcastMessage) {
  return [
    ...(message.attachments ?? []).map(image => ({ type: 'file' as const, ...image })),
    ...(message.text ? [{ type: 'text' as const, text: message.text }] : []),
  ]
}
