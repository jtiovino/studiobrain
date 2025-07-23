import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StudioBrain',
  description: 'A creative assistant for musicians, powered by AI.',
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
