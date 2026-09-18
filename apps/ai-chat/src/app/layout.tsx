import '@chat/ui/styles.css'
import './styles.css'

export const metadata = {
	title: 'tldraw chat starter kit',
	description: 'An example of how to use tldraw to provide visual context in a chat app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async /></body>
		</html>
	)
}
