/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@archelia/ui-storefront', 'styled-jsx'],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};
module.exports = nextConfig;
