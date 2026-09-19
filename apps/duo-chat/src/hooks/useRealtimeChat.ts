'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import { appendMessage, isBroadcastMessage, MAX_TEXT_LENGTH, randomId, type BroadcastMessage } from '../lib/messages'

export function useRealtimeChat(roomId: string, senderId: string, nickname: string) {
  const [messages, setMessages] = useState<BroadcastMessage[]>([])
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [peers, setPeers] = useState<string[]>([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const ready = useRef(false)
  const pending = useRef<BroadcastMessage | null>(null)

  useEffect(() => {
    let active = true
    let cleanup = () => {}
    ready.current = false
    setStatus('connecting')
    setError('')
    setPeers([])
    try {
      const client = getSupabase()
      const channel = client.channel(`duo:${roomId}`, {
        config: { broadcast: { self: false, ack: true }, presence: { key: senderId } },
      })
      channelRef.current = channel
      channel.on('broadcast', { event: 'message' }, ({ payload }) => {
        if (active && isBroadcastMessage(payload)) setMessages(items => appendMessage(items, payload))
      }).on('presence', { event: 'sync' }, () => {
        if (!active) return
        const others = Object.entries(channel.presenceState<{ nickname: string }>())
          .filter(([id]) => id !== senderId)
          .map(([, entries]) => typeof entries[0]?.nickname === 'string' ? entries[0].nickname.slice(0, 40) : '朋友')
        setPeers(others)
      }).subscribe(async state => {
        if (!active) return
        ready.current = state === 'SUBSCRIBED'
        setStatus(ready.current ? 'connected' : 'disconnected')
        if (state === 'SUBSCRIBED') {
          setError('')
          try {
            const result = await channel.track({ nickname })
            if (active && result !== 'ok') setError('在线状态更新失败，可尝试重新连接。')
          } catch {
            if (active) setError('在线状态更新失败，可尝试重新连接。')
          }
        } else {
          setPeers([])
          setError('连接中断，正在尝试恢复。离线期间的消息不会补发。')
        }
      })
      cleanup = () => { void client.removeChannel(channel) }
    } catch (cause) {
      setStatus('disconnected')
      setError(cause instanceof Error ? cause.message : '无法连接聊天室。')
    }
    return () => {
      active = false
      ready.current = false
      channelRef.current = null
      cleanup()
    }
  }, [roomId, senderId, nickname, attempt])

  const sendMessage = useCallback(async (text: string) => {
    const channel = channelRef.current
    if (!channel || !ready.current) throw new Error('尚未连接')
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) throw new Error('文字长度不符合要求')
    // Reuse the ID on retry: a lost acknowledgement must not duplicate the receiver's message.
    const message = pending.current?.text === trimmed ? pending.current : {
      id: randomId(), senderId, nickname, text: trimmed, createdAt: new Date().toISOString(),
    }
    pending.current = message
    const result = await channel.send({ type: 'broadcast', event: 'message', payload: message })
    if (result !== 'ok') throw new Error('服务器未确认发送')
    setMessages(items => appendMessage(items, message))
    pending.current = null
  }, [senderId, nickname])

  return { messages, status, peers, error, sendMessage, reconnect: () => setAttempt(value => value + 1) }
}
