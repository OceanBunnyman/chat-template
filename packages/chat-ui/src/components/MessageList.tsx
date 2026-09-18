import type { ChatMessageData, ImageClickTarget } from '../types/chat'
import { memo } from 'react'
import { ChatMessage } from './ChatMessage'

interface MessageListProps {
	messages: ChatMessageData[]
	onImageClick: (target: ImageClickTarget) => void
}

export const MessageList = memo(function MessageList({ messages, onImageClick }: MessageListProps) {
	return (
		<div className="message-list">
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} onImageClick={onImageClick} />
			))}
		</div>
	)
})
