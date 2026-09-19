import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
	if (!apiKey) {
		return Response.json({ error: '服务器未配置 GOOGLE_GENERATIVE_AI_API_KEY，请在项目根目录的 .env.local 中设置并重启开发服务器。' }, { status: 500 })
	}

	const contentType = req.headers.get('content-type')
	if (!contentType) {
		return Response.json({ error: 'content-type is not set' }, { status: 400 })
	}

	const displayName = req.headers.get('x-file-name')
	if (!displayName) {
		return Response.json({ error: 'x-file-name is not set' }, { status: 400 })
	}

	const ai = new GoogleGenAI({ apiKey })

	try {
		const file = await ai.files.upload({
			file: await req.blob(),
			config: { mimeType: contentType, displayName },
		})

		return Response.json({ uploadedUrl: file.uri, expiresAt: file.expirationTime })
	} catch {
		return Response.json({ error: '图片上传失败，请检查 Google API 配置和网络后重试。' }, { status: 502 })
	}
}
