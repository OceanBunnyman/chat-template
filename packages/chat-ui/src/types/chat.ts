import type { TLEditorSnapshot } from 'tldraw'

export interface WhiteboardMetadata {
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

export type ImageClickTarget = WhiteboardMetadata | { uploadedFiles: File[] }

export type ChatMessagePart =
  | { type: 'text'; text: string }
  | { type: 'file'; url: string; filename?: string; mediaType: string; whiteboard?: WhiteboardMetadata }

export interface ChatMessageData {
  id: string
  isMine: boolean
  parts: ChatMessagePart[]
}
