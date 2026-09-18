'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, FileUIPart, TextUIPart, UIMessage } from 'ai'
import { useCallback, useEffect } from 'react'
import { useChatMessageStorage } from '@/hooks/useChatMessageStorage'
import { uploadMessageContents } from '@/utils/uploadMessageContents'
import { ChatView } from '@chat/ui/components/ChatView'
import { ClearChatIcon } from '@chat/ui/components/ClearChatIcon'
import type { WhiteboardMetadata, WhiteboardImage } from '@chat/ui/types'
import { toChatMessage } from '../utils/toChatMessage'


export function Chat() {
	// store chat messages locally in the browser
	const [initialMessages, saveMessages] = useChatMessageStorage()

	if (!initialMessages) return null

	return <ChatInner initialMessages={initialMessages} saveMessages={saveMessages} />
}

function ChatInner({
	initialMessages,
	saveMessages,
}: {
	initialMessages: UIMessage[]
	saveMessages: (messages: UIMessage[]) => void
}) {

	// We use the Vercel AI SDK's useChat hook to send messages to the server and manage the chat
	// history. You could replace this with your own chat implementation.
	const chat = useChat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
			prepareSendMessagesRequest: async (options) => {
				const { messagesToSend, messagesToSave } = await uploadMessageContents(options.messages)
				chat.setMessages(messagesToSave)
				return {
					body: {
						...options.body,
						id: options.id,
						messages: messagesToSend,
						trigger: options.trigger,
						messageId: options.messageId,
					},
				}
			},
		}),
		messages: initialMessages,
	})

	const { sendMessage, status, error, clearError, setMessages } = chat

	// save the chat messages to local storage when the chat finishes
	useEffect(() => {
		if (chat.status === 'ready') {
			saveMessages(chat.messages)
		}
	}, [chat.status, chat.messages, saveMessages])

	// If the chat encounters an error, we alert the user and clear the error.
	useEffect(() => {
		if (error) {
			alert(error.message)
			clearError()
		}
	}, [error, clearError])

	// when the user send a message, we take the text they've written and any images / sketches
	// they've attached and send them to the model.
	const handleSendMessage = useCallback(
		(text: string, images: WhiteboardImage[]) => {

			const parts: (TextUIPart | FileUIPart)[] = images.map((image): FileUIPart => {
				const tldrawMetadata: WhiteboardMetadata = {
					snapshot: image.snapshot,
					imageName: image.name,
				}
				return {
					type: 'file',
					url: image.url,
					filename: image.name,
					mediaType: image.type,
					providerMetadata: { tldraw: tldrawMetadata } as any,
				}
			})

			if (text.trim()) {
				parts.push({ type: 'text', text })
			}

			void sendMessage({ parts })
		},
		[sendMessage]
	)

	const handleClearChat = useCallback(() => {
		setMessages([])
		saveMessages([])
	}, [setMessages, saveMessages])

	const visibleMessages = chat.messages.filter((message) =>
		message.role !== 'assistant' || message.parts.some((part) => part.type === 'file' || part.type === 'text')
	).map(toChatMessage)
	const thinking = chat.messages.some((message) =>
		message.role === 'assistant' && !message.parts.some((part) => part.type === 'file' || part.type === 'text')
	)

	return (
		<ChatView
			messages={visibleMessages}
			onSendMessage={handleSendMessage}
			disabled={status !== 'ready'}
			isSending={status === 'submitted' || status === 'streaming'}
			emptyTitle="How can I help?"
			header={<button className="icon-button" onClick={handleClearChat} title="Clear chat"><ClearChatIcon /></button>}
			afterMessages={thinking ? <div className="message incoming-message thinking-message"><div className="thinking-text">Thinking…</div></div> : null}
		/>
	)
}
