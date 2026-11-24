"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { META_PIXEL_ID, trackPageView } from "@/lib/meta-pixel";

const COOKIE_CONSENT_KEY = "batata_top_cookie_consent_v1";

function readMarketingConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      return false;
    }
    const parsed = JSON.parse(stored) as { marketing?: unknown };
    return parsed?.marketing === true;
  } catch {
    return false;
  }
}

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

export function MetaPixel() {
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      const next = readMarketingConsent();
      setMarketingAllowed((prev) => {
        if (prev !== next && typeof window !== "undefined" && typeof window.fbq === "function") {
          window.fbq("consent", next ? "grant" : "revoke");
        }
        return prev === next ? prev : next;
      });
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

    const intervalId = window.setInterval(syncConsent, 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cookie-consent-updated", syncConsent);
      window.removeEventListener("focus", syncConsent);
      window.clearInterval(intervalId);
    };
  }, []);

  if (!META_PIXEL_ID || !marketingAllowed) {
    return null;
  }

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
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
