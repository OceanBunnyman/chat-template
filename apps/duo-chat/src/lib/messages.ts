export interface BroadcastMessage {
  id: string
  senderId: string
  nickname: string
  text: string
  createdAt: string
}
export const MAX_TEXT_LENGTH = 4000
export function isBroadcastMessage(value: unknown): value is BroadcastMessage {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return ['id', 'senderId'].every(k => typeof v[k] === 'string' && v[k].length > 0 && v[k].length <= 100)
    && typeof v.nickname === 'string' && v.nickname.trim().length > 0 && v.nickname.length <= 40
    && typeof v.text === 'string' && v.text.trim().length > 0 && v.text.length <= MAX_TEXT_LENGTH
    && typeof v.createdAt === 'string' && v.createdAt.length <= 40 && Number.isFinite(Date.parse(v.createdAt))
}
export function appendMessage(messages: BroadcastMessage[], message: BroadcastMessage) {
  return messages.some(item => item.id === message.id) ? messages : [...messages, message].slice(-500)
}
// getRandomValues also works on a phone accessing a local HTTP development server.
export function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
}
