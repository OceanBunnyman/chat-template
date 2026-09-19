import type { ChatMessageData } from '../types/chat'
import { memo } from 'react'
import { ChatMessage } from './ChatMessage'

interface MessageListProps {
	messages: ChatMessageData[]
}

export const MessageList = memo(function MessageList({ messages }: MessageListProps) {
	return (
		<div className="message-list">
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} />
			))}
		</div>
	)
})
