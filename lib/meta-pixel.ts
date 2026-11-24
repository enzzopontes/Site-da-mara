export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "2434353287337404";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function fbqTrack(
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  if (options) {
    window.fbq("track", event, params ?? {}, options);
  } else if (params) {
    window.fbq("track", event, params);
  } else {
    window.fbq("track", event);
  }
}

export function trackPageView(): void {
  fbqTrack("PageView");
}

export function trackViewContent(params: {
  id: string;
  name: string;
  category?: string;
  value: number;
}): void {
  fbqTrack("ViewContent", {
    content_ids: [params.id],
    content_name: params.name,
    content_category: params.category,
    content_type: "product",
    value: Number(params.value) || 0,
    currency: "BRL",
  });
}

export function trackAddToCart(params: {
  id: string;
  name: string;
  category?: string;
  value: number;
  quantity?: number;
}): void {
  fbqTrack("AddToCart", {
    content_ids: [params.id],
    content_name: params.name,
    content_category: params.category,
    content_type: "product",
    value: Number(params.value) || 0,
    num_items: params.quantity ?? 1,
    currency: "BRL",
  });
}

export function trackInitiateCheckout(params: {
  contentIds: string[];
  numItems: number;
  value: number;
}): void {
  fbqTrack("InitiateCheckout", {
    content_ids: params.contentIds,
    content_type: "product",
    num_items: params.numItems,
    value: Number(params.value) || 0,
    currency: "BRL",
  });
}

export function trackPurchase(params: {
  orderId: string;
  value: number;
  contentIds: string[];
  numItems: number;
}): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  const storageKey = `meta_pixel_purchase_${params.orderId}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Ignore sessionStorage errors (e.g. private browsing restrictions)
  }

  fbqTrack(
    "Purchase",
    {
      content_ids: params.contentIds,
      content_type: "product",
      num_items: params.numItems,
      value: Number(params.value) || 0,
      currency: "BRL",
      order_id: params.orderId,
    },
    { eventID: params.orderId }
  );
}
