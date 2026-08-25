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
  title: 'Mindmate — Find People Who Think Like You | Co-founders, Collaborators & Intellectual Friends',
  description:
    'Your next co-founder, creative collaborator, intellectual friend, or hobby partner. Mindmate matches people through written ideas and AI text resonance—with zero photo bias or superficial swipe feeds.',
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
