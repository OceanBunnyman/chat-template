import type { WhiteboardImage } from '@chat/ui/types'
import type { PngAttachment } from './messages'

// Leave room for text, metadata and the Broadcast envelope under the Free tier limit.
export const PNG_BUDGET = 180_000
export async function preparePngAttachments(images: WhiteboardImage[]): Promise<PngAttachment[]> {
  if (images.length > 4) throw new Error('每条消息最多发送 4 张图片。')
  const budget = Math.floor(PNG_BUDGET / Math.max(images.length, 1))
  return Promise.all(images.map(async image => {
    let url = image.url
    if (!url.startsWith('data:image/png;base64,')) throw new Error('画板导出格式必须为 PNG。')
    if (url.length > budget) {
      const bitmap = new Image()
      bitmap.src = url
      await bitmap.decode()
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('浏览器无法处理画板图片。')
      let scale = Math.min(1, 1280 / Math.max(bitmap.naturalWidth, bitmap.naturalHeight))
      for (let attempt = 0; attempt < 18; attempt++) {
        canvas.width = Math.max(1, Math.round(bitmap.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(bitmap.naturalHeight * scale))
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        url = canvas.toDataURL('image/png')
        if (url.length <= budget) break
        scale *= 0.75
      }
      if (url.length > budget) throw new Error('图片过大，请减少画板内容后重试。')
    }
    return { filename: image.name.slice(0, 150), mediaType: 'image/png', url }
  }))
}
