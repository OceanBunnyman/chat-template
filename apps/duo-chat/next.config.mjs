/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'node:url'

const nextConfig = {
	transpilePackages: ['@chat/ui'],
	turbopack: { root: fileURLToPath(new URL('../..', import.meta.url)) },
	outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
	allowedDevOrigins: ['192.168.50.195', '130.229.161.58'],
	serverExternalPackages: ['@tldraw/tldraw'],
}

export default nextConfig
