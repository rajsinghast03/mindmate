import type { Metadata } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import './globals.css';
import { MindmateProvider } from '@/context/mindmate-context';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

/**
 * Absolute URLs are the whole game for link previews: without metadataBase, Next
 * emits a relative og:image and every scraper — Facebook, WhatsApp, LinkedIn,
 * Slack — fails to fetch it and falls back to a bare URL.
 *
 * app/opengraph-image.png is picked up by file convention, so the tag is
 * generated with a hashed absolute URL and the right width/height, rather than a
 * hand-written path that can drift from the file.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindmate.site';

const TITLE = 'Mindmate — Find People Who Think Like You';
const DESCRIPTION =
  'Your next co-founder, creative collaborator, intellectual friend, or hobby partner. Mindmate matches people through written ideas and AI text resonance — with zero photo bias or superficial swipe feeds.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · Mindmate',
  },
  description: DESCRIPTION,
  applicationName: 'Mindmate',
  keywords: [
    'find co-founder',
    'intellectual friends',
    'curiosity profile',
    'meet people through ideas',
    'no photos dating alternative',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Mindmate',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-paper-100 text-ink-900 flex flex-col min-h-dvh"
        suppressHydrationWarning
      >
        <MindmateProvider>
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </MindmateProvider>
      </body>
    </html>
  );
}
