"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  COOKIE_CONSENT_KEY,
  hasMarketingConsent,
  META_PIXEL_ID,
  trackPageView,
} from "@/lib/meta-pixel";

function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (lastUrlRef.current === null) {
      lastUrlRef.current = currentUrl;
      return;
    }
    if (lastUrlRef.current === currentUrl) {
      return;
    }
    lastUrlRef.current = currentUrl;
    trackPageView();
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel({ nonce }: { nonce?: string }) {
  const [marketingAllowed, setMarketingAllowed] = useState(true);
  const prevAllowedRef = useRef(true);

  useEffect(() => {
    const syncConsent = () => {
      const next = hasMarketingConsent();
      const prev = prevAllowedRef.current;
      prevAllowedRef.current = next;
      if (prev !== next && typeof window.fbq === "function") {
        window.fbq("consent", next ? "grant" : "revoke");
      }
      setMarketingAllowed(next);
    };

    syncConsent();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === COOKIE_CONSENT_KEY) {
        syncConsent();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("cookie-consent-updated", syncConsent);
    window.addEventListener("focus", syncConsent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cookie-consent-updated", syncConsent);
      window.removeEventListener("focus", syncConsent);
    };
  }, []);

  if (!META_PIXEL_ID || !marketingAllowed) {
    return null;
  }

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive" nonce={nonce}>
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('consent', 'grant');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <MetaPixelRouteTracker />
      </Suspense>
    </>
  );
}
