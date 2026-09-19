import type { ChatMessageData } from '../types/chat'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
	message: ChatMessageData
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {

	return (
		<div
			className={`message-group ${message.isMine ? 'outgoing-message' : 'incoming-message'}`}
		>
			{message.parts.map((part, index) => {
				if (part.type === 'file') {
					return (
						<div key={index} className="message message-image">
							<img src={part.url} alt={part.filename || 'Whiteboard'} className="message-image-content" />
						</div>
					)

				}

				if (part.type === 'text') {
					return (
						<div key={index} className="message message-text">
							<ReactMarkdown>{part.text}</ReactMarkdown>
						</div>
					)
				}

				return null
			})}
		</div>
	)
})
