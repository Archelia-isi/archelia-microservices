/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  transpilePackages: ['@archelia/ui-storefront', 'styled-jsx'],
  webpack: (config) => {
    config.resolve.alias['react'] = path.resolve(__dirname, '../../node_modules/react');
    config.resolve.alias['react-dom'] = path.resolve(__dirname, '../../node_modules/react-dom');
    return config;
  }
};
module.exports = nextConfig;
