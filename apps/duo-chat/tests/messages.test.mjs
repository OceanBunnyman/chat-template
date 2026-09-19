import test from 'node:test'
import assert from 'node:assert/strict'
import { appendMessage, isBroadcastMessage, randomId } from '../src/lib/messages.ts'
const message = { id: 'm1', senderId: 'alice', nickname: 'Alice', text: 'hello', createdAt: new Date().toISOString() }
test('reject malformed, empty and oversized broadcasts', () => {
  assert.equal(isBroadcastMessage(message), true)
  for (const bad of [null, {}, {...message,text:''}, {...message,text:'x'.repeat(4001)}, {...message,createdAt:'invalid'}, {...message,nickname:42}]) assert.equal(isBroadcastMessage(bad), false)
})
test('retries with the same message id do not duplicate messages', () => {
  const messages = appendMessage([],message)
  assert.equal(appendMessage(messages,{...message}),messages)
  assert.equal(appendMessage(messages,{...message,id:'m2'}).length,2)
})
test('temporary history is bounded', () => {
  const messages = Array.from({length:500},(_,i)=>({...message,id:String(i)}))
  assert.equal(appendMessage(messages,message).length,500)
  assert.equal(appendMessage(messages,message)[0].id,'1')
})
test('room ids contain 128 bits of random data', () => {
  const a = randomId()
  assert.match(a,/^[a-f0-9]{32}$/)
  assert.notEqual(a,randomId())
})
