import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // Браузер ходить на /api того ж домену, Next проксує в Nest.
  // Одне походження: cookie сесії працює без CORS і SameSite=None.
  rewrites() {
    return Promise.resolve([{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }]);
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
