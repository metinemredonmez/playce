import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // pnpm çalışma alanı: node_modules kökte (hoisted)
  turbopack: { root: path.join(__dirname, '../..') },
  poweredByHeader: false,
};

export default nextConfig;
