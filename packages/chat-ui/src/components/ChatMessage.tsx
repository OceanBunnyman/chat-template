import type { ChatMessageData, ImageClickTarget } from '../types/chat'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileHelpers } from 'tldraw'

interface ChatMessageProps {
	message: ChatMessageData
	onImageClick: (opts: ImageClickTarget) => void
}

export const ChatMessage = memo(function ChatMessage({ message, onImageClick }: ChatMessageProps) {

	return (
		<div
			className={`message-group ${message.isMine ? 'outgoing-message' : 'incoming-message'}`}
		>
			{message.parts.map((part, index) => {
				if (part.type === 'file') {
					// Editable board metadata belongs to the attachment.
					const tldrawMetadata = part.whiteboard
					const handleImageClick = async () => {
						// if we have a tldraw snapshot, we open the tldraw modal when it's clicked:
						if (tldrawMetadata) {
							onImageClick(tldrawMetadata)
						} else {
							const blob = await FileHelpers.urlToBlob(part.url)
							const file = new File([blob], part.filename || 'image.png', { type: blob.type })
							onImageClick({ uploadedFiles: [file] })
						}
					}

					return (
						<button
							key={index}
							aria-label="Open image"
							className="message message-image message-image-clickable"
							onClick={handleImageClick}
							type="button"
						>
							<img src={part.url} alt="Whiteboard" className="message-image-content" />
						</button>
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
