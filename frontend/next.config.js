/** @type {import('next').NextConfig} */
const path = require('path');

module.exports = {
  reactStrictMode: true,
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  webpack: (config, { isServer }) => {
    // En monorepo, resolver mapbox-gl desde root node_modules
    const modules = config.resolve.modules || [];
    config.resolve.modules = [
      path.resolve(__dirname, '../node_modules'),
      path.resolve(__dirname, 'node_modules'),
      ...modules,
    ];
    return config;
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  },
};
