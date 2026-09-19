import '@chat/ui/styles.css'
import './duo.css'

export const metadata = { title: 'Duo Chat', description: 'Temporary realtime conversations.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
