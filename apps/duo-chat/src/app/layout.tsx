import '@chat/ui/styles.css'

export const metadata = { title: 'Duo Chat', description: 'A private conversation for two.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
