import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	createShapeId,
	DefaultToolbar,
	DrawToolbarItem,
	Editor,
	EraserToolbarItem,
	notifyIfFileNotAllowed,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	TldrawUiMenuGroup,
	TldrawUiRow,
	TLEditorSnapshot,
	useEditor,
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

interface WhiteboardModalProps {
	initialSnapshot?: TLEditorSnapshot
	onCancel: () => void
	onAccept: (image: WhiteboardImage) => void
	imageId?: string
	uploadedFiles?: File[]
	imageName?: string
}

const options: Partial<TldrawOptions> = {
	// disable the ability to create new pages:
	maxPages: 1,
	// make sure the action shortcuts are always in the top-right menu area, not on the toolbar:
	actionShortcutsLocation: 'menu',
	// disable font pre-loading to avoid the ui popping in after the modal appears:
	maxFontsToLoadBeforeRender: 0,
}

const IMPORTED_IMAGE_HEIGHT = 320
const IMPORTED_IMAGE_GAP = 48

export function WhiteboardModal({
	initialSnapshot,
	onCancel,
	onAccept,
	imageId,
	uploadedFiles,
	imageName,
}: WhiteboardModalProps) {
	const [editor, setEditor] = useState<Editor | null>(null)

	const handleSave = useCallback(async () => {
		if (!editor) return

		// if there are no shapes, we don't want to save the image:
		const shapes = editor.getCurrentPageShapes()
		if (shapes.length === 0) {
			onCancel()
			return
		}

		// when the user clicks save, we convert the current whiteboard to an image:
		const image = await editor.toImageDataUrl(shapes, { format: 'png' })

		// we also take a snapshot of the editor state, so we can still edit
		// it if we open it up again later, and we pass the image data and the
		// snapshot to the parent component, so it can add it to the chat input:
		onAccept({
			id: imageId ?? crypto.randomUUID(),
			name: imageName ?? 'tldraw whiteboard.png',
			snapshot: editor.getSnapshot(),
			type: 'image/png',
			...image,
		})
	}, [onCancel, onAccept, imageId, imageName, editor])

	// components are used to override parts of the tldraw ui. they shouldn't change often, so it's
	// important that we memoize them or define them outside the tldraw component.
	const components = useMemo(
		(): TLComponents => ({
			Toolbar: () => (
				<DefaultToolbar>
					<TldrawUiMenuGroup id="annotation-tools">
						<DrawToolbarItem />
						<EraserToolbarItem />
					</TldrawUiMenuGroup>
				</DefaultToolbar>
			),
			MainMenu: null,
			StylePanel: null,
			ImageToolbar: null,
			// The "SharePanel" is in the top-right of the editor. Here we want it to show our save
			// and cancel buttons:
			SharePanel: () => (
				<TldrawUiRow className="whiteboard-actions">
					<TldrawUiButton type="normal" onClick={onCancel}>
						Cancel
					</TldrawUiButton>
					<TldrawUiButton type="primary" onClick={handleSave}>
						{imageId ? 'Save' : 'Add'}
					</TldrawUiButton>
				</TldrawUiRow>
			),
		}),
		[onCancel, handleSave, imageId]
	)

	// when the user clicks outside the modal, we close it. we add their image to the chat input in
	// case they wanted it - they can easily delete it if not.
	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			handleSave()
		}
	}

	return (
		<div className="modal-popup" onClick={handleOverlayClick}>
			<Tldraw
				components={components}
				forceMobile
				options={options}
				snapshot={initialSnapshot}
				// persistenceKey="hide-ui-example" hideUi
				onMount={(editor) => {
					setEditor(editor)

					editor.user.updateUserPreferences({ colorScheme: 'light' })
					editor.selectNone()
					editor.zoomToSelection()
				}}
			>
				{/* if the user uploaded a file, we insert it in a special component. this means we
				can use hooks that depend on tldraw's ui to do things like show a toast if
				something goes wrong. */}
				<InsideOfTldrawContext uploadedFiles={uploadedFiles} />
			</Tldraw>
		</div>
	)
}

function InsideOfTldrawContext({ uploadedFiles }: { uploadedFiles?: File[] }) {
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

		void (async () => {
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

			const imageWidths = assets.map(
				(asset) => (asset.props.w / Math.max(asset.props.h, 1)) * IMPORTED_IMAGE_HEIGHT
			)
			const totalWidth =
				imageWidths.reduce((sum, width) => sum + width, 0) +
				IMPORTED_IMAGE_GAP * Math.max(assets.length - 1, 0)
			const viewportCenter = editor.getViewportPageBounds().center
			let nextX = viewportCenter.x - totalWidth / 2
			const y = viewportCenter.y - IMPORTED_IMAGE_HEIGHT / 2

			const shapeIds = assets.map(() => createShapeId())
			const shapes = assets.map((asset, index) => {
				const width = imageWidths[index]
				const shape = {
					id: shapeIds[index],
					type: 'image' as const,
					x: nextX,
					y,
					props: {
						assetId: asset.id,
						w: width,
						h: IMPORTED_IMAGE_HEIGHT,
					},
				}

				nextX += width + IMPORTED_IMAGE_GAP
				return shape
			})

			editor
				.createAssets(assets)
				.createShapes(shapes)
				.setSelectedShapes(shapeIds)
				.zoomToSelection()
				.setCurrentTool('select')
		})().catch((error) => {
			console.error('Failed to add images to whiteboard', error)
		})
	}, [uploadedFiles, toasts, msg, editor])

	return null
}
