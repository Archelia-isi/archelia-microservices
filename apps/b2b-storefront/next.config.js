/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@archelia/ui-storefront', 'styled-jsx'],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};
module.exports = nextConfig;
