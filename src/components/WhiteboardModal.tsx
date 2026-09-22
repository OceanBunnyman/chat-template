import { Ref, useCallback, useEffect, useLayoutEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { EmojiPicker } from './emoji/EmojiPicker'
import { EmojiShapeUtil } from './emoji/EmojiShapeUtil'
import {
	Box,
	createShapeId,
	uniqueId,
	DefaultToolbar,
	DefaultQuickActions,
	DrawToolbarItem,
	Editor,
	EraserToolbarItem,
	notifyIfFileNotAllowed,
	SelectToolbarItem,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiMenuGroup,
	TldrawUiMenuActionItem,
	TldrawUiRow,
	TLEditorSnapshot,
	useEditor,
	useCanUndo,
	useToasts,
	useTranslation,
} from 'tldraw'

export interface TldrawProviderMetadata {
	snapshot: TLEditorSnapshot
	imageName: string
}

export interface WhiteboardImage {
	id: string
	name: string
	url: string
	snapshot: TLEditorSnapshot
	type: string
	width: number
	height: number
}

export interface WhiteboardHandle {
	exportImage: () => Promise<WhiteboardImage | null>
}

interface WhiteboardModalProps {
	ref?: Ref<WhiteboardHandle>
	initialSnapshot?: TLEditorSnapshot
	onCancel: () => void
	imageId?: string
	uploadedFiles?: File[]
	imageName?: string
}

const uiOverrides: TLUiOverrides = {
	translations: {
		'zh-cn': { 'comments.link-copied': '链接已复制' },
	},
}

const options: Partial<TldrawOptions> = {
	// disable the ability to create new pages:
	maxPages: 1,
	edgeScrollSpeed: 0,
	// make sure the action shortcuts are always in the top-right menu area, not on the toolbar:
	actionShortcutsLocation: 'menu',
	// disable font pre-loading to avoid the ui popping in after the modal appears:
	maxFontsToLoadBeforeRender: 0,
}

const shapeUtils = [EmojiShapeUtil]

// Persist the document boundary in page metadata, so it travels with the snapshot.
function readBoardBounds(editor: Editor): Box | null {
	const value = editor.getCurrentPage().meta.fixedBoardBounds
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null
	const { x, y, w, h } = value
	if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
	if (Number(w) <= 0 || Number(h) <= 0) return null
	return new Box(Number(x), Number(y), Number(w), Number(h))
}

export function WhiteboardModal({
	initialSnapshot,
	onCancel,
	ref,
	imageId,
	uploadedFiles,
	imageName,
}: WhiteboardModalProps) {
	const [editor, setEditor] = useState<Editor | null>(null)

	const containerRef = useRef<HTMLDivElement>(null)
	const [boardBounds, setBoardBounds] = useState<Box | null>(null)
	const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)

	useLayoutEffect(() => {
		const container = containerRef.current
		if (!container) return
		// Use the layout viewport: opening the software keyboard must not resize the document.
		const measure = () => {
			const width = container.clientWidth
			const height = Math.max(180, Math.min(600, window.innerHeight - 240))
			const scale = boardBounds ? Math.min(width / boardBounds.w, height / boardBounds.h) : 1
			setDisplaySize({
				width: boardBounds ? boardBounds.w * scale : width,
				height: boardBounds ? boardBounds.h * scale : height,
			})
		}
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(container)
		window.addEventListener('resize', measure)
		return () => {
			observer.disconnect()
			window.removeEventListener('resize', measure)
		}
	}, [boardBounds])

	useLayoutEffect(() => {
		if (!editor || !boardBounds || !displaySize) return
		editor.updateViewportScreenBounds(editor.getContainer())
		editor.setCamera({ x: -boardBounds.x, y: -boardBounds.y, z: displaySize.width / boardBounds.w }, { force: true })
	}, [editor, boardBounds, displaySize])

	const pendingImport = useRef<Promise<void> | null>(null)
	const exportImage = useCallback(async () => {
		if (!editor) throw new Error('画板正在加载，请稍后再发送。')
		await pendingImport.current

		// if there are no shapes, we don't want to save the image:
		const shapes = editor.getCurrentPageShapes()
		if (shapes.length === 0) {
			return null
		}

		// Export the latest board when the chat composer sends the message.
		const bounds = readBoardBounds(editor)
		if (!bounds) throw new Error('画板尺寸尚未初始化。')
		const image = await editor.toImageDataUrl(shapes, {
			format: 'png', bounds, padding: 0, background: true, scale: 1, pixelRatio: 1,
		})

		// we also take a snapshot of the editor state, so we can still edit
		// it if we open it up again later, and we pass the image data and the
		// snapshot to the parent component, so it can add it to the chat input:
		return {
			id: imageId ?? uniqueId(),
			name: imageName ?? 'tldraw whiteboard.png',
			snapshot: editor.getSnapshot(),
			type: 'image/png',
			...image,
		}
	}, [imageId, imageName, editor])

	useImperativeHandle(ref, () => ({ exportImage }), [exportImage])

	// components are used to override parts of the tldraw ui. they shouldn't change often, so it's
	// important that we memoize them or define them outside the tldraw component.
	const components = useMemo(
		(): TLComponents => ({
			Toolbar: () => (
				<DefaultToolbar>
					<TldrawUiMenuGroup id="annotation-tools">
						<SelectToolbarItem />
						<DrawToolbarItem />
						<EraserToolbarItem />
					</TldrawUiMenuGroup>
				</DefaultToolbar>
			),
			MainMenu: null,
			QuickActions: UndoOnlyActions,
			ActionsMenu: null,
			NavigationPanel: null,
			Minimap: null,
			StylePanel: null,
			ImageToolbar: null,
			// The board is attached automatically; this action discards the open draft.
			SharePanel: () => (
				<TldrawUiRow className="whiteboard-actions">
					<TldrawUiButton
						type="icon"
						onClick={onCancel}
						aria-label="Remove board"
						tooltip="Remove board"
					>
						<TldrawUiButtonIcon icon="cross-2" />
					</TldrawUiButton>
				</TldrawUiRow>
			),
		}),
		[onCancel]
	)

	return (
		<>
		<div className="fixed-board-container" ref={containerRef}>
			{displaySize && <div className="modal-popup" style={displaySize}>
			<Tldraw
				licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
				shapeUtils={shapeUtils}
				components={components}
				overrides={uiOverrides}
				forceMobile
				options={options}
				snapshot={initialSnapshot}
				// persistenceKey="hide-ui-example" hideUi
				onMount={(editor) => {
					setEditor(editor)

					editor.user.updateUserPreferences({ colorScheme: 'light' })
					editor.selectNone()
					const saved = readBoardBounds(editor)
					// Legacy snapshots keep all existing content inside their initial boundary.
					const existing = editor.getCurrentPageShapes().map((shape) => editor.getShapePageBounds(shape)).filter((box): box is Box => !!box)
					const bounds = saved ?? (existing.length ? Box.Common(existing).expandBy(24) : new Box(0, 0, Math.round(displaySize.width), Math.round(displaySize.height)))
					editor.updatePage({ id: editor.getCurrentPageId(), meta: { ...editor.getCurrentPage().meta, fixedBoardBounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h } } })
					editor.setCameraOptions({ isLocked: true, wheelBehavior: 'none' })
					setBoardBounds(bounds)
				}}
			>
				{/* if the user uploaded a file, we insert it in a special component. this means we
				can use hooks that depend on tldraw's ui to do things like show a toast if
				something goes wrong. */}
				{boardBounds && <InsideOfTldrawContext uploadedFiles={uploadedFiles} pendingImport={pendingImport} />}
			</Tldraw>
			</div>}
		</div>
		{editor && <EmojiPicker editor={editor} />}
		</>
	)
}

