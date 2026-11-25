import './globals.css';
import Link from 'next/link';
import Script from 'next/script';
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google';
import Analytics from '@/components/Analytics';
import ChatWidget from '@/components/ChatWidget';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body' });

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata = {
  title: 'Northfield Goods',
  description: 'Gear for the trail, the campsite, and the camp kitchen.',
};

// No hand-written <head> here: an inline <head> script caused a hydration
// failure in Safari that dropped all styles (BUG-002). GA is set up in <Analytics/>.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="font-body min-h-screen" suppressHydrationWarning>
        {GA_ID && (
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        )}
        <Analytics />
        <header className="border-b border-pine/15 bg-birch">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-display text-xl font-bold text-pine">
              Northfield Goods
            </Link>
            <Link href="/admin" className="text-sm text-stone hover:text-pine">
              Manage catalog
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-5 pb-28">{children}</main>
        <ChatWidget />
      </body>
    </html>
  );
}
