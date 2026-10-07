import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Interactive Digital Book',
  description: 'Aviation radio communication and mapping platform',
  generator: 'v0.app',
  openGraph: {
    title: 'Interactive Digital Book',
    description: 'Aviation radio communication and mapping platform',
    url: 'https://interactive-digital-book.netlify.app',
    siteName: 'Interactive Digital Book',
    images: [
      {
        url: 'https://interactive-digital-book.netlify.app/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4eddf',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}

