'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { useChatInputState } from '../hooks/useChatInputState'
import { useScrollToBottom } from '../hooks/useScrollToBottom'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import type { ChatMessageData, ImageClickTarget, WhiteboardImage } from '../types/chat'

interface ChatViewProps {
	messages: ChatMessageData[]
	onSendMessage: (text: string, images: WhiteboardImage[]) => void | Promise<void>
	disabled?: boolean
	isSending?: boolean
	emptyTitle: string
	header?: ReactNode
	afterMessages?: ReactNode
}

export function ChatView({ messages, onSendMessage, disabled = false, isSending = false, emptyTitle, header, afterMessages }: ChatViewProps) {
	const [chatInputState, chatInputDispatch] = useChatInputState()
	const scrollToBottom = useScrollToBottom()
	useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])
	const handleImageClick = useCallback((opts: ImageClickTarget) => {
		chatInputDispatch({ type: 'openWhiteboard', ...opts })
	}, [chatInputDispatch])
	const sendDraft = async (text: string, images: WhiteboardImage[]) => {
		await onSendMessage(text, images)
		chatInputDispatch({ type: 'clear' })
	}
	// users can drag and drop images to the chat input area to add them to their message. when
	// they're dragging we keep track of a special isDragging state.
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		if (
			e.dataTransfer.types.includes('Files') &&
			!chatInputState.openWhiteboard &&
			!chatInputState.isDragging
		) {
			chatInputDispatch({ type: 'dragEnter' })
		}
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			chatInputDispatch({ type: 'dragLeave' })
		}
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		const files = Array.from(e.dataTransfer.files).filter((file) =>
			file.type.startsWith('image/')
		)
		if (files.length > 0 && !chatInputState.openWhiteboard) {
			chatInputDispatch({ type: 'drop', files })
		} else {
			chatInputDispatch({ type: 'dragLeave' })
		}
	}

	// if the chat is empty, we put the input area right in the middle of the page
	if (messages.length === 0) {
		return (
			<div
				className="empty-chat-container"
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<div className="empty-chat-content">
					<h1 className="empty-chat-title">{emptyTitle}</h1>
					<div className="centered-input">
						<ChatInput
							onSendMessage={sendDraft}
							disabled={disabled} isSending={isSending}
							scrollToBottom={scrollToBottom}
							state={chatInputState}
							dispatch={chatInputDispatch}
						/>
					</div>
				</div>
			</div>
		)
	}

	// otherwise, we show the chat history and the input area at the bottom.
	return (
		<div
			className="chat-container"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{header ? <div className="chat-header">{header}</div> : null}
			<MessageList messages={messages} onImageClick={handleImageClick} />
			{afterMessages}
			<div className="chat-footer">
				<ChatInput
					onSendMessage={sendDraft}
					disabled={disabled} isSending={isSending}
					scrollToBottom={scrollToBottom}
					state={chatInputState}
					dispatch={chatInputDispatch}
				/>
			</div>
		</div>
	)
}
