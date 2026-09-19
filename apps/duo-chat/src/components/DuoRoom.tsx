'use client'
import { useMemo, useState, type FormEvent } from 'react'
import { ChatView } from '@chat/ui/components/ChatView'
import { MAX_TEXT_LENGTH, randomId } from '../lib/messages'
import { useRealtimeChat } from '../hooks/useRealtimeChat'

export function DuoRoom({ roomId }: { roomId: string }) {
  const [nickname, setNickname] = useState('')
  const [participant, setParticipant] = useState<{ id: string; name: string } | null>(null)
  function join(event: FormEvent) {
    event.preventDefault()
    if (nickname.trim()) setParticipant({ id: randomId(), name: nickname.trim() })
  }
  if (!participant) return <main className="duo-entry">
    <form className="duo-card" onSubmit={join}>
      <h1>加入对话</h1>
      <p>取一个昵称，和朋友开始聊天。</p>
      <label htmlFor="nickname">昵称</label>
      <input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={40} required autoComplete="nickname" />
      <button disabled={!nickname.trim()}>加入聊天</button>
      <p className="duo-note">临时文字聊天室：刷新后记录消失。任何持有链接的人都能加入。</p>
      <a href="/">返回首页</a>
    </form>
  </main>
  return <ConnectedRoom roomId={roomId} participant={participant} />
}

function ConnectedRoom({ roomId, participant }: { roomId: string; participant: { id: string; name: string } }) {
  const chat = useRealtimeChat(roomId, participant.id, participant.name)
  const [copyState, setCopyState] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const messages = useMemo(() => chat.messages.map(message => ({
    id: message.id, isMine: message.senderId === participant.id,
    parts: [{ type: 'text' as const, text: message.text }],
  })), [chat.messages, participant.id])
  async function share() {
    const url = window.location.href
    setShareUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('链接已复制')
    } catch { setCopyState('请选中下面的链接复制') }
  }
  return <main className="tl-theme__light duo-room">
    <ChatView messages={messages} onSendMessage={chat.sendMessage}
      attachmentsEnabled={false} centeredEmpty={false} maxMessageLength={MAX_TEXT_LENGTH}
      disabled={chat.status !== 'connected'} emptyTitle="开始对话"
      header={<div className="duo-header">
        <div className="duo-header-row"><strong>Duo Chat · {participant.name}</strong><button onClick={share}>复制邀请链接</button><a href="/">离开</a></div>
        <p role="status">{chat.status === 'connecting' ? '连接中…' : chat.status === 'disconnected' ? '未连接' : chat.peers.length ? `在线：${chat.peers.join('、')}` : '已连接 · 等待朋友加入'}</p>
        <p className="duo-note">临时文字聊天 · 刷新清空 · 离线消息不补发 · 链接可被多人加入</p>
        {copyState && <p role="status">{copyState}</p>}
        {shareUrl && <input aria-label="邀请链接" readOnly value={shareUrl} onFocus={e => e.target.select()} />}
        {chat.error && <p role="alert">{chat.error}</p>}
        {chat.status === 'disconnected' && <button onClick={chat.reconnect}>重新连接</button>}
      </div>} />
  </main>
}
