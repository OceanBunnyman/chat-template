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
const png = { filename: 'board.png', mediaType: 'image/png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=' }
test('PNG-only messages and text with PNGs are accepted', () => {
  assert.equal(isBroadcastMessage({...message, text:'', attachments:[png]}), true)
  assert.equal(isBroadcastMessage({...message, attachments:[png]}), true)
})
test('reject non-PNG URLs, oversized attachments and empty messages', () => {
  for (const attachments of [[{...png,url:'https://example.com/image.png'}], [{...png,url:'data:image/svg+xml;base64,AAAA'}], [{...png,url:png.url+'A'.repeat(180000)}], Array(5).fill(png), {}]) {
    assert.equal(isBroadcastMessage({...message,attachments}),false)
  }
  assert.equal(isBroadcastMessage({...message,text:'',attachments:[]}),false)
})
test('attachment history is bounded by memory as well as count', () => {
  const large = {...message, attachments:[{...png,url:'data:image/png;base64,iVBORw0KGgo'+'A'.repeat(170000)}]}
  let items=[]
  for(let i=0;i<100;i++) items=appendMessage(items,{...large,id:String(i)})
  assert.ok(items.length<50)
  assert.equal(items.at(-1).id,'99')
})
