// Optional real-service check. Uses a random temporary channel and never prints credentials.
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
process.loadEnvFile(new URL('../.env.local', import.meta.url))
const clients = Array.from({length:3}, () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}))
const topic = `duo:smoke-${randomUUID()}`
const channels = clients.map((c,i)=>c.channel(i === 2 ? `${topic}-other` : topic,{config:{broadcast:{ack:true,self:false},presence:{key:String(i),enabled:true}}}))
const received = [[],[],[]]
const waitFor = async (check) => { const start=Date.now(); while(!check()) { if(Date.now()-start>15000) throw new Error('Timed out'); await new Promise(r=>setTimeout(r,100)) } }
try {
 await Promise.all(channels.map((channel,i)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Subscription timed out')),15000)
  channel.on('broadcast',{event:'message'},({payload})=>received[i].push(payload))
   .subscribe(state=>{if(state==='SUBSCRIBED'){clearTimeout(timer);resolve()}else if(['CHANNEL_ERROR','TIMED_OUT'].includes(state)){clearTimeout(timer);reject(new Error(state))}})
 })))
 await Promise.all(channels.map((c,i)=>c.track({nickname:`test-${i}`})))
 await waitFor(()=>Object.keys(channels[0].presenceState()).length===2)
 assert.equal(await channels[0].send({type:'broadcast',event:'message',payload:{text:'hello from A'}}),'ok')
 await waitFor(()=>received[1].length===1)
 assert.equal(await channels[1].send({type:'broadcast',event:'message',payload:{text:'reply from B'}}),'ok')
 await waitFor(()=>received[0].length===1)
 assert.equal(received[0][0].text,'reply from B')
 assert.equal(received[1][0].text,'hello from A')
 assert.equal(received[2].length,0)
 await clients[1].removeChannel(channels[1])
 await waitFor(()=>Object.keys(channels[0].presenceState()).length===1)
 console.log('PASS: bidirectional Broadcast, server acknowledgements, room isolation, Presence join/leave')
} finally { await Promise.all(clients.map(c=>c.removeAllChannels())); clients.forEach(c=>c.realtime.disconnect()) }
