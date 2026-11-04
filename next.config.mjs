import { getSecurityHeadersList } from './lib/security-transport.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: getSecurityHeadersList(),
      },
    ]
  },
}

export default nextConfig
