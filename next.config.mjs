import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep the heavy wallet code out of the critical path so the page paints fast.
    optimizePackageImports: ['wagmi', 'viem', 'lucide-react'],
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.alias['@react-native-async-storage/async-storage'] = path.join(projectRoot, 'lib', 'async-storage-shim.js');
    return config;
  },
};

export default nextConfig;
