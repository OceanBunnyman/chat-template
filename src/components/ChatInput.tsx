import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DefaultSpinner } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { ChatInputImage } from './ChatInputImage'
import { ImageIcon } from './icons/ImageIcon'
import { SendIcon } from './icons/SendIcon'
import { UploadIcon } from './icons/UploadIcon'
import { WhiteboardIcon } from './icons/WhiteboardIcon'
import { WhiteboardHandle, WhiteboardImage, WhiteboardModal } from './WhiteboardModal'

interface ChatInputProps {
	onSendMessage: (message: string, images: WhiteboardImage[]) => void
	waitingForResponse: boolean
	scrollToBottom: (behavior?: ScrollBehavior) => void
	state: ReturnType<typeof useChatInputState>[0]
	dispatch: ReturnType<typeof useChatInputState>[1]
}

export function ChatInput({
	onSendMessage,
	waitingForResponse,
	scrollToBottom,
	state,
	dispatch,
}: ChatInputProps) {
	const { input, images, openWhiteboard, isDragging } = state
	const [isExporting, setIsExporting] = useState(false)
	const [exportError, setExportError] = useState<string | null>(null)
	const whiteboardRef = useRef<WhiteboardHandle>(null)
	const sendingRef = useRef(false)
	const disabled = waitingForResponse || isDragging || isExporting

	const textareaRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		// focus the textarea when the input is enabled
		if (!disabled) textareaRef.current?.focus()
	}, [disabled])

	// Auto-resize textarea and scroll to bottom when content changes.
	useLayoutEffect(() => {
		if (textareaRef.current) {
			// Reset height to auto to get the correct scrollHeight
			textareaRef.current.style.height = 'auto'
			// Set height based on scrollHeight, with max height for ~5 lines
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
		}
	}, [input])

	// Scroll to bottom when images are added.
	useLayoutEffect(() => {
		scrollToBottom('instant')
	}, [images, scrollToBottom])

	// the user can only send a message if the input is not disabled and there are either images or
	// text ready to send
	const canSend = !disabled && (images.length > 0 || input.trim() || !!openWhiteboard)

	const send = async () => {
		if (!canSend || sendingRef.current) return
		sendingRef.current = true
		setIsExporting(true)
		setExportError(null)
		try {
			let attachments = images
			if (openWhiteboard) {
				if (!whiteboardRef.current) throw new Error('画板正在加载，请稍后再发送。')
				const image = await whiteboardRef.current.exportImage()
				attachments = images.filter((item) => item.id !== openWhiteboard.id)
				if (image) attachments = [...attachments, image]
			}
			if (input.trim() || attachments.length) onSendMessage(input, attachments)
		} catch {
			setExportError('画板导出失败，草稿已保留，请重试。')
		} finally {
			sendingRef.current = false
			setIsExporting(false)
		}
	}

	// when the user submits the form, we send the message.
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		send()
	}

	// when the user presses enter, we send the message.
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Shift+Enter: allow default behavior (insert newline)
		if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
		// Enter: submit form
		e.preventDefault()
		send()
	}

	// when the user clicks the image upload button, we open a file input to allow them to select an
	// image from their device.
	const handleImageUpload = useCallback(() => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.multiple = true
		input.onchange = (e: Event) => {
			const files = Array.from((e.target as HTMLInputElement).files ?? []).filter((file) =>
				file.type.startsWith('image/')
			)
			if (files.length === 0) return

			// Open one whiteboard containing all selected images.
			dispatch({
				type: 'openWhiteboard',
				uploadedFiles: files,
				imageName:
					files.length === 1
						? 'annotated-image.png'
						: `annotated-board-${files.length}-images.png`,
			})
		}
		input.click()
	}, [dispatch])

	// when the user cancels the whiteboard modal, we close it.
	const handleCancelWhiteboard = useCallback(() => {
		dispatch({ type: 'closeWhiteboard' })
	}, [dispatch])


	return (
		<div className="chat-composer">
			
		<form onSubmit={handleSubmit} className="chat-input-form">
			{exportError && <p role="alert">{exportError}</p>}
			{/* if the user has opened the whiteboard modal, we show it. */}
			{openWhiteboard && (
				<WhiteboardModal
					ref={whiteboardRef}
					imageId={openWhiteboard.id}
					initialSnapshot={openWhiteboard.snapshot}
					uploadedFiles={openWhiteboard.uploadedFiles}
					imageName={openWhiteboard.imageName}
					onCancel={handleCancelWhiteboard}
				/>
			)}
			{/* if the user is dragging an image over the input area, we show a visual indicator
			hiding the normal input content. */}
			{isDragging && (
				<div className="drag-drop-indicator">
					<svg className="outline">
						{/* we use an svg to draw a dashed outline of the input area. svg allows us
						to control the dash length in a way that for example a normal <div> with a
						border would not. */}
						<rect />
					</svg>
					<UploadIcon />
				</div>
			)}

			{/* if the user has added images to the chat input, we show them above the input. */}
			{images.length > 0 && (
				<div className="input-images">
					{images.map((image) => (
						<ChatInputImage
							key={image.id}
							image={image}
							onRemove={() => dispatch({ type: 'removeImage', imageId: image.id })}
							onEdit={() => {
								dispatch({
									type: 'openWhiteboard',
									id: image.id,
									snapshot: image.snapshot,
									imageName: image.name,
								})
							}}
						/>
					))}
				</div>
			)}

			{/* the main input is a text area. we resize it automatically to fit its content. */}
			<div className="input-container">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => dispatch({ type: 'setInput', input: e.target.value })}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? '' : 'Type your message…'}
					className="chat-input"
					disabled={disabled}
					autoFocus={true}
					rows={1}
				/>
				{waitingForResponse && (
					<div className="input-spinner">
						<DefaultSpinner />
					</div>
				)}
			</div>

			{/* below the input we have several controls: */}
			<div className="chat-input-bottom">
				{/* a button to upload an image */}
				<button
					type="button"
					aria-label="Upload an image"
					title="Upload an image"
					className="icon-button"
					disabled={disabled}
					onClick={handleImageUpload}
				>
					<ImageIcon />
				</button>
				{/* a button to open the whiteboard modal */}
				<button
					type="button"
					aria-label="Draw a sketch"
					title="Draw a sketch"
					className="icon-button"
					disabled={disabled || !!openWhiteboard}
					onClick={() => dispatch({ type: 'openWhiteboard' })}
				>
					<WhiteboardIcon />
				</button>
				{/* a button to send the message */}
				<button
					type="submit"
					disabled={!canSend || disabled}
					className="icon-button"
					aria-label="Send message"
					title="Send message"
				>
					<SendIcon />
				</button>
			</div>

			
		</form>
		</div>
	)
}
