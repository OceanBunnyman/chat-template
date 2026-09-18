import { Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
	createShapeId,
	uniqueId,
	DefaultToolbar,
	DrawToolbarItem,
	Editor,
	EraserToolbarItem,
	notifyIfFileNotAllowed,
	SelectToolbarItem,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiMenuGroup,
	TldrawUiRow,
	TLEditorSnapshot,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'

import type { WhiteboardImage } from '../types/chat'

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

const options: Partial<TldrawOptions> = {
	// disable the ability to create new pages:
	maxPages: 1,
	// make sure the action shortcuts are always in the top-right menu area, not on the toolbar:
	actionShortcutsLocation: 'menu',
	// disable font pre-loading to avoid the ui popping in after the modal appears:
	maxFontsToLoadBeforeRender: 0,
}

const IMPORTED_IMAGE_HEIGHT = 320
const IMPORTED_IMAGE_WIDTH = 320
const IMPORTED_IMAGE_GAP = 48
const MOBILE_LAYOUT_MAX_WIDTH = 768

export function WhiteboardModal({
	initialSnapshot,
	onCancel,
	ref,
	imageId,
	uploadedFiles,
	imageName,
}: WhiteboardModalProps) {
	const [editor, setEditor] = useState<Editor | null>(null)

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
		const image = await editor.toImageDataUrl(shapes, { format: 'png' })

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
		<div className="modal-popup">
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
				<InsideOfTldrawContext uploadedFiles={uploadedFiles} pendingImport={pendingImport} />
			</Tldraw>
		</div>
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

			const useVerticalLayout =
				editor.getViewportScreenBounds().w <= MOBILE_LAYOUT_MAX_WIDTH
			const imageSizes = assets.map((asset) =>
				useVerticalLayout
					? {
							w: IMPORTED_IMAGE_WIDTH,
							h: (asset.props.h / Math.max(asset.props.w, 1)) * IMPORTED_IMAGE_WIDTH,
						}
					: {
							w: (asset.props.w / Math.max(asset.props.h, 1)) * IMPORTED_IMAGE_HEIGHT,
							h: IMPORTED_IMAGE_HEIGHT,
						}
			)
			const totalWidth = useVerticalLayout
				? IMPORTED_IMAGE_WIDTH
				: imageSizes.reduce((sum, size) => sum + size.w, 0) +
					IMPORTED_IMAGE_GAP * Math.max(assets.length - 1, 0)
			const totalHeight = useVerticalLayout
				? imageSizes.reduce((sum, size) => sum + size.h, 0) +
					IMPORTED_IMAGE_GAP * Math.max(assets.length - 1, 0)
				: IMPORTED_IMAGE_HEIGHT
			const viewportCenter = editor.getViewportPageBounds().center
			let nextX = viewportCenter.x - totalWidth / 2
			let nextY = viewportCenter.y - totalHeight / 2

			const shapeIds = assets.map(() => createShapeId())
			const shapes = assets.map((asset, index) => {
				const size = imageSizes[index]
				const shape = {
					id: shapeIds[index],
					type: 'image' as const,
					x: nextX,
					y: nextY,
					props: {
						assetId: asset.id,
						w: size.w,
						h: size.h,
					},
				}

				if (useVerticalLayout) {
					nextY += size.h + IMPORTED_IMAGE_GAP
				} else {
					nextX += size.w + IMPORTED_IMAGE_GAP
				}
				return shape
			})

			editor
				.createAssets(assets)
				.createShapes(shapes)
				.setSelectedShapes(shapeIds)
				.zoomToSelection()
				.setCurrentTool('select')
		})()
		pendingImport.current = task
		void task.catch((error) => {
			console.error('Failed to add images to whiteboard', error)
		})
	}, [uploadedFiles, toasts, msg, editor, pendingImport])

	return null
}
