import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createShapeId, Editor } from 'tldraw'

const EMOJIS = ['😀', '😂', '❤️', '👍', '👎', '🔥', '🎉', '👀', '✅', '❌', '❓', '💡']

export function EmojiPicker({ editor }: { editor: Editor }) {
	const container = useRef<HTMLDivElement>(null)
	const moreButton = useRef<HTMLButtonElement>(null)
	const panelId = useId()
	const [visibleCount, setVisibleCount] = useState(0)
	const [open, setOpen] = useState(false)

	useLayoutEffect(() => {
		const element = container.current
		if (!element) return
		const measure = () => {
			const slots = Math.max(1, Math.floor((element.clientWidth - 16 + 4) / 48))
			setVisibleCount(slots >= EMOJIS.length ? EMOJIS.length : slots - 1)
		}
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		if (!open) return
		const dismiss = (event: PointerEvent) => {
			if (!container.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener('pointerdown', dismiss)
		return () => document.removeEventListener('pointerdown', dismiss)
	}, [open])

	useEffect(() => { setOpen(false) }, [visibleCount])

	const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
	const suppressClick = useRef(false)

	function addEmoji(emoji: string, point = editor.getViewportPageBounds().center) {
		const id = createShapeId()
		const size = 64 / editor.getZoomLevel()
		editor.markHistoryStoppingPoint('add emoji')
		editor.createShape({ id, type: 'emoji', x: point.x - size / 2, y: point.y - size / 2,
			props: { emoji, w: size, h: size } })
		editor.setCurrentTool('select').select(id)
	}

	function renderEmoji(emoji: string) {
		return <button key={emoji} type="button" aria-label={`Add ${emoji}`}
					title={`Add ${emoji}`} style={{ width: 44, height: 44, fontSize: 28, border: 0,
						borderRadius: 6, background: 'transparent', cursor: 'grab', touchAction: 'none' }}
					onPointerDown={(event) => {
						if (event.button !== 0) return
						event.preventDefault()
						event.stopPropagation()
						suppressClick.current = false
						drag.current = { x: event.clientX, y: event.clientY, moved: false }
						event.currentTarget.setPointerCapture(event.pointerId)
					}}
					onPointerMove={(event) => {
						event.stopPropagation()
						if (drag.current && Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 6) {
							drag.current.moved = true
						}
					}}
					onPointerUp={(event) => {
						event.stopPropagation()
						const moved = drag.current?.moved
						drag.current = null
						suppressClick.current = !!moved
						if (!moved) return
						const target = document.elementFromPoint(event.clientX, event.clientY)
						// Only accept drops inside this editor’s canvas.
						const bounds = editor.getViewportScreenBounds()
						const overCanvas = target?.closest('.tl-canvas')
						if (overCanvas && editor.getContainer().contains(target) &&
							event.clientX >= bounds.x && event.clientX <= bounds.x + bounds.w &&
							event.clientY >= bounds.y && event.clientY <= bounds.y + bounds.h) {
							addEmoji(emoji, editor.screenToPage({ x: event.clientX, y: event.clientY }))
						}
					}}
					onPointerCancel={() => { drag.current = null; suppressClick.current = true }}
					onClick={(event) => {
						if (!suppressClick.current || event.detail === 0) addEmoji(emoji)
						suppressClick.current = false
					}}>{emoji}</button>
	}

	return <div ref={container} role="group" aria-label="Emoji picker" className="emoji-picker"
		onPointerDown={(event) => event.stopPropagation()}
		onKeyDown={(event) => {
			if (event.key === 'Escape' && open) {
				event.stopPropagation()
				setOpen(false)
				moreButton.current?.focus()
			}
		}}>
		{EMOJIS.slice(0, visibleCount).map(renderEmoji)}
		{visibleCount < EMOJIS.length && <>
			<button ref={moreButton} type="button" className="emoji-more" aria-label="More emoji"
				aria-expanded={open} aria-controls={panelId} title="More emoji"
				onClick={() => setOpen(value => !value)}>…</button>
			{open && <div id={panelId} role="group" aria-label="More emoji" className="emoji-overflow">
				{EMOJIS.slice(visibleCount).map(renderEmoji)}
			</div>}
		</>}
	</div>
}
