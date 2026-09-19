'use client'
import { useRouter } from 'next/navigation'
import { randomId } from '../lib/messages'

export default function Home() {
  const router = useRouter()
  return <main className="duo-entry"><section className="duo-card">
    <h1>Duo Chat</h1>
    <p>分享一个链接，和朋友聊一会儿。</p>
    <button onClick={() => router.push(`/room/${randomId()}`)}>创建聊天</button>
    <p className="duo-note">文字试用版。消息只保留在当前页面，不保存历史。</p>
  </section></main>
}
