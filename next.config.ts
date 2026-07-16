import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Uploaded media is supplied by the runtime data mount. Do not trace the
  // local library into the production server image.
  outputFileTracingExcludes: {
    '/api/uploads': ['./data/uploads/**/*'],
    '/api/uploads/[name]': ['./data/uploads/**/*'],
  },
  // better-sqlite3 is a native module — keep it external to the server bundle.
  serverExternalPackages: ['better-sqlite3'],
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