function UndoOnlyActions() {
	const canUndo = useCanUndo()
	return (
		<DefaultQuickActions>
			<TldrawUiMenuActionItem actionId="undo" disabled={!canUndo} />
		</DefaultQuickActions>
	)
}

function InsideOfTldrawContext({ uploadedFiles, pendingImport }: { uploadedFiles?: File[]; pendingImport: { current: Promise<void> | null } }) {
	const toasts = useToasts()
	const msg = useTranslation()
	const editor = useEditor()
	const importedFiles = useRef(new WeakSet<File>())

	useEffect(() => {
		if (!uploadedFiles?.length) return

		// Effects may run more than once in development. Track imports without mutating File objects.
		const newFiles = uploadedFiles.filter((file) => !importedFiles.current.has(file))
		if (newFiles.length === 0) return
		newFiles.forEach((file) => importedFiles.current.add(file))

		const task = (async () => {
			const assets = (
				await Promise.all(
					newFiles.map(async (file) => {
						if (!notifyIfFileNotAllowed(editor, file, { toasts, msg })) return null

						const asset = await editor.getAssetForExternalContent({
							type: 'file',
							file,
						})

						return asset?.type === 'image' ? asset : null
					})
				)).filter((asset) => asset !== null)

			if (assets.length === 0 || editor.isDisposed) return

			const bounds = readBoardBounds(editor)
			if (!bounds) return
			const columns = Math.max(1, Math.ceil(Math.sqrt(assets.length * bounds.w / bounds.h)))
			const rows = Math.ceil(assets.length / columns)
			const cellWidth = bounds.w / columns
			const cellHeight = bounds.h / rows
			const shapeIds = assets.map(() => createShapeId())
			const shapes = assets.map((asset, index) => {
				const scale = Math.min(cellWidth * 0.85 / Math.max(asset.props.w, 1), cellHeight * 0.85 / Math.max(asset.props.h, 1))
				const w = asset.props.w * scale
				const h = asset.props.h * scale
				return {
					id: shapeIds[index], type: 'image' as const,
					x: bounds.x + (index % columns) * cellWidth + (cellWidth - w) / 2,
					y: bounds.y + Math.floor(index / columns) * cellHeight + (cellHeight - h) / 2,
					props: { assetId: asset.id, w, h },
				}
			})

			editor
				.createAssets(assets)
				.createShapes(shapes)
				.setSelectedShapes(shapeIds)
				.setCurrentTool('select')
		})()
		pendingImport.current = task
		void task.catch((error) => {
			console.error('Failed to add images to whiteboard', error)
		})
	}, [uploadedFiles, toasts, msg, editor, pendingImport])

	return null
}
