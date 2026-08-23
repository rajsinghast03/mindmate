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

export const metadata: Metadata = {
  title: 'Mindmate — Matched by Mind, Never by Looks | AI-Driven Connection',
  description:
    'Stop getting judged by photos. Mindmate matches people based on their written thoughts, curiosities, and ideas using AI—with zero appearance bias, photos, or shallow swipe feeds.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="bg-paper-100 text-ink-900 flex flex-col min-h-screen">
        <MindmateProvider>
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </MindmateProvider>
      </body>
    </html>
  );
}
