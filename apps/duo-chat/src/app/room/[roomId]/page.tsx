import { notFound } from 'next/navigation'
import { DuoRoom } from '../../../components/DuoRoom'

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  if (!/^[a-f0-9]{32}$/.test(roomId)) notFound()
  return <DuoRoom key={roomId} roomId={roomId} />
}
