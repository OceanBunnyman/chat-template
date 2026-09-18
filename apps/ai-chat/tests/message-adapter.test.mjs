import assert from 'node:assert/strict'
import test from 'node:test'
import { toChatMessage } from '../src/utils/toChatMessage.ts'

test('legacy AI history retains part order and editable board metadata without mutation', () => {
  const board = { snapshot: { document: {} }, imageName: 'board.png' }
  const message = { id: 'one', role: 'user', parts: [
    { type: 'text', text: 'Before image' },
    { type: 'file', url: 'data:image/png;base64,AA==', filename: 'board.png', mediaType: 'image/png', providerMetadata: { tldraw: board } },
    { type: 'text', text: 'After image' },
  ] }
  const before = structuredClone(message)
  const result = toChatMessage(message)
  assert.equal(result.isMine, true)
  assert.deepEqual(result.parts.map(p => p.type), ['text', 'file', 'text'])
  assert.equal(result.parts[1].whiteboard, board)
  assert.equal(result.parts[1].url, message.parts[1].url)
  assert.deepEqual(message, before)
  assert.equal('providerMetadata' in result.parts[1], false)
})

test('assistant text is incoming and SDK-only parts stay out of the shared UI', () => {
  const result = toChatMessage({ id: 'two', role: 'assistant', parts: [
    { type: 'reasoning', text: 'private reasoning' },
    { type: 'text', text: 'Hello' },
  ] })
  assert.deepEqual(result, { id: 'two', isMine: false, parts: [{ type: 'text', text: 'Hello' }] })
})
