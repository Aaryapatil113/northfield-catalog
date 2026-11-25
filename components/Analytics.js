'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { GA_ID, trackPageview } from '@/lib/analytics';

const GA_DEBUG = process.env.NEXT_PUBLIC_GA_DEBUG === 'true';

// Sets up gtag on the client, then sends a page_view on every route change
// (App Router navigation doesn't reload the page).
export default function Analytics() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!GA_ID) return;

    if (!initialized.current) {
      window.dataLayer = window.dataLayer || [];
      window.gtag =
        window.gtag ||
        function gtag() {
          window.dataLayer.push(arguments);
        };
      window.gtag('js', new Date());
      window.gtag('config', GA_ID, {
        send_page_view: false,
        ...(GA_DEBUG ? { debug_mode: true } : {}),
      });
      initialized.current = true;
    }

    if (pathname) trackPageview(pathname);
  }, [pathname]);

  return null;
}
