export type SameOriginCheckRequest = {
  headers: { get(name: string): string | null }
  nextUrl: { host: string }
}

export function assertSameOriginForCookieAuth(request: SameOriginCheckRequest): boolean {
  if (
    request.headers.get("authorization")?.toLowerCase().startsWith("bearer ") &&
    !request.headers.get("cookie")
  ) {
    return true
  }

  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase()
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return false
  }

  const originOrReferer = request.headers.get("origin") || request.headers.get("referer")
  if (originOrReferer) {
    let parsed: URL
    try {
      parsed = new URL(originOrReferer)
    } catch {
      return false
    }
    if (parsed.host !== request.nextUrl.host) {
      return false
    }
  }

  return true
}
