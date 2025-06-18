import './globals.css'

export const metadata: Metadata = {
  title: 'Mind Access Control',
  description: 'Access control system with facial recognition',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
