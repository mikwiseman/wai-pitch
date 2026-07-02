import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — keep it external to the server bundle.
  serverExternalPackages: ['better-sqlite3'],
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
