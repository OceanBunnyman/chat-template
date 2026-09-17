import { BaseBoxShapeUtil, SVGContainer, T, TLShape } from 'tldraw'

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		emoji: { w: number; h: number; emoji: string }
	}
}

export type EmojiShape = TLShape<'emoji'>
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

export class EmojiShapeUtil extends BaseBoxShapeUtil<EmojiShape> {
	static override type = 'emoji' as const
	static override props = { w: T.positiveNumber, h: T.positiveNumber, emoji: T.string }

	getDefaultProps(): EmojiShape['props'] {
		return { w: 64, h: 64, emoji: '😀' }
	}

	override isAspectRatioLocked() { return true }
	override canEdit() { return false }

	component(shape: EmojiShape) {
		return <SVGContainer>
			<svg width={shape.props.w} height={shape.props.h} viewBox="0 0 100 100">
				<text x="50" y="54" textAnchor="middle" dominantBaseline="central"
					fontFamily={EMOJI_FONT} fontSize="80">{shape.props.emoji}</text>
			</svg>
		</SVGContainer>
	}

	getIndicatorPath(shape: EmojiShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override toSvg(shape: EmojiShape) {
		// Embed the system glyph as pixels so PNG export retains color emoji reliably.
		const canvas = document.createElement('canvas')
		canvas.width = canvas.height = 512
		const context = canvas.getContext('2d')
		if (!context) throw new Error('Unable to export emoji')
		context.font = `${512 * 0.8}px ${EMOJI_FONT}`
		context.textAlign = 'center'
		context.textBaseline = 'middle'
		context.fillText(shape.props.emoji, 256, 512 * 0.54)
		return <image href={canvas.toDataURL()} width={shape.props.w} height={shape.props.h} />
	}
}
